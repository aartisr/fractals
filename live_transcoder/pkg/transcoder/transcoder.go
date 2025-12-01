package transcoder

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"live_transcoder/pkg/chunker"
	"live_transcoder/pkg/config"
	"live_transcoder/pkg/storage"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"
)

var (
	segmentVariantRegex = regexp.MustCompile(`^segment_([^_]+)_`)
	streamVariantRegex  = regexp.MustCompile(`^stream_(.+)\.m3u8$`)
)

type Transcoder struct {
	ctx           context.Context
	cfg           *config.Config
	r2Client      *storage.R2Client
	db            *sql.DB
	streamKey     string
	rtmpURL       string
	streamID      int64
	workDir       string
	processLock   sync.Mutex
	processes     []*exec.Cmd
	variants      map[string]string
	uploadCtx     context.Context
	uploadCancel  context.CancelFunc
	stopOnce      sync.Once
	stopped       bool
	uploadedMutex sync.Mutex // Protects uploadedFiles map in watchAndUploadSegments
}

func NewTranscoder(ctx context.Context, cfg *config.Config, r2Client *storage.R2Client, db *sql.DB, streamKey string, rtmpURL string, streamID int64) *Transcoder {
	variants := make(map[string]string, len(cfg.Qualities))
	for _, quality := range cfg.Qualities {
		variants[quality.Name] = quality.Name
	}

	// Create separate context for upload watcher that won't be canceled when FFmpeg ends
	uploadCtx, uploadCancel := context.WithCancel(context.Background())

	return &Transcoder{
		ctx:          ctx,
		cfg:          cfg,
		r2Client:     r2Client,
		db:           db,
		streamKey:    streamKey,
		rtmpURL:      rtmpURL,
		streamID:     streamID,
		processes:    make([]*exec.Cmd, 0),
		variants:     variants,
		uploadCtx:    uploadCtx,
		uploadCancel: uploadCancel,
	}
}

