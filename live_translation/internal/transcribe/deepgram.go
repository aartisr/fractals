package transcribe

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"live_translation/internal/chunker"
	"live_translation/internal/types"
)

type DeepgramConfig struct {
	APIKey       string
	Language     string
	Model        string
	SmartFormat  bool
	KeepWindows  bool   // keep window wav files on disk if true
	WindowsDir   string // directory for window wavs
	Enabled      bool   // if false, noop
	MaxBodyBytes int64  // safety limit, 0 = unlimited

	// MinWindowStepMs optionally rate-limits how often a new window
	// should be sent (enforced by caller).
	MinWindowStepMs int64
}

// TranscribeWindow builds a WAV for the given window and sends it to Deepgram.
// It logs the top transcript line for quick inspection.
func TranscribeWindow(job types.WindowJob, allChunks []types.Chunk, cfg DeepgramConfig) {
	if !cfg.Enabled || cfg.APIKey == "" {
		return
	}

	// Collect chunk paths for this window in time order.
	idSet := make(map[string]struct{}, len(job.ChunkIDs))
	for _, id := range job.ChunkIDs {
		idSet[id] = struct{}{}
	}
	var paths []string
	for _, ch := range allChunks {
		if _, ok := idSet[ch.ID]; !ok {
			continue
		}
		if ch.URI == "" {
			continue
		}
		paths = append(paths, ch.URI)
	}
	if len(paths) == 0 {
		return
	}

	winDir := cfg.WindowsDir
	if winDir == "" {
		winDir = "chunks/windows"
	}
	if err := os.MkdirAll(winDir, 0o755); err != nil {
		log.Printf("deepgram: mkdir windows dir error: %v", err)
		return
	}

	windowPath := filepath.Join(winDir, fmt.Sprintf("window_%s_%d.wav", safeName(job.SessionID), job.WindowEndMs))

	if err := buildWindowWav(windowPath, paths); err != nil {
		log.Printf("deepgram: build window wav error: %v", err)
		return
	}
	if !cfg.KeepWindows {
		defer os.Remove(windowPath)
	}

	if err := sendToDeepgram(windowPath, job, cfg); err != nil {
		log.Printf("deepgram: request error: %v", err)
	}
}

func buildWindowWav(outPath string, chunkPaths []string) error {
	w, err := chunker.NewWavWriterInternal(outPath, 16000, 1, 16)
	if err != nil {
		return err
	}
	defer w.Close()

	buf := make([]byte, 4096)
	for _, p := range chunkPaths {
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		// Skip WAV header (44 bytes).
		if _, err := f.Seek(44, io.SeekStart); err != nil {
			_ = f.Close()
			return err
		}
		for {
			n, err := f.Read(buf)
			if n > 0 {
				if _, werr := w.Write(buf[:n]); werr != nil {
					_ = f.Close()
					return werr
				}
			}
			if err == io.EOF {
				break
			}
			if err != nil {
				_ = f.Close()
				return err
			}
		}
		_ = f.Close()
	}
	return nil
}

func sendToDeepgram(path string, job types.WindowJob, cfg DeepgramConfig) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	var body io.Reader = f
	if cfg.MaxBodyBytes > 0 {
		body = io.LimitReader(f, cfg.MaxBodyBytes)
	}

	language := cfg.Language
	if language == "" {
		language = "ta"
	}
	model := cfg.Model
	if model == "" {
		model = "whisper-large"
	}

	smart := "false"
	if cfg.SmartFormat {
		smart = "true"
	}

	url := fmt.Sprintf("https://api.deepgram.com/v1/listen?smart_format=%s&language=%s&model=%s",
		smart, language, model)

	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Token "+cfg.APIKey)
	req.Header.Set("Content-Type", "audio/wav")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("deepgram status %d: %s", resp.StatusCode, truncate(string(b), 512))
	}

	var dgResp deepgramResponse
	if err := json.Unmarshal(b, &dgResp); err != nil {
		// Log raw body for debugging if JSON parsing fails.
		log.Printf("deepgram: unmarshal error: %v body=%s", err, truncate(string(b), 512))
		return nil
	}

	transcript := dgResp.TopTranscript()
	// Log full transcript for this window so you can see complete text.
	log.Printf("deepgram window [%d-%d]ms: %s", job.WindowStartMs, job.WindowEndMs, transcript)
	return nil
}

type deepgramResponse struct {
	Results struct {
		Channels []struct {
			Alternatives []struct {
				Transcript string `json:"transcript"`
			} `json:"alternatives"`
		} `json:"channels"`
	} `json:"results"`
}

func (r deepgramResponse) TopTranscript() string {
	if len(r.Results.Channels) == 0 {
		return ""
	}
	ch := r.Results.Channels[0]
	if len(ch.Alternatives) == 0 {
		return ""
	}
	return ch.Alternatives[0].Transcript
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}

func safeName(s string) string {
	var buf bytes.Buffer
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'a' && c <= 'z') ||
			(c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') ||
			c == '-' || c == '_' {
			buf.WriteByte(c)
		} else {
			buf.WriteByte('_')
		}
	}
	out := buf.String()
	if out == "" {
		return "session"
	}
	return out
}
