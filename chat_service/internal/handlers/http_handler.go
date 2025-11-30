package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"

	"github.com/nithyananda-tv/chat-service/internal/config"
	"github.com/nithyananda-tv/chat-service/internal/database"
	"github.com/nithyananda-tv/chat-service/internal/middleware"
	"github.com/nithyananda-tv/chat-service/internal/pubsub"
	"go.uber.org/zap"
)

type HTTPHandler struct {
	db          *database.Pool
	pgPubSub    *pubsub.PostgresClient
	rateLimiter *middleware.RateLimiter
	cfg         *config.Config
	log         *zap.Logger
}

type SendMessageRequest struct {
    StreamID string `json:"streamId"`
    Content  string `json:"content"`
    Type     string `json:"type"`
}

type SendMessageResponse struct {
    Success bool             `json:"success"`
    Message *IncomingMessage `json:"message,omitempty"`
    Error   string           `json:"error,omitempty"`
}

type Author struct {
    ID          int    `json:"id"`
    Email       string `json:"email"`
    FirstName   string `json:"firstName"`
    LastName    string `json:"lastName"`
    DisplayName string `json:"displayName"`
}

type IncomingMessage struct {
    Author    Author `json:"author"`
    StreamID  string `json:"streamId"`
    Content   string `json:"content"`
    Type      string `json:"type"` // user, system, moderator
    Timestamp string `json:"timestamp"`
}

func NewHTTPHandler(db *database.Pool, pgPubSub *pubsub.PostgresClient, cfg *config.Config, log *zap.Logger) *HTTPHandler {
	rateLimiter := middleware.NewRateLimiter(
		cfg.RateLimit.MessagesPerWindow,
		cfg.RateLimit.WindowSeconds,
		log,
	)

	return &HTTPHandler{
		db:          db,
		pgPubSub:    pgPubSub,
		rateLimiter: rateLimiter,
		cfg:         cfg,
		log:         log,
	}
}

// HandleSSEStream handles Server-Sent Events for real-time chat messages
// GET /chat/stream?streamId={streamId}
func (h *HTTPHandler) HandleSSEStream(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get streamId from query
	streamID := r.URL.Query().Get("streamId")
	if streamID == "" {
		h.sendSSEError(w, "streamId query parameter is required")
		return
	}

	ctx := r.Context()
	channelName := fmt.Sprintf("chat_messages_%s", streamID)

	h.log.Info("SSE connection established", zap.String("streamId", streamID))

	// Send connection event
	h.sendSSEEvent(w, "connected", map[string]interface{}{
		"message":  "Connected to chat stream",
		"streamId": streamID,
	})

	// Load and send message history
    history, err := h.db.GetRecentMessages(ctx, streamID, h.cfg.Chat.HistoryMaxLength)
    if err != nil {
        h.log.Error("Failed to load message history", zap.Error(err))
    } else {
        // Transform DB rows to API messages with Author object
        msgs := make([]IncomingMessage, 0, len(history))
        for _, m := range history {
            fullName := strings.TrimSpace(strings.TrimSpace(m.FirstName) + " " + strings.TrimSpace(m.LastName))
            if fullName == "" {
                // fallback to email local-part
                parts := strings.SplitN(m.Email, "@", 2)
                fullName = parts[0]
            }
            msgs = append(msgs, IncomingMessage{
                Author: Author{
                    ID:          m.ECitizenID,
                    Email:       m.Email,
                    FirstName:   m.FirstName,
                    LastName:    m.LastName,
                    DisplayName: fullName,
                },
                StreamID:  m.StreamID,
                Content:   m.Content,
                Type:      m.Type,
                Timestamp: m.CreatedAt.Format(time.RFC3339),
            })
        }
        h.sendSSEEvent(w, "history", map[string]interface{}{
            "messages": msgs,
        })
    }

	// Create a channel for PostgreSQL notifications
	messageChan := make(chan string, 10)
	done := make(chan struct{})

	// Subscribe to PostgreSQL channel
	go func() {
		defer close(messageChan)

		err := h.pgPubSub.Subscribe(ctx, channelName, func(ctx context.Context, channel string, payload string) error {
			select {
			case messageChan <- payload:
				return nil
			case <-done:
				return fmt.Errorf("connection closed")
			}
		})

		if err != nil && err != context.Canceled {
			h.log.Error("PostgreSQL subscription error", zap.Error(err))
		}
	}()

	// Send keepalive and messages
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	flusher, ok := w.(http.Flusher)
	if !ok {
		h.log.Error("Streaming not supported")
		return
	}

	for {
		select {
		case <-ctx.Done():
			close(done)
			h.log.Info("SSE connection closed", zap.String("streamId", streamID))
			return

		case <-ticker.C:
			// Send keepalive
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()

		case message, ok := <-messageChan:
			if !ok {
				return
			}

			// Parse and send message
			var msg IncomingMessage
			if err := json.Unmarshal([]byte(message), &msg); err != nil {
				h.log.Error("Failed to parse message", zap.Error(err))
				continue
			}

			h.sendSSEEvent(w, "message", map[string]interface{}{
				"data": msg,
			})
			flusher.Flush()
		}
	}
}

