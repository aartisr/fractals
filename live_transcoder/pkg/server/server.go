package server

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"live_transcoder/pkg/config"
	"live_transcoder/pkg/storage"
	"live_transcoder/pkg/transcoder"
	"net/http"
	"io"
	"os"
	"os/exec"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

type Server struct {
	cfg      *config.Config
	r2Client *storage.R2Client
	db       *sql.DB
	sessions map[string]*Session
	mu       sync.RWMutex
	ctx      context.Context
	cancel   context.CancelFunc
	rtmpCmd  *exec.Cmd
}

type Session struct {
	streamKey  string
	streamID   int64
	transcoder *transcoder.Transcoder
	cancel     context.CancelFunc
}

func NewServer(cfg *config.Config, mediaClient, analysisClient *storage.R2Client, db *sql.DB) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	return &Server{
		cfg:      cfg,
		r2Client: mediaClient,
		db:       db,
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

	// On startup, reconcile any ended/idle streams whose playlists were not finalized.
	s.reconcileEndedPlaylists()

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
func (s *Server) StartStream(streamKey string, rtmpURL string, streamID int64) error {
	s.mu.Lock()
	if _, exists := s.sessions[streamKey]; exists {
		s.mu.Unlock()
		return fmt.Errorf("stream %s is already active", streamKey)
	}
	s.mu.Unlock()

	log.Info().Str("stream_key", streamKey).Msg("Starting new stream")

	ctx, cancel := context.WithCancel(s.ctx)
	trans := transcoder.NewTranscoder(ctx, s.cfg, s.r2Client, s.db, streamKey, rtmpURL, streamID)

	session := &Session{
		streamKey:  streamKey,
		streamID:   streamID,
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

// IsStreamRunning returns true if a session for the given streamKey exists
func (s *Server) IsStreamRunning(streamKey string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.sessions[streamKey]
	return exists
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

// reconcileEndedPlaylists ensures ended/idle streams have VOD playlists with ENDLIST.
func (s *Server) reconcileEndedPlaylists() {
	if s.db == nil || s.r2Client == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `SELECT stream_key FROM live_streams WHERE status = 'ended'`)
	if err != nil {
		log.Warn().Err(err).Msg("reconcile: failed to load ended/idle streams")
		return
	}
	defer rows.Close()

	var streamKeys []string
	for rows.Next() {
		var sk string
		if err := rows.Scan(&sk); err == nil && strings.TrimSpace(sk) != "" {
			streamKeys = append(streamKeys, strings.TrimSpace(sk))
		}
	}

	for _, sk := range streamKeys {
		s.reconcileStreamPlaylists(ctx, sk)
	}
}

func (s *Server) reconcileStreamPlaylists(ctx context.Context, streamKey string) {
	qualities := make([]string, 0, len(s.cfg.Qualities))
	for _, q := range s.cfg.Qualities {
		qualities = append(qualities, q.Name)
	}

	// Master
	s.rewriteIfNeeded(ctx, path.Join(streamKey, "master.m3u8"))
	// Variants
	for _, q := range qualities {
		s.rewriteIfNeeded(ctx, path.Join(streamKey, q, "playlist.m3u8"))
	}
}

func (s *Server) rewriteIfNeeded(ctx context.Context, key string) {
	url := s.r2Client.GetPublicURL(key)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		if err == nil {
			resp.Body.Close()
		}
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}

	newBody := ensureVODAndEndlist(body)
	if bytes.Equal(newBody, body) {
		return
	}

	contentType := storage.GetContentType(key)
	if err := s.r2Client.UploadPlaylist(context.Background(), key, bytes.NewReader(newBody), contentType); err != nil {
		log.Warn().Err(err).Str("key", key).Msg("reconcile: upload failed")
	} else {
		log.Info().Str("key", key).Msg("reconcile: playlist finalized to VOD")
	}
}

// ensureVODAndEndlist normalizes a playlist to VOD type and appends ENDLIST.
func ensureVODAndEndlist(content []byte) []byte {
	lines := strings.Split(string(content), "\n")
	var out []string
	insertedType := false

	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, "#EXT-X-PLAYLIST-TYPE") {
			out = append(out, "#EXT-X-PLAYLIST-TYPE:VOD")
			insertedType = true
			continue
		}
		out = append(out, line)
	}

	if !insertedType {
		insertAt := 1
		if len(out) > 1 && strings.HasPrefix(out[1], "#EXT-X-VERSION") {
			insertAt = 2
		}
		tmp := append([]string{}, out[:insertAt]...)
		tmp = append(tmp, "#EXT-X-PLAYLIST-TYPE:VOD")
		tmp = append(tmp, out[insertAt:]...)
		out = tmp
	}

	// Trim trailing blanks
	for len(out) > 0 && strings.TrimSpace(out[len(out)-1]) == "" {
		out = out[:len(out)-1]
	}

	hasEndlist := false
	for _, line := range out {
		if strings.TrimSpace(line) == "#EXT-X-ENDLIST" {
			hasEndlist = true
			break
		}
	}
	if !hasEndlist {
		out = append(out, "#EXT-X-ENDLIST")
	}

	return []byte(strings.Join(out, "\n") + "\n")
}