func (t *Transcoder) Start() error {
	// Create working directory
	workDir := filepath.Join(t.cfg.Server.TempDir, t.streamKey)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return fmt.Errorf("failed to create work directory: %w", err)
	}
	t.workDir = workDir

	// Start HLS transcoding
	hlsDir := filepath.Join(workDir, "hls")
	if err := os.MkdirAll(hlsDir, 0755); err != nil {
		return fmt.Errorf("failed to create HLS directory: %w", err)
	}

	// Start segment upload watcher
	uploadDone := make(chan struct{})
	go func() {
		t.watchAndUploadSegments()
		close(uploadDone)
	}()

	// Start main FFmpeg transcoding process (HLS only)
	cmd := t.buildFFmpegCommand(hlsDir)
	cmd.Stderr = os.Stderr

	// Configure analysis chunker (silence-based).
	// Use a shared analysis volume so other services (live_translation) can read the same files.
	chunkDir := filepath.Join("/analysis", t.streamKey)
	if err := os.MkdirAll(chunkDir, 0o755); err != nil {
		return fmt.Errorf("failed to create analysis chunk dir: %w", err)
	}
	chCfg := chunker.Config{
		SampleRate:    16000,
		Channels:      1,
		FrameMs:       20,
		SilenceThresh: 800,
		MinSilenceMs:  1000,
		MinChunkMs:    500,  // Capture segments as short as 0.5 seconds (was 10 seconds!)
		OutputDir:     chunkDir,
	}

	// Start analysis FFmpeg process (separate, so HLS is unaffected)
	analysisCmd := t.buildAnalysisCommand()
	analysisCmd.Stderr = os.Stderr
	pcmReader, err := analysisCmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get ffmpeg stdout for analysis: %w", err)
	}

	// Start both FFmpeg processes.
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start main ffmpeg: %w", err)
	}
	if err := analysisCmd.Start(); err != nil {
		return fmt.Errorf("failed to start analysis ffmpeg: %w", err)
	}

	// Create buffered channel for async DB inserts to avoid blocking chunker reads
	type chunkInsert struct {
		startMs int64
		endMs   int64
		path    string
	}
	insertChan := make(chan chunkInsert, 100)

	// Start async DB insert worker
	insertDone := make(chan struct{})
	go func() {
		defer close(insertDone)
		for insert := range insertChan {
			if t.db != nil && t.streamID != 0 {
				// Insert audio chunk and get the generated ID
				var chunkID int64
				err := t.db.QueryRow(
					`INSERT INTO audio_chunks (stream_id, start_ms, end_ms, file_path) VALUES ($1, $2, $3, $4) RETURNING id`,
					t.streamID, insert.startMs, insert.endMs, insert.path,
				).Scan(&chunkID)

				if err != nil {
					log.Error().Err(err).Str("stream_key", t.streamKey).Msg("failed to insert audio_chunk")
				} else {
					// Successfully inserted - emit pg_notify so transcription worker can react
					if _, notifyErr := t.db.Exec(
						`SELECT pg_notify('audio_chunks', json_build_object('id', $1::bigint, 'stream_id', $2::bigint)::text)`,
						chunkID, t.streamID,
					); notifyErr != nil {
						log.Warn().Err(notifyErr).Str("stream_key", t.streamKey).Msg("failed to send audio_chunks notification")
					} else {
						log.Info().
							Str("stream_key", t.streamKey).
							Int64("chunk_id", chunkID).
							Int64("stream_id", t.streamID).
							Msg("audio_chunks notification sent")
					}
				}
			}
		}
	}()

	// Run chunker in background; it will exit on EOF when analysis FFmpeg ends.
	go func() {
		defer close(insertChan)
		if err := chunker.Run(pcmReader, chCfg, func(startMs, endMs int64, path string) {
			log.Info().
				Str("stream_key", t.streamKey).
				Int64("start_ms", startMs).
				Int64("end_ms", endMs).
				Str("file", path).
				Msg("analysis chunk detected")

			// Send to async insert worker (non-blocking with buffered channel)
			select {
			case insertChan <- chunkInsert{startMs: startMs, endMs: endMs, path: path}:
			default:
				log.Warn().Str("stream_key", t.streamKey).Msg("insert channel full, dropping chunk insert")
			}
		}); err != nil {
			log.Error().Err(err).Str("stream_key", t.streamKey).Msg("analysis chunker error")
		}
		// Wait for all pending inserts to complete
		<-insertDone
		// After chunking is done (FFmpeg ended), best-effort upload of analysis chunks to R2 and
		// update audio_chunks.file_path to use the R2 key instead of the local path.
		t.uploadAnalysisChunks()
	}()

	log.Info().
		Str("stream_key", t.streamKey).
		Str("rtmp_url", t.rtmpURL).
		Int("qualities", len(t.cfg.Qualities)).
		Int("segment_duration", t.cfg.HLS.SegmentDuration).
		Msg("🎬 Starting FFmpeg transcoding")

	if err := cmd.Wait(); err != nil {
		log.Warn().Err(err).Msg("FFmpeg process ended with error (stream may have stopped)")
	}

	// FFmpeg ended (either error or manual stop) - perform graceful shutdown
	log.Info().Str("stream_key", t.streamKey).Msg("Performing graceful shutdown...")
	t.gracefulShutdown(uploadDone)

	return nil
}

// Stop gracefully stops the transcoder (called by server on shutdown)
func (t *Transcoder) Stop() {
	t.stopOnce.Do(func() {
		log.Info().Str("stream_key", t.streamKey).Msg("Stopping transcoder - sending quit signal to FFmpeg...")
		t.stopped = true

		// Send SIGINT to all FFmpeg processes for graceful shutdown
		t.processLock.Lock()
		for _, cmd := range t.processes {
			if cmd.Process != nil {
				log.Debug().
					Str("stream_key", t.streamKey).
					Int("pid", cmd.Process.Pid).
					Msg("Sending SIGINT to FFmpeg process")
				cmd.Process.Signal(os.Interrupt)
			}
		}
		t.processLock.Unlock()

		// Start a goroutine to force kill after timeout
		go func() {
			time.Sleep(10 * time.Second)

			t.processLock.Lock()
			defer t.processLock.Unlock()

			for _, cmd := range t.processes {
				if cmd.Process != nil {
					// Check if process is still running
					if err := cmd.Process.Signal(syscall.Signal(0)); err == nil {
						log.Warn().
							Str("stream_key", t.streamKey).
							Int("pid", cmd.Process.Pid).
							Msg("FFmpeg did not respond to SIGINT after 10s, sending SIGKILL")
						cmd.Process.Kill()
					}
				}
			}
		}()
	})
}

