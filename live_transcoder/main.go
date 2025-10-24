package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"live_transcoder/pkg/api"
	"live_transcoder/pkg/config"
	"live_transcoder/pkg/server"
	"live_transcoder/pkg/storage"
	"net/http"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	configPath := flag.String("config", "config.yaml", "Path to configuration file")
	streamKey := flag.String("stream", "", "Stream key to process (optional, for manual mode)")
	rtmpURL := flag.String("rtmp", "", "RTMP URL to ingest from (required when using -stream)")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Setup logger
	setupLogger(cfg.Server.LogLevel)

	log.Info().Msg("Starting Live Transcoder")

	// Create context that listens for termination signals
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize R2 storage
	r2Client, err := storage.NewR2Client(ctx, cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize R2 client")
	}

	// If stream key is provided, run in manual mode
	if *streamKey != "" {
		if *rtmpURL == "" {
			log.Fatal().Msg("RTMP URL is required when using -stream flag")
		}
		runManualMode(ctx, cfg, r2Client, *streamKey, *rtmpURL)
		return
	}

	// Otherwise run as server
	srv := server.NewServer(cfg, r2Client)

	// Set up HTTP API
	apiHandler := api.NewAPI(srv, cfg, r2Client)
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/streams/start", apiHandler.StartStreamHandler)
	mux.HandleFunc("/api/streams/stop", apiHandler.StopStreamHandler)
	mux.HandleFunc("/api/streams/", func(w http.ResponseWriter, r *http.Request) {
		// Check if it's a thumbnail upload
		if strings.HasSuffix(r.URL.Path, "/thumbnail") {
			apiHandler.UploadThumbnailHandler(w, r)
			return
		}
		// Unknown stream route
		http.NotFound(w, r)
	})
	mux.HandleFunc("/health", apiHandler.HealthHandler)

	// Enable CORS
	handler := enableCORS(mux)

	// Start HTTP API server
	apiPort := cfg.Server.APIPort
	if apiPort == 0 {
		apiPort = 8080
	}

	go func() {
		log.Info().Msgf("Starting HTTP API server on port %d", apiPort)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", apiPort), handler); err != nil {
			log.Fatal().Err(err).Msg("HTTP API server failed")
		}
	}()

	// Start server in a goroutine
	go func() {
		if err := srv.Start(); err != nil {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Print usage instructions
	printUsageInstructions(cfg, apiPort)

	// Wait for termination signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Info().Msg("Shutting down gracefully...")
	srv.Stop()
}

func runManualMode(ctx context.Context, cfg *config.Config, r2Client *storage.R2Client, streamKey, rtmpURL string) {
	srv := server.NewServer(cfg, r2Client)

	log.Info().
		Str("stream_key", streamKey).
		Str("rtmp_url", rtmpURL).
		Msg("Running in manual mode")

	if err := srv.StartStream(streamKey, rtmpURL); err != nil {
		log.Fatal().Err(err).Msg("Failed to start stream")
	}

	// Wait for completion
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	srv.Stop()
}

func printUsageInstructions(cfg *config.Config, apiPort int) {
	fmt.Println("\n" + strings.Repeat("=", 70))
	fmt.Println("  LIVE TRANSCODER - RTMP Streaming Server")
	fmt.Println(strings.Repeat("=", 70))
	fmt.Println("\n🌐 HTTP API Server:")
	fmt.Printf("   Port: %d\n", apiPort)
	fmt.Printf("   Health: http://localhost:%d/health\n", apiPort)
	fmt.Println("\n📡 RTMP Server Configuration:")
	fmt.Printf("   Port: %d\n", cfg.RTMP.Port)
	fmt.Println("\n🎥 To stream from OBS/FFmpeg, use:")
	fmt.Printf("   Server: rtmp://your-server-ip:%d/live\n", cfg.RTMP.Port)
	fmt.Println("   Stream Key: any-unique-key (e.g., stream1, mystream)")
	fmt.Println("\n💡 Example with FFmpeg:")
	fmt.Printf("   ffmpeg -re -i input.mp4 -c copy -f flv rtmp://localhost:%d/live/test\n", cfg.RTMP.Port)
	fmt.Println("\n🎬 To manually start a stream transcoder:")
	fmt.Printf("   ./live_transcoder -stream YOUR_KEY -rtmp rtmp://source-url/live/stream\n")
	fmt.Println("\n📡 API Endpoints:")
	fmt.Printf("   Start Stream: POST http://localhost:%d/api/streams/start\n", apiPort)
	fmt.Printf("   Stop Stream:  POST http://localhost:%d/api/streams/stop\n", apiPort)
	fmt.Println("\n📦 Output:")
	fmt.Printf("   R2 Bucket: %s\n", cfg.Storage.Bucket)
	fmt.Printf("   Public URL: %s/STREAM_KEY/master.m3u8\n", cfg.Storage.PublicURL)
	fmt.Println("\n" + strings.Repeat("=", 70) + "\n")
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

func setupLogger(level string) {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix

	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Create logs directory if it doesn't exist
	if err := os.MkdirAll("logs", 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create logs directory: %v\n", err)
		os.Exit(1)
	}

	// Open log file
	logFile, err := os.OpenFile(
		"logs/transcoder.log",
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0644,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to open log file: %v\n", err)
		os.Exit(1)
	}

	// Write to both console and file
	consoleWriter := zerolog.ConsoleWriter{Out: os.Stderr}
	multiWriter := zerolog.MultiLevelWriter(consoleWriter, logFile)

	log.Logger = log.Output(multiWriter)
}
