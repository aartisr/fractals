package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nithyananda-tv/chat-service/internal/config"
	"github.com/nithyananda-tv/chat-service/internal/database"
	"github.com/nithyananda-tv/chat-service/internal/handlers"
	"github.com/nithyananda-tv/chat-service/internal/middleware"
	"github.com/nithyananda-tv/chat-service/internal/pubsub"
	"github.com/nithyananda-tv/chat-service/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log, err := logger.New(cfg.LogLevel)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	log.Info("Starting chat service", zap.String("version", "1.0.0"))

	// Create context that listens for termination signals
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize database connection
	db, err := database.NewPool(ctx, cfg, log)
	if err != nil {
		log.Fatal("Failed to initialize database", zap.Error(err))
	}
	defer db.Close()

	log.Info("Database connection established")

	// Initialize PostgreSQL pub/sub client
	pgPubSub := pubsub.NewPostgresClient(db.Pool, log)
	defer pgPubSub.Close()

	log.Info("PostgreSQL pub/sub client initialized")

	// Initialize handlers
	httpHandler := handlers.NewHTTPHandler(db, pgPubSub, cfg, log)

	// Setup HTTP server
	mux := http.NewServeMux()
    // Wrap with auth middleware (SSE and send both require auth)
    mux.Handle("/chat/stream", middleware.AuthMiddleware(cfg, log, 90*time.Second, http.HandlerFunc(httpHandler.HandleSSEStream)))
    mux.Handle("/chat/send", middleware.AuthMiddleware(cfg, log, 90*time.Second, http.HandlerFunc(httpHandler.HandleSendMessage)))
	mux.HandleFunc("/health", httpHandler.HandleHealthCheck)

	// Add CORS middleware
	handler := corsMiddleware(mux)

	server := &http.Server{
		Addr:         ":9000",
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // No timeout for SSE
		IdleTimeout:  60 * time.Second,
	}

	// Start HTTP server
	go func() {
		log.Info("Starting HTTP server", zap.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("HTTP server error", zap.Error(err))
			cancel()
		}
	}()

	// Wait for termination signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	<-sigChan
	log.Info("Received termination signal, shutting down gracefully...")

	// Shutdown HTTP server
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("Error shutting down HTTP server", zap.Error(err))
	}

	cancel()
	log.Info("Chat service stopped")
}

// corsMiddleware adds CORS headers
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
