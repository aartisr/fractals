package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"live_translation/internal/api"
)

func main() {
	srv, err := api.NewServer()
	if err != nil {
		log.Fatalf("failed to init api server: %v", err)
	}
	defer srv.Close()

	mux := http.NewServeMux()
	srv.RegisterRoutes(mux)

	addr := ":8090"
	if p := os.Getenv("API_PORT"); p != "" {
		addr = ":" + p
	}

	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 0, // allow long-lived SSE
	}

	log.Printf("live_translation API listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

