package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"

	"live_translation/internal/transcribe"
	"live_translation/internal/types"
)

type audioChunkRow struct {
	ID       int64
	StreamID int64
	StartMs  int64
	EndMs    int64
	FilePath string
}

type streamState struct {
	language string
}

func main() {
	loadDotEnv(".env")

	dbURI := os.Getenv("DATABASE_URI")
	if dbURI == "" {
		log.Fatal("DATABASE_URI is required")
	}

	db, err := sql.Open("postgres", dbURI)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}
	defer db.Close()

	// Default language if a stream does not specify one.
	defaultLanguage := os.Getenv("LANGUAGE")
	if defaultLanguage == "" {
		defaultLanguage = os.Getenv("DG_LANGUAGE")
	}
	if defaultLanguage == "" {
		defaultLanguage = "en"
	}

	baseCfg := deepgramConfigFromEnv()
	if baseCfg.Language == "" {
		baseCfg.Language = defaultLanguage
	}

	log.Printf("transcription worker starting defaultLanguage=%s", defaultLanguage)

	var lastID int64
	lastChunkByStream := make(map[int64]int64)
	states := make(map[int64]*streamState)

	// Initial catch-up in case the worker restarts after chunks already exist.
	if err := processNewChunks(db, baseCfg, defaultLanguage, states, lastChunkByStream, &lastID); err != nil {
		log.Printf("initial catch-up error: %v", err)
	}

	listener := pq.NewListener(dbURI, 2*time.Second, 30*time.Second, func(ev pq.ListenerEventType, err error) {
		if err != nil {
			log.Printf("pq listener event %v: %v", ev, err)
		}
	})
	if err := listener.Listen("audio_chunks"); err != nil {
		log.Fatalf("listen audio_chunks failed: %v", err)
	}

	finalizeTicker := time.NewTicker(30 * time.Second)
	defer finalizeTicker.Stop()

	for {
		select {
		case n := <-listener.Notify:
			if n == nil {
				continue
			}
			if err := handleNotification(context.Background(), db, baseCfg, defaultLanguage, states, lastChunkByStream, &lastID, n); err != nil {
				log.Printf("handle notification error: %v", err)
			}
		case <-finalizeTicker.C:
			if err := finalizeEndedStreams(db, states, lastChunkByStream); err != nil {
				log.Printf("finalizeEndedStreams error: %v", err)
			}
		case <-time.After(90 * time.Second):
			// Periodic reconnect check and keep-alive.
			go listener.Ping()
			// Also run a gap catch-up to be safe.
			if err := processNewChunks(db, baseCfg, defaultLanguage, states, lastChunkByStream, &lastID); err != nil {
				log.Printf("catch-up error: %v", err)
			}
		}
	}
}

