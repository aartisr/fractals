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
	"strings"
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

// TranscribeWindow builds a WAV for the given window, sends it to Deepgram,
// and returns the parsed response. It still writes a temp window WAV on disk.
func TranscribeWindow(job types.WindowJob, allChunks []types.Chunk, cfg DeepgramConfig) (deepgramResponse, error) {
	var empty deepgramResponse
	if !cfg.Enabled || cfg.APIKey == "" {
		return empty, nil
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
		return empty, nil
	}

	winDir := cfg.WindowsDir
	if winDir == "" {
		winDir = "chunks/windows"
	}
	if err := os.MkdirAll(winDir, 0o755); err != nil {
		log.Printf("deepgram: mkdir windows dir error: %v", err)
		return empty, err
	}

	windowPath := filepath.Join(winDir, fmt.Sprintf("window_%s_%d.wav", safeName(job.SessionID), job.WindowEndMs))

	if err := buildWindowWav(windowPath, paths); err != nil {
		log.Printf("deepgram: build window wav error: %v", err)
		return empty, err
	}
	if !cfg.KeepWindows {
		defer os.Remove(windowPath)
	}

	resp, err := sendToDeepgram(windowPath, job, cfg)
	if err != nil {
		log.Printf("deepgram: request error: %v", err)
		return empty, err
	}
	return resp, nil
}

func buildWindowWav(outPath string, chunkPaths []string) error {
	w, err := chunker.NewWavWriterInternal(outPath, 16000, 1, 16)
	if err != nil {
		return err
	}
	defer w.Close()

	buf := make([]byte, 4096)
	for _, p := range chunkPaths {
		f, err := openChunkSource(p)
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

// openChunkSource opens a chunk path either from local disk or via HTTP based on configuration.
// - If ANALYSIS_BASE_URL is set and p is not an absolute/relative path, p is treated as a key under that base URL.
// - If p starts with http/https, it is used as-is.
// - Otherwise, p is treated as a local filesystem path.
func openChunkSource(p string) (*os.File, error) {
	// HTTP URL explicitly provided
	if strings.HasPrefix(p, "http://") || strings.HasPrefix(p, "https://") {
		resp, err := http.Get(p)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			return nil, fmt.Errorf("failed to fetch chunk %s: %s", p, string(body))
		}
		// Stream response into a temp file so we can Seek.
		tmp, err := os.CreateTemp("", "chunk-*.wav")
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(tmp, resp.Body); err != nil {
			_ = tmp.Close()
			return nil, err
		}
		if _, err := tmp.Seek(0, io.SeekStart); err != nil {
			_ = tmp.Close()
			return nil, err
		}
		return tmp, nil
	}

	base := os.Getenv("ANALYSIS_BASE_URL")
	if base != "" && !strings.HasPrefix(p, "/") && !strings.HasPrefix(p, ".") {
		url := strings.TrimRight(base, "/") + "/" + strings.TrimLeft(p, "/")
		resp, err := http.Get(url)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
			return nil, fmt.Errorf("failed to fetch chunk %s: %s", url, string(body))
		}
		tmp, err := os.CreateTemp("", "chunk-*.wav")
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(tmp, resp.Body); err != nil {
			_ = tmp.Close()
			return nil, err
		}
		if _, err := tmp.Seek(0, io.SeekStart); err != nil {
			_ = tmp.Close()
			return nil, err
		}
		return tmp, nil
	}

	// Fallback: treat as local path.
	return os.Open(p)
}

func sendToDeepgram(path string, job types.WindowJob, cfg DeepgramConfig) (deepgramResponse, error) {
	var dgResp deepgramResponse
	f, err := os.Open(path)
	if err != nil {
		return dgResp, err
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
		return dgResp, err
	}
	req.Header.Set("Authorization", "Token "+cfg.APIKey)
	req.Header.Set("Content-Type", "audio/wav")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return dgResp, err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return dgResp, err
	}
	if resp.StatusCode >= 300 {
		return dgResp, fmt.Errorf("deepgram status %d: %s", resp.StatusCode, truncate(string(b), 512))
	}

	if err := json.Unmarshal(b, &dgResp); err != nil {
		// Log raw body for debugging if JSON parsing fails.
		log.Printf("deepgram: unmarshal error: %v body=%s", err, truncate(string(b), 512))
		return dgResp, nil
	}

	transcript := dgResp.TopTranscript()
	// Log full transcript for this window so you can see complete text.
	log.Printf("deepgram window [%d-%d]ms: %s", job.WindowStartMs, job.WindowEndMs, transcript)
	return dgResp, nil
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
