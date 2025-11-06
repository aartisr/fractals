package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"live_transcoder/pkg/config"
	"live_transcoder/pkg/server"
	"live_transcoder/pkg/storage"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/rs/zerolog/log"
)

type API struct {
	server   *server.Server
	cfg      *config.Config
	r2Client *storage.R2Client
}

func NewAPI(srv *server.Server, cfg *config.Config, r2Client *storage.R2Client) *API {
	return &API{
		server:   srv,
		cfg:      cfg,
		r2Client: r2Client,
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

// UploadThumbnailHandler handles POST /api/streams/:streamKey/thumbnail
func (a *API) UploadThumbnailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract streamKey from URL path
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/streams/"), "/")
	if len(pathParts) < 2 {
		sendJSONError(w, "Invalid URL format. Expected: /api/streams/:streamKey/thumbnail", http.StatusBadRequest)
		return
	}
	streamKey := pathParts[0]

	if streamKey == "" {
		sendJSONError(w, "streamKey is required", http.StatusBadRequest)
		return
	}

	log.Info().Str("stream_key", streamKey).Msg("Received thumbnail upload request")

	// Parse multipart form (2MB max)
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		log.Error().Err(err).Msg("Failed to parse multipart form")
		sendJSONError(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Get the uploaded file
	file, header, err := r.FormFile("thumbnail")
	if err != nil {
		log.Error().Err(err).Msg("Failed to get thumbnail file")
		sendJSONError(w, "thumbnail file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	log.Info().
		Str("stream_key", streamKey).
		Str("filename", header.Filename).
		Int64("size", header.Size).
		Msg("Processing thumbnail upload")

	// Read file data
	fileData, err := io.ReadAll(file)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read file data")
		sendJSONError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	// Convert image to WebP
	webpData, err := a.convertToWebP(fileData)
	if err != nil {
		log.Error().Err(err).Msg("Failed to convert image to WebP")
		sendJSONError(w, fmt.Sprintf("Failed to convert image: %v", err), http.StatusInternalServerError)
		return
	}

	// Upload to R2 at streamKey/thumbnail.webp
	r2Key := fmt.Sprintf("%s/thumbnail.webp", streamKey)
	if err := a.r2Client.UploadFile(r.Context(), r2Key, bytes.NewReader(webpData), "image/webp"); err != nil {
		log.Error().Err(err).Str("key", r2Key).Msg("Failed to upload thumbnail to R2")
		sendJSONError(w, "Failed to upload thumbnail", http.StatusInternalServerError)
		return
	}

	// Get public URL
	thumbnailURL := a.r2Client.GetPublicURL(r2Key)

	log.Info().
		Str("stream_key", streamKey).
		Str("url", thumbnailURL).
		Int("webp_size", len(webpData)).
		Msg("✓ Thumbnail uploaded successfully")

	sendJSONResponse(w, map[string]interface{}{
		"success":      true,
		"message":      "Thumbnail uploaded successfully",
		"thumbnailUrl": thumbnailURL,
	}, http.StatusOK)
}

// convertToWebP converts an image (JPEG, PNG, etc.) to WebP format using FFmpeg
func (a *API) convertToWebP(inputData []byte) ([]byte, error) {
	// Create temp directory if it doesn't exist
	tempDir := a.cfg.Server.TempDir
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Create temp file for input
	inputFile, err := os.CreateTemp(tempDir, "thumbnail-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	inputPath := inputFile.Name()
	defer os.Remove(inputPath)

	// Write input data
	if _, err := inputFile.Write(inputData); err != nil {
		inputFile.Close()
		return nil, fmt.Errorf("failed to write input file: %w", err)
	}
	inputFile.Close()

	// Create temp file for output
	outputPath := filepath.Join(tempDir, "thumbnail-"+filepath.Base(inputPath)+".webp")
	defer os.Remove(outputPath)

	// Run FFmpeg to convert to WebP
	// -q:v 80 = quality level (0-100, where 100 is best)
	cmd := exec.Command("ffmpeg",
		"-i", inputPath,
		"-vcodec", "libwebp",
		"-q:v", "80",
		"-y", // Overwrite output file
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg conversion failed: %w (stderr: %s)", err, stderr.String())
	}

	// Read converted WebP file
	webpData, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read converted file: %w", err)
	}

	log.Debug().
		Int("input_size", len(inputData)).
		Int("output_size", len(webpData)).
		Msg("Image converted to WebP")

	return webpData, nil
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

// handleStreamsRoute routes dynamic /api/streams/:streamKey/* paths
func (a *API) HandleStreamsRoute(w http.ResponseWriter, r *http.Request) {
    // URL format: /api/streams/:streamKey[/thumbnail]
    path := strings.TrimPrefix(r.URL.Path, "/api/streams/")
    parts := strings.Split(path, "/")
    if len(parts) == 0 || parts[0] == "" {
        sendJSONError(w, "Invalid URL format. Expected: /api/streams/:streamKey", http.StatusBadRequest)
        return
    }

    streamKey := parts[0]

    // Thumbnail route
    if len(parts) > 1 && parts[1] == "thumbnail" {
        a.UploadThumbnailHandler(w, r)
        return
    }

    // Status route: GET /api/streams/:streamKey
    if r.Method == http.MethodGet && len(parts) == 1 {
        running := a.server.IsStreamRunning(streamKey)
        sendJSONResponse(w, map[string]interface{}{
            "success": true,
            "streamKey": streamKey,
            "status":    func() string { if running { return "running" } else { return "idle" } }(),
            "running":   running,
        }, http.StatusOK)
        return
    }

    // Unknown stream route
    sendJSONError(w, "Not found", http.StatusNotFound)
}

// SetupRoutes sets up the HTTP API routes
func (a *API) SetupRoutes(mux *http.ServeMux) {
	// Enable CORS for all routes
	handler := enableCORS(mux)

	// API routes
	mux.HandleFunc("/api/streams/start", a.StartStreamHandler)
	mux.HandleFunc("/api/streams/stop", a.StopStreamHandler)
    mux.HandleFunc("/api/streams/", a.HandleStreamsRoute) // Handles /:streamKey and /:streamKey/thumbnail
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
