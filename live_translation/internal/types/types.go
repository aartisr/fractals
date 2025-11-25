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

func randID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
