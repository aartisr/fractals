package api

import (
	"encoding/json"
	"fmt"
	"live_transcoder/pkg/config"
	"live_transcoder/pkg/server"
	"net/http"

	"github.com/rs/zerolog/log"
)

type API struct {
	server *server.Server
	cfg    *config.Config
}

func NewAPI(srv *server.Server, cfg *config.Config) *API {
	return &API{
		server: srv,
		cfg:    cfg,
	}
}

type StartStreamRequest struct {
	StreamKey string `json:"streamKey"`
	RTMPURL   string `json:"rtmpUrl"`
}

type StopStreamRequest struct {
	StreamKey string `json:"streamKey"`
}

type Response struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// StartStreamHandler handles POST /api/streams/start
func (a *API) StartStreamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req StartStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().Err(err).Msg("Failed to decode start stream request")
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.StreamKey == "" {
		sendJSONError(w, "streamKey is required", http.StatusBadRequest)
		return
	}

	if req.RTMPURL == "" {
		sendJSONError(w, "rtmpUrl is required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("stream_key", req.StreamKey).
		Str("rtmp_url", req.RTMPURL).
		Msg("Received start stream request")

	// Start the stream
	if err := a.server.StartStream(req.StreamKey, req.RTMPURL); err != nil {
		log.Error().Err(err).Str("stream_key", req.StreamKey).Msg("Failed to start stream")
		sendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, Response{
		Success: true,
		Message: "Stream started successfully",
	}, http.StatusOK)
}

// StopStreamHandler handles POST /api/streams/stop
func (a *API) StopStreamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req StopStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().Err(err).Msg("Failed to decode stop stream request")
		sendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.StreamKey == "" {
		sendJSONError(w, "streamKey is required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("stream_key", req.StreamKey).
		Msg("Received stop stream request")

	// Stop the stream
	if err := a.server.StopStream(req.StreamKey); err != nil {
		log.Error().Err(err).Str("stream_key", req.StreamKey).Msg("Failed to stop stream")
		sendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, Response{
		Success: true,
		Message: "Stream stopped successfully",
	}, http.StatusOK)
}

// HealthHandler handles GET /health
func (a *API) HealthHandler(w http.ResponseWriter, r *http.Request) {
	sendJSONResponse(w, Response{
		Success: true,
		Message: "Live transcoder is running",
	}, http.StatusOK)
}

// Helper functions
func sendJSONResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func sendJSONError(w http.ResponseWriter, message string, status int) {
	sendJSONResponse(w, Response{
		Success: false,
		Error:   message,
	}, status)
}

// SetupRoutes sets up the HTTP API routes
func (a *API) SetupRoutes(mux *http.ServeMux) {
	// Enable CORS for all routes
	handler := enableCORS(mux)

	// API routes
	mux.HandleFunc("/api/streams/start", a.StartStreamHandler)
	mux.HandleFunc("/api/streams/stop", a.StopStreamHandler)
	mux.HandleFunc("/health", a.HealthHandler)

	log.Info().Msg("API routes configured")

	// Start HTTP server in a goroutine
	go func() {
		port := a.cfg.Server.APIPort
		if port == 0 {
			port = 8080 // Default port
		}

		log.Info().Msgf("Starting HTTP API server on port %d", port)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", port), handler); err != nil {
			log.Fatal().Err(err).Msg("HTTP API server failed")
		}
	}()
}

// enableCORS wraps the handler with CORS headers
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
