package types

import (
    "crypto/rand"
    "encoding/hex"
    "time"
)

type Chunk struct {
    ID        string    `json:"id"`
    SessionID string    `json:"session_id"`
    StartMs   int64     `json:"start_ms"`
    EndMs     int64     `json:"end_ms"`
    URI       string    `json:"uri"`
    CreatedAt time.Time `json:"created_at"`
}

func NewChunk(sessionID string, startMs, endMs int64, uri string) Chunk {
    return Chunk{
        ID:        randID(),
        SessionID: sessionID,
        StartMs:   startMs,
        EndMs:     endMs,
        URI:       uri,
        CreatedAt: time.Now().UTC(),
    }
}

type WindowJob struct {
    SessionID      string   `json:"session_id"`
    WindowStartMs  int64    `json:"window_start_ms"`
    WindowEndMs    int64    `json:"window_end_ms"`
    ChunkIDs       []string `json:"chunk_ids"`
    IdempotencyKey string   `json:"idempotency_key"`
}

type SessionState struct {
    SessionID string      `json:"session_id"`
    Chunks    []Chunk     `json:"chunks"`
    Windows   []WindowJob `json:"windows"`
}

func randID() string {
    b := make([]byte, 16)
    _, _ = rand.Read(b)
    return hex.EncodeToString(b)
}

