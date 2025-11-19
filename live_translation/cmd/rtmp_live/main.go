package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "os/exec"
    "strconv"
    "strings"

    "live_translation/internal/chunker"
    "live_translation/internal/transcribe"
    "live_translation/internal/types"
    "live_translation/internal/window"
)

func main() {
    loadDotEnv(".env")

    rtmpURL := os.Getenv("RTMP_URL")
    if rtmpURL == "" {
        log.Fatal("RTMP_URL is required")
    }
    sessionID := os.Getenv("SESSION_ID")
    if sessionID == "" {
        sessionID = "session-1"
    }

    cfg := window.Config{
        MaxWindowMs:      envInt("MAX_WINDOW_MS", 30000), // default 30 seconds for STT window
        StabilityWindows: envInt("STABILITY_WINDOWS", 2),
        AnchorOverlapMs:  envInt("WINDOW_ANCHOR_OVERLAP_MS", 0),
        AnchorStepMs:     envInt("WINDOW_ANCHOR_STEP_MS", 0),
    }
    mgr := window.NewManager(cfg)

    // Start HTTP server for inspection.
    mux := http.NewServeMux()
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ok"))
    })

    mux.HandleFunc("/sessions", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        list := mgr.ListSessions()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(list)
    })

    mux.HandleFunc("/sessions/", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/sessions/"), "/")
        if len(parts) == 0 || parts[0] == "" {
            http.NotFound(w, r)
            return
        }
        sid := parts[0]
        if len(parts) == 1 {
            st, ok := mgr.GetSession(sid)
            if !ok {
                http.NotFound(w, r)
                return
            }
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(st)
            return
        }
        if len(parts) == 2 && parts[1] == "windows" {
            ws := mgr.ListWindows(sid)
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(ws)
            return
        }
        http.NotFound(w, r)
    })

    addr := ":8089"
    if p := os.Getenv("PORT"); p != "" {
        addr = ":" + p
    }
    go func() {
        log.Printf("http listening on %s (window=%dms)\n", addr, cfg.MaxWindowMs)
        if err := http.ListenAndServe(addr, mux); err != nil {
            log.Fatalf("http server error: %v", err)
        }
    }()

    // Spawn ffmpeg to pull RTMP and output s16le audio.
    cmd := exec.Command(
        ffmpegPath(),
        "-nostdin",
        "-i", rtmpURL,
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
    log.Printf("ffmpeg started for RTMP_URL=%s", rtmpURL)

    // Configure chunker.
    chunkDir := os.Getenv("CHUNK_DIR")
    if chunkDir == "" {
        chunkDir = "chunks"
    }

    chCfg := chunker.Config{
        SampleRate:    16000,
        Channels:      1,
        FrameMs:       20,
        SilenceThresh: int16(envInt("SILENCE_THRESHOLD", 800)),
        MinSilenceMs:  envInt("MIN_SILENCE_MS", 700),
        MinChunkMs:    envInt("MIN_CHUNK_MS", 1500),
        OutputDir:     chunkDir,
    }

    // Run chunker: for each chunk, record it in the window manager.
    dgCfg := deepgramConfigFromEnv()
    var lastSttEndMs int64

    err = chunker.Run(stdout, chCfg, func(startMs, endMs int64, path string) {
        ch := types.NewChunk(sessionID, startMs, endMs, path)
        job := mgr.AddChunk(ch)
        log.Printf("chunk %s [%d-%d]ms file=%s -> window [%d-%d]ms chunks=%d key=%s",
            ch.ID, ch.StartMs, ch.EndMs, ch.URI,
            job.WindowStartMs, job.WindowEndMs,
            len(job.ChunkIDs), job.IdempotencyKey,
        )

        // Fire-and-forget transcription for this window, with simple rate limiting.
        if dgCfg.Enabled && dgCfg.APIKey != "" {
            step := dgCfg.MinWindowStepMs
            if step < 0 {
                step = 0
            }
            if step == 0 || job.WindowEndMs-lastSttEndMs >= step {
                lastSttEndMs = job.WindowEndMs
                go func(j types.WindowJob) {
                    st, ok := mgr.GetSession(sessionID)
                    if !ok {
                        return
                    }
                    transcribe.TranscribeWindow(j, st.Chunks, dgCfg)
                }(job)
            }
        }
    })
    if err != nil {
        log.Printf("chunker error: %v", err)
    }

    _ = cmd.Wait()
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

// ffmpegPath returns the executable path for ffmpeg, allowing override via FFMPEG_PATH.
func ffmpegPath() string {
    if p := os.Getenv("FFMPEG_PATH"); p != "" {
        return p
    }
    return "ffmpeg"
}

// loadDotEnv loads KEY=VALUE pairs from a simple .env file
// and sets them as environment variables if not already set.
func loadDotEnv(path string) {
    data, err := os.ReadFile(path)
    if err != nil {
        return
    }
    lines := strings.Split(string(data), "\n")
    for _, line := range lines {
        line = strings.TrimSpace(line)
        if line == "" || strings.HasPrefix(line, "#") {
            continue
        }
        parts := strings.SplitN(line, "=", 2)
        if len(parts) != 2 {
            continue
        }
        key := strings.TrimSpace(parts[0])
        val := strings.TrimSpace(parts[1])
        if key == "" {
            continue
        }
        if _, exists := os.LookupEnv(key); !exists {
            _ = os.Setenv(key, val)
        }
    }
}

func deepgramConfigFromEnv() transcribe.DeepgramConfig {
    apiKey := os.Getenv("DEEPGRAM_API_KEY")
    lang := os.Getenv("DG_LANGUAGE")
    model := os.Getenv("DG_MODEL")
    smart := os.Getenv("DG_SMART_FORMAT")
    keep := os.Getenv("DG_KEEP_WINDOWS")
    winDir := os.Getenv("DG_WINDOWS_DIR")
    minStepMs := envInt("DG_MIN_WINDOW_STEP_MS", 10000) // default: at most one STT per 10s

    return transcribe.DeepgramConfig{
        APIKey:          apiKey,
        Language:        lang,
        Model:           model,
        SmartFormat:     smart == "" || strings.ToLower(smart) == "true",
        KeepWindows:     strings.ToLower(keep) == "true",
        WindowsDir:      winDir,
        Enabled:         apiKey != "",
        MaxBodyBytes:    0,
        MinWindowStepMs: int64(minStepMs),
    }
}