func fetchNewAudioChunks(db *sql.DB, lastID int64) ([]audioChunkRow, error) {
	rows, err := db.Query(`
		SELECT id, stream_id, start_ms, end_ms, file_path
		FROM audio_chunks
		WHERE id > $1
		ORDER BY id ASC
	`, lastID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []audioChunkRow
	for rows.Next() {
		var r audioChunkRow
		if err := rows.Scan(&r.ID, &r.StreamID, &r.StartMs, &r.EndMs, &r.FilePath); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func fetchAudioChunkByID(db *sql.DB, id int64) (audioChunkRow, error) {
	var r audioChunkRow
	err := db.QueryRow(`
		SELECT id, stream_id, start_ms, end_ms, file_path
		FROM audio_chunks
		WHERE id = $1
	`, id).Scan(&r.ID, &r.StreamID, &r.StartMs, &r.EndMs, &r.FilePath)
	return r, err
}

func deepgramConfigFromEnv() transcribe.DeepgramConfig {
	apiKey := os.Getenv("DEEPGRAM_API_KEY")
	lang := os.Getenv("DG_LANGUAGE")
	model := os.Getenv("DG_MODEL")
	smart := os.Getenv("DG_SMART_FORMAT")

	return transcribe.DeepgramConfig{
		APIKey:       apiKey,
		Language:     lang,
		Model:        model,
		SmartFormat:  smart == "" || strings.ToLower(smart) == "true",
		Enabled:      apiKey != "",
		MaxBodyBytes: 0,
	}
}

// processNewChunks scans for unseen audio_chunks (id > lastID) and processes them.
func processNewChunks(db *sql.DB, baseCfg transcribe.DeepgramConfig, defaultLanguage string, states map[int64]*streamState, lastChunkByStream map[int64]int64, lastID *int64) error {
	rows, err := fetchNewAudioChunks(db, *lastID)
	if err != nil {
		return err
	}
	if len(rows) == 0 {
		return nil
	}

	enabled, err := loadEnabledStreams(db)
	if err != nil {
		log.Printf("error loading enabled streams: %v", err)
		enabled = nil
	}

	for _, row := range rows {
		if enabled != nil {
			if _, ok := enabled[row.StreamID]; !ok {
				if row.ID > *lastID {
					*lastID = row.ID
				}
				continue
			}
		}
		if err := processChunkRow(db, baseCfg, defaultLanguage, states, lastChunkByStream, row); err != nil {
			log.Printf("process chunk %d error: %v", row.ID, err)
		}
		if row.ID > *lastID {
			*lastID = row.ID
		}
	}
	return nil
}

func processChunkRow(db *sql.DB, baseCfg transcribe.DeepgramConfig, defaultLanguage string, states map[int64]*streamState, lastChunkByStream map[int64]int64, row audioChunkRow) error {
	lastChunkByStream[row.StreamID] = row.ID

	st, ok := states[row.StreamID]
	if !ok {
		st = &streamState{}
		st.language = loadStreamLanguage(db, row.StreamID, defaultLanguage)
		states[row.StreamID] = st
	}

	ch := types.Chunk{
		ID:        strconv.FormatInt(row.ID, 10),
		SessionID: "stream-" + strconv.FormatInt(row.StreamID, 10),
		StartMs:   row.StartMs,
		EndMs:     row.EndMs,
		URI:       row.FilePath,
		CreatedAt: time.Now().UTC(),
	}
	if baseCfg.Enabled && baseCfg.APIKey != "" {
		cfg := baseCfg
		cfg.Language = st.language

		dgResp, err := transcribe.TranscribeChunk(ch, cfg)
		if err != nil {
			log.Printf("deepgram error stream=%d chunk [%d-%d]: %v", row.StreamID, ch.StartMs, ch.EndMs, err)
		} else {
			txt := strings.TrimSpace(dgResp.TopTranscript())
			if txt != "" {
				if err := mergeChunk(db, row.StreamID, st.language, ch.StartMs, ch.EndMs, txt); err != nil {
					log.Printf("merge chunk error stream=%d [%d-%d]: %v", row.StreamID, ch.StartMs, ch.EndMs, err)
				}
			}
		}
	}
	return nil
}

func handleNotification(ctx context.Context, db *sql.DB, baseCfg transcribe.DeepgramConfig, defaultLanguage string, states map[int64]*streamState, lastChunkByStream map[int64]int64, lastID *int64, n *pq.Notification) error {
	var payload struct {
		ID       int64 `json:"id"`
		StreamID int64 `json:"stream_id"`
	}
	if err := json.Unmarshal([]byte(n.Extra), &payload); err != nil {
		return err
	}
	if payload.ID == 0 {
		return errors.New("notification missing id")
	}

	row, err := fetchAudioChunkByID(db, payload.ID)
	if err != nil {
		return err
	}

	// Optional guard for out-of-order notifications.
	if payload.ID <= *lastID {
		return nil
	}

	// Skip if transcription is disabled for this stream.
	enabled, err := isTranscriptionEnabled(ctx, db, row.StreamID)
	if err != nil {
		log.Printf("enable check error stream=%d: %v", row.StreamID, err)
	}
	if enabled {
		if err := processChunkRow(db, baseCfg, defaultLanguage, states, lastChunkByStream, row); err != nil {
			return err
		}
	}

	if row.ID > *lastID {
		*lastID = row.ID
	}
	return nil
}

// mergeChunk writes or replaces the transcript text for a single audio chunk range.
func mergeChunk(db *sql.DB, streamID int64, language string, startMs, endMs int64, text string) error {
	// Get or create transcript row.
	trID, _, err := getOrCreateTranscript(db, streamID, language)
	if err != nil {
		return err
	}

	// Bump version.
	var newVersion int64
	if err := db.QueryRow(
		`UPDATE transcripts SET version = COALESCE(version,0) + 1, updated_at = now()
	     WHERE id = $1 RETURNING version`,
		trID,
	).Scan(&newVersion); err != nil {
		return err
	}

	// Delete overlapping segments in [startMs, endMs].
	// Only delete segments whose *start* falls inside this window.
	// This preserves earlier-prefix text (e.g. [0-10000]) when a later
	// chunk only refines a suffix (e.g. [10000-20000]).
	if _, err := db.Exec(
		`DELETE FROM transcript_segments
         WHERE transcript_id = $1
           AND start_ms >= $2
           AND start_ms < $3`,
		trID, startMs, endMs,
	); err != nil {
		return err
	}

	// Insert new segment for this chunk as a single block for now.
	if _, err := db.Exec(
		`INSERT INTO transcript_segments (transcript_id, start_ms, end_ms, text, rev, is_stable, updated_at, created_at)
         VALUES ($1, $2, $3, $4, 1, false, now(), now())`,
		trID, startMs, endMs, text,
	); err != nil {
		return err
	}

	log.Printf("mergeChunk: stream=%d lang=%s version=%d [%d-%d] textLen=%d",
		streamID, language, newVersion, startMs, endMs, len(text))
	return nil
}

func getOrCreateTranscript(db *sql.DB, streamID int64, language string) (trID int64, version int64, err error) {
	// Try to load existing.
	err = db.QueryRow(
		`SELECT id, COALESCE(version,0) FROM transcripts WHERE stream_id = $1 AND language = $2 LIMIT 1`,
		streamID, language,
	).Scan(&trID, &version)
	if err == nil {
		return trID, version, nil
	}
	if err != sql.ErrNoRows {
		return 0, 0, err
	}

	// Insert new transcript row.
	err = db.QueryRow(
		`INSERT INTO transcripts (stream_id, language, version, is_final, created_at, updated_at)
         VALUES ($1, $2, 0, false, now(), now())
         RETURNING id, version`,
		streamID, language,
	).Scan(&trID, &version)
	return trID, version, err
}

// loadEnabledStreams returns a set of stream IDs that should be processed
// by the transcription worker. We include any streams with
// transcriptionEnabled=true so that if a stream has ended but still has
// pending audio_chunks, they will be processed and the transcript can be
// finalized.
func loadEnabledStreams(db *sql.DB) (map[int64]struct{}, error) {
	rows, err := db.Query(`SELECT id FROM live_streams WHERE transcription_enabled = true`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[int64]struct{})
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		m[id] = struct{}{}
	}
	return m, rows.Err()
}

// finalizeEndedStreams checks for streams that have transcription enabled
// but are marked as ended, and for which we've processed all known
// audio_chunks. It then marks their transcripts as final and disables
// transcription for those streams so they are no longer polled.
func finalizeEndedStreams(db *sql.DB, states map[int64]*streamState, lastChunkByStream map[int64]int64) error {
	for streamID, st := range states {
		lastChunkID, ok := lastChunkByStream[streamID]
		if !ok || lastChunkID == 0 {
			continue
		}

		var status string
		var enabled bool
		err := db.QueryRow(
			`SELECT status, transcription_enabled FROM live_streams WHERE id = $1`,
			streamID,
		).Scan(&status, &enabled)
		if err == sql.ErrNoRows {
			continue
		}
		if err != nil {
			return err
		}

		// Only consider streams that are ended and still transcription-enabled.
		if !enabled || status != "ended" {
			continue
		}

		// Check if there are any audio_chunks beyond the last processed ID.
		var hasMore bool
		if err := db.QueryRow(
			`SELECT EXISTS(SELECT 1 FROM audio_chunks WHERE stream_id = $1 AND id > $2)`,
			streamID, lastChunkID,
		).Scan(&hasMore); err != nil {
			return err
		}
		if hasMore {
			continue
		}

		// Mark transcripts for this stream as final.
		if _, err := db.Exec(
			`UPDATE transcripts
             SET is_final = true, updated_at = now()
             WHERE stream_id = $1`,
			streamID,
		); err != nil {
			return err
		}

		// Disable transcription for this stream so we stop polling it.
		if _, err := db.Exec(
			`UPDATE live_streams
             SET transcription_enabled = false, updated_at = now()
             WHERE id = $1`,
			streamID,
		); err != nil {
			return err
		}

		log.Printf("finalized transcription for stream=%d lang=%s (no remaining audio_chunks)", streamID, st.language)
	}
	return nil
}

// loadStreamLanguage resolves the language for a given stream, falling back to def if unset.
func loadStreamLanguage(db *sql.DB, streamID int64, def string) string {
	var lang sql.NullString
	err := db.QueryRow(`SELECT transcription_language FROM live_streams WHERE id = $1`, streamID).Scan(&lang)
	if err != nil {
		log.Printf("loadStreamLanguage: stream=%d err=%v (using default=%s)", streamID, err, def)
		return def
	}
	if lang.Valid {
		s := strings.TrimSpace(lang.String)
		if s != "" {
			return s
		}
	}
	return def
}

func isTranscriptionEnabled(ctx context.Context, db *sql.DB, streamID int64) (bool, error) {
	var enabled sql.NullBool
	err := db.QueryRowContext(ctx, `SELECT transcription_enabled FROM live_streams WHERE id = $1`, streamID).Scan(&enabled)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return enabled.Valid && enabled.Bool, nil
}

// loadDotEnv loads KEY=VALUE pairs from a simple .env file
// and sets them as environment variables if not already set.
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	var m map[string]string
	// if it's JSON, skip; we expect KEY=VALUE per line
	if json.Unmarshal(data, &m) == nil {
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