func (t *Transcoder) gracefulShutdown(uploadDone chan struct{}) {
	log.Info().
		Str("stream_key", t.streamKey).
		Msg("FFmpeg stopped - starting graceful shutdown...")

	// Report progress: FFmpeg stopped
	t.reportProgress("ffmpeg_stopped", "FFmpeg stopped, preparing to finalize stream...", 10, false)

	// Upload any remaining segments (with retries for in-progress writes)
	hlsDir := filepath.Join(t.workDir, "hls")
	uploadedFiles := make(map[string]bool)

	log.Info().
		Str("stream_key", t.streamKey).
		Msg("Uploading final segments (retrying 5 times)...")

	// Report progress: Uploading final segments
	t.reportProgress("uploading_segments", "Uploading final segments...", 30, false)

	// Try multiple times to catch any segments still being written
	for i := 0; i < 5; i++ {
		log.Debug().
			Str("stream_key", t.streamKey).
			Int("attempt", i+1).
			Msg("Scanning for remaining segments...")
		t.uploadDirectory(hlsDir, "", uploadedFiles)
		time.Sleep(500 * time.Millisecond)
	}

	log.Info().
		Str("stream_key", t.streamKey).
		Int("total_uploaded", len(uploadedFiles)).
		Msg("Final segment upload completed")

	// Report progress: Finalizing playlists
	t.reportProgress("finalizing_playlists", "Finalizing playlists with EXT-X-ENDLIST...", 60, false)

	// Finalize playlists by adding EXT-X-ENDLIST (marks stream as VOD)
	log.Info().Str("stream_key", t.streamKey).Msg("Finalizing playlists with EXT-X-ENDLIST...")
	finalized := t.finalizePlaylists()

	// Report progress: Cleanup
	t.reportProgress("cleanup", "Cleaning up temporary files...", 90, false)

	// Signal upload watcher to stop and wait for it
	log.Debug().Str("stream_key", t.streamKey).Msg("Stopping upload watcher...")
	t.uploadCancel()
	<-uploadDone
	log.Debug().Str("stream_key", t.streamKey).Msg("Upload watcher stopped")

	// Clean up temp directory
	if finalized {
		log.Info().Str("stream_key", t.streamKey).Msg("Cleaning up temp directory...")
		if t.workDir != "" {
			os.RemoveAll(t.workDir)
		}
	} else {
		log.Warn().Str("stream_key", t.streamKey).Msg("Skipping temp cleanup to allow manual retry of playlist uploads")
	}

	finalMsg := "Graceful shutdown completed - stream available as VOD"
	if !finalized {
		finalMsg = "Graceful shutdown completed with pending playlist uploads; manual intervention required"
	}

	log.Info().
		Str("stream_key", t.streamKey).
		Msg(finalMsg)

	// Report final completion
	t.reportProgress("completed", finalMsg, 100, finalized)
}

func (t *Transcoder) buildFFmpegCommand(hlsDir string) *exec.Cmd {
	// Build FFmpeg command for multi-quality HLS with RTMP input
	args := []string{
		"-nostdin", // Don't expect interactive input, allows proper signal handling
		"-i", t.rtmpURL,
		"-c:a", "aac",
		"-ar", "48000",
		"-c:v", "libx264",
		"-preset", "veryfast",
		"-tune", "zerolatency",
		"-g", "60",
		"-sc_threshold", "0",
	}

	// Add video quality variants
	for i, quality := range t.cfg.Qualities {
		args = append(args,
			"-map", "0:v:0",
			"-map", "0:a:0",
			fmt.Sprintf("-s:v:%d", i), fmt.Sprintf("%dx%d", quality.Width, quality.Height),
			fmt.Sprintf("-b:v:%d", i), quality.VideoBitrate,
			fmt.Sprintf("-b:a:%d", i), quality.AudioBitrate,
		)
	}

	// HLS output settings for DVR support
	args = append(args,
		"-f", "hls",
		"-hls_time", fmt.Sprintf("%d", t.cfg.HLS.SegmentDuration),
		"-hls_list_size", "0", // Keep all segments in playlist for DVR
		"-hls_flags", "append_list+omit_endlist", // Keep growing, don't end playlist
		"-hls_segment_filename", filepath.Join(hlsDir, "segment_%v_%03d.ts"),
		"-master_pl_name", "master.m3u8",
		"-hls_playlist_type", "event", // Event type for DVR
	)

	// Add variant stream mapping
	var variantStreams []string
	for i, quality := range t.cfg.Qualities {
		variantStreams = append(variantStreams, fmt.Sprintf("v:%d,a:%d,name:%s", i, i, quality.Name))
	}
	args = append(args,
		"-var_stream_map", strings.Join(variantStreams, " "),
		filepath.Join(hlsDir, "stream_%v.m3u8"),
		// Extra audio-only PCM output to stdout for analysis chunker
		"-map", "0:a:0",
		"-ac", "1",
		"-ar", "16000",
		"-c:a", "pcm_s16le",
		"-f", "s16le",
		"pipe:1",
	)

	cmd := exec.CommandContext(t.ctx, "ffmpeg", args...)

	t.processLock.Lock()
	t.processes = append(t.processes, cmd)
	t.processLock.Unlock()

	return cmd
}

