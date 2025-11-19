package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"

	"live_translation/internal/chunker"
)

// Simple helper to inspect how chunking behaves on a single audio file.
// Usage:
//   cd live_translation
//   go run ./cmd/chunk_file path/to/audio.(mp3|wav|aac|...) [session-id]
func main() {
	if len(os.Args) < 2 {
		log.Fatalf("usage: %s <audio-file> [session-id]", os.Args[0])
	}
	input := os.Args[1]

	// Optional: session-id argument, but here we just log chunks.
	sessionID := "session-file"
	if len(os.Args) >= 3 {
		sessionID = os.Args[2]
	}

	// Silence tuning via env.
	silenceThresh := envInt("SILENCE_THRESHOLD", 800)
	minSilenceMs := envInt("MIN_SILENCE_MS", 700)
	minChunkMs := envInt("MIN_CHUNK_MS", 1500)

	log.Printf("analyzing %s (session=%s), SILENCE_THRESHOLD=%d, MIN_SILENCE_MS=%d, MIN_CHUNK_MS=%d",
		input, sessionID, silenceThresh, minSilenceMs, minChunkMs)

	cmd := exec.Command(
		ffmpegPath(),
		"-nostdin",
		"-i", input,
		"-vn",
		"-ac", "1",
		"-ar", "16000",
		"-f", "s16le",
		"-acodec", "pcm_s16le",
		"-",
	)
	cmd.Stderr = os.Stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatalf("failed to get ffmpeg stdout: %v", err)
	}
	if err := cmd.Start(); err != nil {
		log.Fatalf("failed to start ffmpeg: %v", err)
	}

	outDir := "chunks"
	if v := os.Getenv("CHUNK_DIR"); v != "" {
		outDir = v
	}

	cfg := chunker.Config{
		SampleRate:    16000,
		Channels:      1,
		FrameMs:       20,
		SilenceThresh: int16(silenceThresh),
		MinSilenceMs:  minSilenceMs,
		MinChunkMs:    minChunkMs,
		OutputDir:     outDir,
	}

	chunkIndex := 0
	err = chunker.Run(stdout, cfg, func(startMs, endMs int64, path string) {
		chunkIndex++
		dur := endMs - startMs
		fmt.Printf("chunk %02d [%6dms - %6dms] dur=%6dms file=%s\n", chunkIndex, startMs, endMs, dur, path)
	})
	if err != nil {
		log.Fatalf("chunker error: %v", err)
	}
	_ = cmd.Wait()
	log.Printf("done, emitted %d chunks", chunkIndex)
}

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func ffmpegPath() string {
	if p := os.Getenv("FFMPEG_PATH"); p != "" {
		return p
	}
	return "ffmpeg"
}
