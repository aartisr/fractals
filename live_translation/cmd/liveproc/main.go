package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "strconv"
    "strings"
    "time"

    "liveproc/internal/window"
    "liveproc/internal/types"
)

func main() {
    cfg := window.Config{
        MaxWindowMs:     envInt("MAX_WINDOW_MS", 300000), // 5 minutes
        StabilityWindows: envInt("STABILITY_WINDOWS", 2),
    }
    mgr := window.NewManager(cfg)

    mux := http.NewServeMux()

    mux.HandleFunc("/chunks", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }
        var req struct {
            SessionID string `json:"session_id"`
            StartMs   int64  `json:"start_ms"`
            EndMs     int64  `json:"end_ms"`
            URI       string `json:"uri"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "bad json", http.StatusBadRequest)
            return
        }
        if req.SessionID == "" || req.EndMs <= req.StartMs {
            http.Error(w, "invalid payload", http.StatusBadRequest)
            return
        }
        ch := types.NewChunk(req.SessionID, req.StartMs, req.EndMs, req.URI)
        job := mgr.AddChunk(ch)

        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]any{
            "chunk_id":   ch.ID,
            "window_job": job,
        })
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
        sessionID := parts[0]
        if len(parts) == 1 {
            st, ok := mgr.GetSession(sessionID)
            if !ok {
                http.NotFound(w, r)
                return
            }
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(st)
            return
        }
        if len(parts) == 2 && parts[1] == "windows" {
            ws := mgr.ListWindows(sessionID)
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(ws)
            return
        }
        http.NotFound(w, r)
    })

    addr := ":8088"
    if p := os.Getenv("PORT"); p != "" {
        addr = ":" + p
    }
    srv := &http.Server{Addr: addr, Handler: logMiddleware(mux)}
    log.Printf("liveproc listening on %s (window=%dms)\n", addr, cfg.MaxWindowMs)
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatal(err)
    }
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

func logMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        dur := time.Since(start)
        log.Printf("%s %s %s", r.Method, r.URL.Path, fmtDuration(dur))
    })
}

func fmtDuration(d time.Duration) string {
    return fmt.Sprintf("%dms", d.Milliseconds())
}

