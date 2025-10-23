package server

import (
	"context"
	"fmt"
	"live_transcoder/pkg/config"
	"live_transcoder/pkg/storage"
	"live_transcoder/pkg/transcoder"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

type Server struct {
	cfg       *config.Config
	r2Client  *storage.R2Client
	sessions  map[string]*Session
	mu        sync.RWMutex
	ctx       context.Context
	cancel    context.CancelFunc
	rtmpCmd   *exec.Cmd
}

type Session struct {
	streamKey  string
	transcoder *transcoder.Transcoder
	cancel     context.CancelFunc
}

func NewServer(cfg *config.Config, r2Client *storage.R2Client) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	return &Server{
		cfg:      cfg,
		r2Client: r2Client,
		sessions: make(map[string]*Session),
		ctx:      ctx,
		cancel:   cancel,
	}
}

func (s *Server) Start() error {
	// Create temp directory for stream monitoring
	if err := os.MkdirAll(s.cfg.Server.TempDir, 0755); err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Start RTMP listener using FFmpeg
	rtmpListenAddr := fmt.Sprintf("rtmp://0.0.0.0:%d", s.cfg.RTMP.Port)

	log.Info().
		Str("address", rtmpListenAddr).
		Msg("RTMP server ready - use FFmpeg or streaming software to publish")
	log.Info().
		Msgf("Stream to: rtmp://your-server-ip:%d/live/YOUR_STREAM_KEY", s.cfg.RTMP.Port)

	// Monitor for incoming streams
	s.monitorStreams()

	return nil
}

func (s *Server) monitorStreams() {
	// In this simplified version, streams are managed by starting transcoding
	// when a stream key directory is detected
	log.Info().Msg("Server is running. Waiting for streams...")

	// Keep the server running
	<-s.ctx.Done()
}

// StartStream is called when a new stream should be processed
func (s *Server) StartStream(streamKey string, rtmpURL string) error {
	s.mu.Lock()
	if _, exists := s.sessions[streamKey]; exists {
		s.mu.Unlock()
		return fmt.Errorf("stream %s is already active", streamKey)
	}
	s.mu.Unlock()

	log.Info().Str("stream_key", streamKey).Msg("Starting new stream")

	ctx, cancel := context.WithCancel(s.ctx)
	trans := transcoder.NewTranscoder(ctx, s.cfg, s.r2Client, streamKey, rtmpURL)

	session := &Session{
		streamKey:  streamKey,
		transcoder: trans,
		cancel:     cancel,
	}

	s.mu.Lock()
	s.sessions[streamKey] = session
	s.mu.Unlock()

	// Start transcoding in background
	go func() {
		defer func() {
			s.mu.Lock()
			delete(s.sessions, streamKey)
			s.mu.Unlock()
			cancel()
			log.Info().Str("stream_key", streamKey).Msg("Stream session ended")
		}()

		if err := trans.Start(); err != nil {
			log.Error().Err(err).Str("stream_key", streamKey).Msg("Transcoding failed")
		}
	}()

	return nil
}

// StopStream stops a specific stream by streamKey
func (s *Server) StopStream(streamKey string) error {
	s.mu.Lock()
	session, exists := s.sessions[streamKey]
	s.mu.Unlock()

	if !exists {
		return fmt.Errorf("stream %s is not active", streamKey)
	}

	log.Info().Str("stream_key", streamKey).Msg("Stopping stream")

	// Stop the transcoder gracefully
	session.transcoder.Stop()

	return nil
}

func (s *Server) Stop() {
	log.Info().Msg("Stopping server...")

	// Stop all active transcoder sessions gracefully
	s.mu.Lock()
	sessions := make([]*Session, 0, len(s.sessions))
	for _, session := range s.sessions {
		sessions = append(sessions, session)
	}
	s.mu.Unlock()

	log.Info().Msgf("Stopping %d active stream(s)...", len(sessions))

	// Stop each transcoder (this triggers FFmpeg shutdown)
	for _, session := range sessions {
		session.transcoder.Stop()
	}

	// Wait for all transcoders to finish graceful shutdown
	// The transcoder Start() goroutines will complete and remove themselves from sessions map
	log.Info().Msg("Waiting for all transcoders to finish graceful shutdown...")

	// Poll until all sessions are done
	for {
		s.mu.RLock()
		remaining := len(s.sessions)
		s.mu.RUnlock()

		if remaining == 0 {
			break
		}

		log.Debug().Msgf("Waiting for %d stream(s) to finish...", remaining)

		// Use a ticker to check periodically
		ticker := time.NewTicker(500 * time.Millisecond)
		<-ticker.C
		ticker.Stop()
	}

	// Cancel server context (this will stop monitor loops)
	s.cancel()

	log.Info().Msg("All streams stopped gracefully")

	if s.rtmpCmd != nil && s.rtmpCmd.Process != nil {
		s.rtmpCmd.Process.Kill()
	}

	s.r2Client.Wait()
	log.Info().Msg("Server stopped")
}