// buildAnalysisCommand builds a separate FFmpeg command that reads the same RTMP
// input and outputs mono 16k PCM to stdout for the analysis chunker.
func (t *Transcoder) buildAnalysisCommand() *exec.Cmd {
	args := []string{
		"-nostdin", // Don't expect interactive input, allows proper signal handling
		"-loglevel", "warning",
		"-i", t.rtmpURL,
		"-map", "0:a:0",
		"-ac", "1",
		"-ar", "16000",
		"-c:a", "pcm_s16le",
		"-f", "s16le",
		"pipe:1",
	}
	cmd := exec.CommandContext(t.ctx, "ffmpeg", args...)

	t.processLock.Lock()
	t.processes = append(t.processes, cmd)
	t.processLock.Unlock()

	return cmd
}

func (t *Transcoder) watchAndUploadSegments() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	uploadedFiles := make(map[string]bool)
	fileSizes := make(map[string]int64)

	for {
		select {
		case <-t.uploadCtx.Done():
			return
		case <-ticker.C:
			// Upload HLS segments
			hlsDir := filepath.Join(t.workDir, "hls")
			t.uploadDirectoryWithStabilityCheck(hlsDir, "", uploadedFiles, fileSizes)
		}
	}
}

func (t *Transcoder) uploadDirectoryWithStabilityCheck(dir, prefix string, uploadedFiles map[string]bool, fileSizes map[string]int64) {
	files, err := os.ReadDir(dir)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Error().Err(err).Str("dir", dir).Msg("Failed to read directory")
		}
		return
	}

	// Separate files into segments and playlists
	var segments []os.DirEntry
	var playlists []os.DirEntry

	for _, file := range files {
		if file.IsDir() || strings.HasSuffix(file.Name(), ".tmp") {
			continue
		}

		if strings.HasSuffix(file.Name(), ".m3u8") {
			playlists = append(playlists, file)
		} else {
			segments = append(segments, file)
		}
	}

	// Collect stable segments ready for upload
	var readyToUpload []struct {
		filePath    string
		fileName    string
		r2Key       string
		contentType string
		size        int64
	}

	// Upload segments first (with stability check)
	for _, file := range segments {
		filePath := filepath.Join(dir, file.Name())

		// Skip if already uploaded (protected read)
		t.uploadedMutex.Lock()
		alreadyUploaded := uploadedFiles[filePath]
		t.uploadedMutex.Unlock()

		if alreadyUploaded {
			continue
		}

		// Check file stability - only upload if size hasn't changed
		fileInfo, err := os.Stat(filePath)
		if err != nil {
			continue
		}

		currentSize := fileInfo.Size()
		lastSize, exists := fileSizes[filePath]

		if exists && lastSize == currentSize && currentSize > 0 {
			// File is stable, ready to upload
			log.Debug().
				Str("file", file.Name()).
				Int64("size", currentSize).
				Msg("✓ Segment stable, queuing for upload...")

			r2Key := t.buildR2Key(prefix, file.Name())
			contentType := storage.GetContentType(file.Name())

			readyToUpload = append(readyToUpload, struct {
				filePath    string
				fileName    string
				r2Key       string
				contentType string
				size        int64
			}{filePath, file.Name(), r2Key, contentType, currentSize})
		} else {
			// File is still being written, track size for next check
			if exists {
				log.Debug().
					Str("file", file.Name()).
					Int64("prev_size", lastSize).
					Int64("curr_size", currentSize).
					Msg("⏳ Segment still being written")
			} else {
				log.Debug().
					Str("file", file.Name()).
					Int64("size", currentSize).
					Msg("📝 New segment detected")
			}
			fileSizes[filePath] = currentSize
		}
	}

	// Upload all stable segments in parallel with concurrency limit
	var uploadWg sync.WaitGroup
	semaphore := make(chan struct{}, 10) // Limit to 10 concurrent uploads

	for _, seg := range readyToUpload {
		uploadWg.Add(1)
		go func(s struct {
			filePath    string
			fileName    string
			r2Key       string
			contentType string
			size        int64
		}) {
			defer uploadWg.Done()

			// Acquire semaphore
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-t.uploadCtx.Done():
				return
			}

			fileReader, err := os.Open(s.filePath)
			if err != nil {
				log.Error().Err(err).Str("file", s.filePath).Msg("Failed to open file")
				return
			}
			defer fileReader.Close()

			// Create timeout context for upload (30 seconds)
			uploadTimeout, cancel := context.WithTimeout(t.uploadCtx, 30*time.Second)
			defer cancel()

			if err := t.r2Client.UploadFile(uploadTimeout, s.r2Key, fileReader, s.contentType); err != nil {
				log.Error().Err(err).Str("file", s.filePath).Msg("Failed to upload file")
				return
			}

			// Protect concurrent map write with transcoder-level mutex
			t.uploadedMutex.Lock()
			uploadedFiles[s.filePath] = true
			t.uploadedMutex.Unlock()

			log.Info().
				Str("file", s.fileName).
				Str("key", s.r2Key).
				Int64("size", s.size).
				Msg("✓ Segment uploaded successfully")
		}(seg)
	}

	// Wait for all uploads to complete before continuing
	uploadWg.Wait()

	// Upload playlists after segments (always re-upload playlists)
	for _, file := range playlists {
		filePath := filepath.Join(dir, file.Name())
		r2Key := t.buildR2Key(prefix, file.Name())
		contentType := storage.GetContentType(file.Name())

		// Handle playlists specially - rewrite paths
		var rewritten []byte
		if file.Name() == "master.m3u8" {
			rewritten, err = t.rewriteMasterPlaylist(filePath)
			if err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to rewrite master playlist")
				continue
			}
		} else if strings.HasPrefix(file.Name(), "stream_") {
			// Rewrite quality playlists
			rewritten, err = t.rewriteQualityPlaylist(filePath)
			if err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to rewrite quality playlist")
				continue
			}
		}

		// Retry playlists with a longer timeout to tolerate slow responses
		if err := t.uploadPlaylistWithRetry(t.uploadCtx, r2Key, rewritten, contentType, 3, 30*time.Second); err != nil {
			log.Error().Err(err).Str("file", filePath).Msg("Failed to upload playlist after retries")
			continue
		}

		uploadedFiles[filePath] = true
		log.Debug().Str("file", file.Name()).Str("key", r2Key).Msg("Uploaded playlist")
	}
}