// HandleSendMessage handles POST requests to send chat messages
// POST /chat/send
func (h *HTTPHandler) HandleSendMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	// Parse request body
	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondJSON(w, http.StatusBadRequest, SendMessageResponse{
			Success: false,
			Error:   "Invalid JSON body",
		})
		return
	}

    if req.StreamID == "" {
        h.respondJSON(w, http.StatusBadRequest, SendMessageResponse{
            Success: false,
            Error:   "streamId is required",
        })
		return
	}

	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		h.respondJSON(w, http.StatusBadRequest, SendMessageResponse{
			Success: false,
			Error:   "content cannot be empty",
		})
		return
	}

	if len(req.Content) > h.cfg.Chat.MaxMessageLength {
		h.respondJSON(w, http.StatusBadRequest, SendMessageResponse{
			Success: false,
			Error:   fmt.Sprintf("content exceeds maximum length of %d characters", h.cfg.Chat.MaxMessageLength),
		})
		return
	}

    // Resolve identity (from middleware)
    id, ok := middleware.GetIdentity(ctx)
    if !ok {
        h.respondJSON(w, http.StatusUnauthorized, SendMessageResponse{ Success: false, Error: "unauthorized" })
        return
    }

    // Check rate limit (by email)
    if !h.rateLimiter.Allow(ctx, id.Email) {
        h.log.Warn("Rate limit exceeded", zap.String("userEmail", id.Email))
        h.respondJSON(w, http.StatusTooManyRequests, SendMessageResponse{
            Success: false,
            Error:   "Rate limit exceeded. Please slow down.",
        })
        return
    }

	// Set default type
	if req.Type == "" {
		req.Type = "user"
	}

	// Sanitize content (skip for superchat as it contains JSON)
	sanitizedContent := req.Content
	if req.Type != "superchat" {
		sanitizedContent = h.sanitizeContent(req.Content)
	}

    // Upsert ecitizen and save to database
    ecitizenID, err := h.db.GetOrCreateECitizen(ctx, id.Email, id.FirstName, id.LastName)
    if err != nil {
        h.log.Error("Failed to upsert ecitizen", zap.Error(err))
        h.respondJSON(w, http.StatusInternalServerError, SendMessageResponse{ Success: false, Error: "Failed to save message" })
        return
    }

    dbMsg := &database.Message{
        Content:    sanitizedContent,
        ECitizenID: ecitizenID,
        StreamID:   req.StreamID,
        Type:       req.Type,
    }

	if err := h.db.SaveMessage(ctx, dbMsg); err != nil {
		h.log.Error("Failed to save message to database", zap.Error(err))
		h.respondJSON(w, http.StatusInternalServerError, SendMessageResponse{
			Success: false,
			Error:   "Failed to save message",
		})
		return
	}

	// Create message response
    fullName := strings.TrimSpace(strings.TrimSpace(id.FirstName) + " " + strings.TrimSpace(id.LastName))
    if fullName == "" {
        parts := strings.SplitN(id.Email, "@", 2)
        fullName = parts[0]
    }
    message := &IncomingMessage{
        Author: Author{
            ID:          ecitizenID,
            Email:       id.Email,
            FirstName:   id.FirstName,
            LastName:    id.LastName,
            DisplayName: fullName,
        },
        StreamID:  req.StreamID,
        Content:   sanitizedContent,
        Type:      req.Type,
        Timestamp: dbMsg.CreatedAt.Format(time.RFC3339),
    }

	// Publish to PostgreSQL NOTIFY
	messageJSON, err := json.Marshal(message)
	if err != nil {
		h.log.Error("Failed to marshal message", zap.Error(err))
		// Message is saved but notification failed - not critical
	} else {
		channelName := fmt.Sprintf("chat_messages_%s", req.StreamID)

		if err := h.pgPubSub.Publish(ctx, channelName, string(messageJSON)); err != nil {
			h.log.Error("Failed to publish notification", zap.Error(err))
			// Message is saved but notification failed - not critical
		}
	}

    h.log.Info("Message saved and notified",
        zap.String("userEmail", id.Email),
        zap.String("streamId", req.StreamID),
        zap.String("messageId", dbMsg.ID),
    )

	// Respond with success
	h.respondJSON(w, http.StatusOK, SendMessageResponse{
		Success: true,
		Message: message,
	})
}

// HandleHealthCheck handles health check requests
// GET /health
func (h *HTTPHandler) HandleHealthCheck(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check database connection
	if err := h.db.HealthCheck(ctx); err != nil {
		h.respondJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
			"status": "unhealthy",
			"error":  "database connection failed",
		})
		return
	}

	h.respondJSON(w, http.StatusOK, map[string]interface{}{
		"status": "healthy",
	})
}

// Helper methods

func (h *HTTPHandler) sendSSEEvent(w http.ResponseWriter, event string, data interface{}) {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		h.log.Error("Failed to marshal SSE data", zap.Error(err))
		return
	}

	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, dataJSON)
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

func (h *HTTPHandler) sendSSEError(w http.ResponseWriter, message string) {
	h.sendSSEEvent(w, "error", map[string]string{
		"message": message,
	})
}

func (h *HTTPHandler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *HTTPHandler) sanitizeContent(content string) string {
	// Trim whitespace
	content = strings.TrimSpace(content)

	// Escape HTML to prevent XSS
	content = html.EscapeString(content)

	return content
}
