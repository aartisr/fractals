package transcribe

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"live_translation/internal/types"
)

type DeepgramConfig struct {
	APIKey       string
	Language     string
	Model        string
	SmartFormat  bool
	Enabled      bool  // if false, noop
	MaxBodyBytes int64 // safety limit, 0 = unlimited
}

// TranscribeChunk sends a single chunk to Deepgram.
func TranscribeChunk(ch types.Chunk, cfg DeepgramConfig) (deepgramResponse, error) {
	var empty deepgramResponse
	if !cfg.Enabled || cfg.APIKey == "" {
		return empty, nil
	}
	if ch.URI == "" {
		return empty, nil
	}

	f, err := openChunkSource(ch.URI)
	if err != nil {
		return empty, err
	}
	defer f.Close()

	var body io.Reader = f
	if cfg.MaxBodyBytes > 0 {
		body = io.LimitReader(f, cfg.MaxBodyBytes)
	}

	resp, err := sendToDeepgram(body, ch.StartMs, ch.EndMs, cfg)
	if err != nil {
		log.Printf("deepgram chunk: request error: %v", err)
		return empty, err
	}
	return resp, nil
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

func sendToDeepgram(body io.Reader, startMs, endMs int64, cfg DeepgramConfig) (deepgramResponse, error) {
	var dgResp deepgramResponse

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

	url := "https://api.deepgram.com/v1/listen?smart_format=" + smart + "&language=" + language + "&model=" + model

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
	// Log full transcript for this chunk so you can see complete text.
	log.Printf("deepgram transcript [%d-%d]ms: %s", startMs, endMs, transcript)
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
	return s[:max] + "..."
}