func (t *Transcoder) uploadDirectory(dir, prefix string, uploadedFiles map[string]bool) {
	files, err := os.ReadDir(dir)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Error().Err(err).Str("dir", dir).Msg("Failed to read directory")
		}
		return
	}

	// Separate files into segments and playlists
	var segments []os.DirEntry
	var playlists []os.DirEntry

	for _, file := range files {
		if file.IsDir() || strings.HasSuffix(file.Name(), ".tmp") {
			continue
		}

		if strings.HasSuffix(file.Name(), ".m3u8") {
			playlists = append(playlists, file)
		} else {
			segments = append(segments, file)
		}
	}

	// Upload segments first
	for _, file := range segments {
		filePath := filepath.Join(dir, file.Name())

		// Skip if already uploaded
		if uploadedFiles[filePath] {
			continue
		}

		r2Key := t.buildR2Key(prefix, file.Name())
		contentType := storage.GetContentType(file.Name())

		// Open file
		fileReader, err := os.Open(filePath)
		if err != nil {
			log.Error().Err(err).Str("file", filePath).Msg("Failed to open file")
			continue
		}

		// Pass the file handle so the AWS SDK can seek for checksum calculations.
		if err := t.r2Client.UploadFile(t.ctx, r2Key, fileReader, contentType); err != nil {
			fileReader.Close()
			log.Error().Err(err).Str("file", filePath).Msg("Failed to upload file")
			continue
		}
		fileReader.Close()

		uploadedFiles[filePath] = true
		log.Debug().Str("file", file.Name()).Str("key", r2Key).Msg("Uploaded segment")
	}

	// Upload playlists after segments (always re-upload playlists)
	for _, file := range playlists {
		filePath := filepath.Join(dir, file.Name())
		r2Key := t.buildR2Key(prefix, file.Name())
		contentType := storage.GetContentType(file.Name())

		// Handle playlists specially - rewrite paths
		if file.Name() == "master.m3u8" {
			rewritten, err := t.rewriteMasterPlaylist(filePath)
			if err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to rewrite master playlist")
				continue
			}

			if err := t.r2Client.UploadPlaylist(t.ctx, r2Key, bytes.NewReader(rewritten), contentType); err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to upload file")
				continue
			}
		} else if strings.HasPrefix(file.Name(), "stream_") {
			// Rewrite quality playlists
			rewritten, err := t.rewriteQualityPlaylist(filePath)
			if err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to rewrite quality playlist")
				continue
			}

			if err := t.r2Client.UploadPlaylist(t.ctx, r2Key, bytes.NewReader(rewritten), contentType); err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to upload file")
				continue
			}
		}

		uploadedFiles[filePath] = true
		log.Debug().Str("file", file.Name()).Str("key", r2Key).Msg("Uploaded playlist")
	}
}

func (t *Transcoder) finalizePlaylists() bool {
	hlsDir := filepath.Join(t.workDir, "hls")

	files, err := os.ReadDir(hlsDir)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read HLS directory for finalization")
		return false
	}

	// Use a fresh context with timeout for finalization uploads (not t.uploadCtx which may be canceled)
	finalizeCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	allSucceeded := true

	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".m3u8") {
			continue
		}

		filePath := filepath.Join(hlsDir, file.Name())

		// Read playlist content
		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Error().Err(err).Str("file", filePath).Msg("Failed to read playlist")
			allSucceeded = false
			continue
		}

		lines := strings.Split(string(content), "\n")

		// Check if already has ENDLIST
		hasEndlist := false
		for _, line := range lines {
			if strings.TrimSpace(line) == "#EXT-X-ENDLIST" {
				hasEndlist = true
				break
			}
		}

		if !hasEndlist {
			// Remove any trailing empty lines
			for len(lines) > 0 && strings.TrimSpace(lines[len(lines)-1]) == "" {
				lines = lines[:len(lines)-1]
			}

			// Add ENDLIST tag
			lines = append(lines, "#EXT-X-ENDLIST")
			content = []byte(strings.Join(lines, "\n") + "\n")
		}

		// Upload finalized playlist
		r2Key := t.buildR2Key("", file.Name())
		contentType := storage.GetContentType(file.Name())

		// Rewrite paths based on playlist type
		if file.Name() == "master.m3u8" {
			content, err = t.rewriteMasterPlaylistContent(content)
			if err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to rewrite master playlist")
				allSucceeded = false
				continue
			}
		} else if strings.HasPrefix(file.Name(), "stream_") {
			content, err = t.rewriteQualityPlaylistContent(content)
			if err != nil {
				log.Error().Err(err).Str("file", filePath).Msg("Failed to rewrite quality playlist")
				allSucceeded = false
				continue
			}
		}

		// Ensure VOD semantics and ENDLIST.
		content = t.ensureVODAndEndlist(content)

		if err := t.uploadPlaylistWithRetry(finalizeCtx, r2Key, content, contentType, 5, 30*time.Second); err != nil {
			log.Error().Err(err).Str("file", filePath).Msg("Failed to upload finalized playlist after retries")
			allSucceeded = false
			continue
		}

		log.Info().
			Str("file", file.Name()).
			Str("key", r2Key).
			Msg("Playlist finalized with EXT-X-ENDLIST")
	}

	return allSucceeded
}

func (t *Transcoder) buildR2Key(defaultPrefix, filename string) string {
	if qualityName, ok := t.extractVariantName(filename); ok {
		if _, exists := t.variants[qualityName]; exists {
			cleanedFilename := t.cleanFilename(filename)
			return path.Join(t.streamKey, qualityName, cleanedFilename)
		}
	}

	if defaultPrefix != "" {
		return path.Join(t.streamKey, defaultPrefix, filename)
	}

	return path.Join(t.streamKey, filename)
}

func (t *Transcoder) extractVariantName(filename string) (string, bool) {
	if matches := segmentVariantRegex.FindStringSubmatch(filename); len(matches) == 2 {
		return matches[1], true
	}

	if matches := streamVariantRegex.FindStringSubmatch(filename); len(matches) == 2 {
		return matches[1], true
	}

	return "", false
}

func (t *Transcoder) cleanFilename(filename string) string {
	// Convert segment_1080p_001.ts -> segment_001.ts
	if segmentVariantRegex.MatchString(filename) {
		return segmentVariantRegex.ReplaceAllString(filename, "segment_")
	}

	// Convert stream_1080p.m3u8 -> playlist.m3u8
	if streamVariantRegex.MatchString(filename) {
		return "playlist.m3u8"
	}

	return filename
}

func (t *Transcoder) rewriteMasterPlaylist(filePath string) ([]byte, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	return t.rewriteMasterPlaylistContent(content)
}

func (t *Transcoder) rewriteMasterPlaylistContent(content []byte) ([]byte, error) {
	lines := strings.Split(string(content), "\n")
	for i, line := range lines {
		// Rewrite stream_<quality>.m3u8 to <quality>/playlist.m3u8
		if strings.HasPrefix(line, "stream_") && strings.HasSuffix(line, ".m3u8") {
			if matches := streamVariantRegex.FindStringSubmatch(line); len(matches) == 2 {
				qualityName := matches[1]
				if _, exists := t.variants[qualityName]; exists {
					lines[i] = qualityName + "/playlist.m3u8"
				}
			}
		}
	}

	return []byte(strings.Join(lines, "\n")), nil
}

func (t *Transcoder) rewriteQualityPlaylist(filePath string) ([]byte, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	return t.rewriteQualityPlaylistContent(content)
}

func (t *Transcoder) rewriteQualityPlaylistContent(content []byte) ([]byte, error) {
	lines := strings.Split(string(content), "\n")
	var filtered []string

	for _, line := range lines {
		// Skip discontinuity tags
		if line == "#EXT-X-DISCONTINUITY" {
			continue
		}

		// Rewrite segment_<quality>_<num>.ts to segment_<num>.ts
		if strings.HasPrefix(line, "segment_") && strings.HasSuffix(line, ".ts") {
			if matches := segmentVariantRegex.FindStringSubmatch(line); len(matches) == 2 {
				qualityName := matches[1]
				if _, exists := t.variants[qualityName]; exists {
					line = segmentVariantRegex.ReplaceAllString(line, "segment_")
				}
			}
		}

		filtered = append(filtered, line)
	}

	return []byte(strings.Join(filtered, "\n")), nil
}

// ensureVODAndEndlist normalizes a playlist to VOD type and appends ENDLIST.
func (t *Transcoder) ensureVODAndEndlist(content []byte) []byte {
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

// uploadPlaylistWithRetry retries uploads with per-attempt timeout and simple backoff.
func (t *Transcoder) uploadPlaylistWithRetry(baseCtx context.Context, key string, content []byte, contentType string, attempts int, perAttemptTimeout time.Duration) error {
	var lastErr error

	for attempt := 1; attempt <= attempts; attempt++ {
		attemptCtx, cancel := context.WithTimeout(baseCtx, perAttemptTimeout)
		err := t.r2Client.UploadPlaylist(attemptCtx, key, bytes.NewReader(content), contentType)
		cancel()

		if err == nil {
			return nil
		}

		lastErr = err

		// If parent context is canceled, do not continue retrying.
		if errors.Is(attemptCtx.Err(), context.Canceled) || errors.Is(baseCtx.Err(), context.Canceled) {
			break
		}

		backoff := time.Duration(attempt) * time.Second
		select {
		case <-baseCtx.Done():
			return baseCtx.Err()
		case <-time.After(backoff):
		}
	}

	return lastErr
}

// uploadAnalysisChunks uploads local analysis WAVs to R2 and updates audio_chunks.file_path
// from the local path to the R2 key for this stream.
func (t *Transcoder) uploadAnalysisChunks() {
	if t.r2Client == nil {
		return
	}

	log.Info().Str("stream_key", t.streamKey).Msg("📤 Starting analysis chunks upload to R2...")

	analysisDir := filepath.Join("/analysis", t.streamKey)
	entries, err := os.ReadDir(analysisDir)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Error().Err(err).Str("dir", analysisDir).Msg("failed to read analysis dir for upload")
		}
		return
	}

	// Create context with timeout to prevent indefinite blocking
	uploadCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	totalFiles := 0
	uploadedFiles := 0
	failedFiles := 0

	// Count total WAV files
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".wav") {
			totalFiles++
		}
	}

	log.Info().
		Str("stream_key", t.streamKey).
		Int("total_files", totalFiles).
		Msg("Found analysis chunks to upload")

	// Use concurrent uploads with semaphore to limit parallelism
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5) // Limit to 5 concurrent uploads

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".wav") {
			continue
		}

		wg.Add(1)
		go func(fileName string) {
			defer wg.Done()

			// Acquire semaphore
			select {
			case semaphore <- struct{}{}:
				defer func() { <-semaphore }()
			case <-uploadCtx.Done():
				failedFiles++
				return
			}

			localPath := filepath.Join(analysisDir, fileName)
			r2Key := path.Join(t.streamKey, "analysis", fileName)

			f, err := os.Open(localPath)
			if err != nil {
				log.Error().Err(err).Str("file", localPath).Msg("failed to open analysis chunk for upload")
				failedFiles++
				return
			}
			defer f.Close()

			contentType := storage.GetContentType(fileName)

			// Use timeout context for individual file upload
			fileCtx, fileCancel := context.WithTimeout(uploadCtx, 30*time.Second)
			defer fileCancel()

			if err := t.r2Client.UploadFile(fileCtx, r2Key, f, contentType); err != nil {
				log.Error().Err(err).Str("file", localPath).Str("key", r2Key).Msg("failed to upload analysis chunk to R2")
				failedFiles++
				return
			}

			uploadedFiles++
			log.Debug().Str("file", fileName).Str("key", r2Key).Msg("uploaded analysis chunk to R2")
		}(name)
	}

	// Wait for all uploads to complete or timeout
	wg.Wait()

	log.Info().
		Str("stream_key", t.streamKey).
		Int("total", totalFiles).
		Int("uploaded", uploadedFiles).
		Int("failed", failedFiles).
		Msg("✓ Analysis chunks upload completed")

	// For now we keep audio_chunks.file_path pointing at the shared volume path so
	// live_translation can read local files; R2 copy is for archival only.
}

// reportProgress sends graceful shutdown progress updates to the CMS
func (t *Transcoder) reportProgress(phase, message string, progress int, completed bool) {
	if t.streamID == 0 {
		return
	}

	// Get CMS configuration from env
	cmsHost := os.Getenv("CMS_HOST")
	if cmsHost == "" {
		cmsHost = "http://localhost:3000"
	}

	payload := map[string]interface{}{
		"phase":     phase,
		"message":   message,
		"progress":  progress,
		"completed": completed,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal progress payload")
		return
	}

	url := fmt.Sprintf("%s/api/live-streams/%d/ending-progress", cmsHost, t.streamID)

	// Use a short timeout for progress updates (non-critical)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonData))
	if err != nil {
		log.Error().Err(err).Msg("Failed to create progress request")
		return
	}

	req.Header.Set("Content-Type", "application/json")

	// Add Payload API Key header for authentication if available
	// Format: "users API-Key {YOUR_API_KEY}"
	if apiKey := os.Getenv("CMS_API_KEY"); apiKey != "" {
		req.Header.Set("Authorization", apiKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to report progress to CMS (non-critical)")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Warn().Int("status", resp.StatusCode).Msg("CMS returned non-OK status for progress update")
		return
	}

	log.Debug().
		Str("phase", phase).
		Int("progress", progress).
		Bool("completed", completed).
		Msg("Progress reported to CMS")
}
