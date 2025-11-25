package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
)

type Server struct {
	db *sql.DB
}

type TranscriptResponse struct {
	StreamID     int64               `json:"streamId"`
	TranscriptID int64               `json:"transcriptId"`
	Language     string              `json:"language"`
	Version      int64               `json:"version"`
	IsFinal      bool                `json:"isFinal"`
	Segments     []TranscriptSegment `json:"segments"`
}

// TranscriptLanguageMeta describes per-language availability for a stream.
type TranscriptLanguageMeta struct {
	Language string `json:"language"`
	Version  int64  `json:"version"`
	IsFinal  bool   `json:"isFinal"`
}

// TranscriptLanguagesResponse lists languages that have transcripts for a stream.
type TranscriptLanguagesResponse struct {
	StreamID  int64                    `json:"streamId"`
	Languages []TranscriptLanguageMeta `json:"languages"`
}

type TranscriptSegment struct {
	ID       int64  `json:"id"`
	StartMs  int64  `json:"startMs"`
	EndMs    int64  `json:"endMs"`
	Text     string `json:"text"`
	Rev      int64  `json:"rev"`
	IsStable bool   `json:"isStable"`
}

func NewServer() (*Server, error) {
	dsn := os.Getenv("DATABASE_URI")
	if dsn == "" {
		return nil, errors.New("DATABASE_URI is required")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &Server{db: db}, nil
}

func (s *Server) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// RegisterRoutes attaches HTTP handlers for transcript APIs.
func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("/transcription/", func(w http.ResponseWriter, r *http.Request) {
		// Routes:
		// GET /transcription/{streamId}/transcript
		// GET /transcription/{streamId}/stream
		// GET /transcription/{streamId}/languages
		path := strings.TrimPrefix(r.URL.Path, "/transcription/")
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) < 2 {
			http.NotFound(w, r)
			return
		}
		streamStr := parts[0]
		streamID, err := strconv.ParseInt(streamStr, 10, 64)
		if err != nil {
			http.Error(w, "invalid stream id", http.StatusBadRequest)
			return
		}
		switch parts[1] {
		case "transcript":
			if r.Method != http.MethodGet {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			s.handleGetTranscript(w, r, streamID)
		case "stream":
			if r.Method != http.MethodGet {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			s.handleSSE(w, r, streamID)
		case "languages":
			if r.Method != http.MethodGet {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			s.handleGetLanguages(w, r, streamID)
		default:
			http.NotFound(w, r)
		}
	})
}

func (s *Server) handleGetTranscript(w http.ResponseWriter, r *http.Request, streamID int64) {
	language := r.URL.Query().Get("language")
	if language == "" {
		language = "en"
	}

	trID, lang, version, isFinal, err := s.loadTranscriptMeta(streamID, language)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "transcript not found", http.StatusNotFound)
			return
		}
		log.Printf("getTranscript meta error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	segs, err := s.loadTranscriptSegments(trID)
	if err != nil {
		log.Printf("getTranscript segments error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	res := TranscriptResponse{
		StreamID:     streamID,
		TranscriptID: trID,
		Language:     lang,
		Version:      version,
		IsFinal:      isFinal,
		Segments:     segs,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

func (s *Server) loadTranscriptMeta(streamID int64, language string) (trID int64, lang string, version int64, isFinal bool, err error) {
	row := s.db.QueryRow(`
		SELECT id, language, version, COALESCE(is_final, false)
		FROM transcripts
		WHERE stream_id = $1 AND language = $2
		ORDER BY id
		LIMIT 1
	`, streamID, language)
	err = row.Scan(&trID, &lang, &version, &isFinal)
	return
}

func (s *Server) loadTranscriptSegments(trID int64) ([]TranscriptSegment, error) {
	rows, err := s.db.Query(`
		SELECT id, start_ms, end_ms, text, rev, COALESCE(is_stable, false)
		FROM transcript_segments
		WHERE transcript_id = $1
		ORDER BY start_ms
	`, trID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var segs []TranscriptSegment
	for rows.Next() {
		var seg TranscriptSegment
		if err := rows.Scan(&seg.ID, &seg.StartMs, &seg.EndMs, &seg.Text, &seg.Rev, &seg.IsStable); err != nil {
			return nil, err
		}
		segs = append(segs, seg)
	}
	return segs, rows.Err()
}

func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request, streamID int64) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	language := r.URL.Query().Get("language")
	if language == "" {
		language = "en"
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Initial snapshot
	trID, lang, version, isFinal, err := s.loadTranscriptMeta(streamID, language)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeSSE(w, "snapshot", `{"error":"transcript not found"}`)
			flusher.Flush()
			return
		}
		log.Printf("sse meta error: %v", err)
		writeSSE(w, "error", `{"error":"internal error"}`)
		flusher.Flush()
		return
	}

	segs, err := s.loadTranscriptSegments(trID)
	if err != nil {
		log.Printf("sse segments error: %v", err)
		writeSSE(w, "error", `{"error":"internal error"}`)
		flusher.Flush()
		return
	}

	initial := TranscriptResponse{
		StreamID:     streamID,
		TranscriptID: trID,
		Language:     lang,
		Version:      version,
		IsFinal:      isFinal,
		Segments:     segs,
	}
	if data, err := json.Marshal(initial); err == nil {
		writeSSE(w, "snapshot", string(data))
		flusher.Flush()
	}

	dsn := os.Getenv("DATABASE_URI")
	if dsn == "" {
		http.Error(w, "missing DATABASE_URI", http.StatusInternalServerError)
		return
	}

	listener := pq.NewListener(dsn, 2*time.Second, 30*time.Second, func(et pq.ListenerEventType, err error) {
		if err != nil {
			log.Printf("pq listener event %v: %v", et, err)
		}
	})
	defer listener.Close()
	if err := listener.Listen("transcripts_update"); err != nil {
		log.Printf("listen transcripts_update error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	lastVersion := version

	for {
		select {
		case <-r.Context().Done():
			return
		case n := <-listener.Notify:
			if n == nil {
				continue
			}
			var payload struct {
				StreamID int64  `json:"stream_id"`
				Language string `json:"language"`
				Version  int64  `json:"version"`
			}
			if err := json.Unmarshal([]byte(n.Extra), &payload); err != nil {
				log.Printf("sse notify parse error: %v", err)
				continue
			}
			if payload.StreamID != streamID {
				continue
			}
			if payload.Language != "" && payload.Language != language {
				continue
			}
			trID2, lang2, version2, isFinal2, err := s.loadTranscriptMeta(streamID, language)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					writeSSE(w, "snapshot", `{"error":"transcript not found"}`)
					flusher.Flush()
					return
				}
				log.Printf("sse notify meta error: %v", err)
				continue
			}
			if version2 == lastVersion {
				continue
			}
			segs2, err := s.loadTranscriptSegments(trID2)
			if err != nil {
				log.Printf("sse notify segments error: %v", err)
				continue
			}
			resp := TranscriptResponse{
				StreamID:     streamID,
				TranscriptID: trID2,
				Language:     lang2,
				Version:      version2,
				IsFinal:      isFinal2,
				Segments:     segs2,
			}
			if data, err := json.Marshal(resp); err == nil {
				writeSSE(w, "snapshot", string(data))
				flusher.Flush()
				lastVersion = version2
			}
		case <-ticker.C:
			writeSSE(w, "ping", `{"ts":`+strconv.FormatInt(time.Now().Unix(), 10)+`}`)
			flusher.Flush()
		}
	}
}

func writeSSE(w http.ResponseWriter, event, data string) {
	_, _ = w.Write([]byte("event: " + event + "\n"))
	_, _ = w.Write([]byte("data: " + data + "\n\n"))
}

// handleGetLanguages returns the list of languages for which transcripts exist
// for the given stream, along with basic metadata per language.
// GET /transcription/{streamId}/languages
func (s *Server) handleGetLanguages(w http.ResponseWriter, r *http.Request, streamID int64) {
	rows, err := s.db.Query(`
		SELECT language, COALESCE(version,0), COALESCE(is_final,false)
		FROM transcripts
		WHERE stream_id = $1
		ORDER BY language
	`, streamID)
	if err != nil {
		log.Printf("getLanguages query error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var langs []TranscriptLanguageMeta
	for rows.Next() {
		var m TranscriptLanguageMeta
		if err := rows.Scan(&m.Language, &m.Version, &m.IsFinal); err != nil {
			log.Printf("getLanguages scan error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		langs = append(langs, m)
	}
	if err := rows.Err(); err != nil {
		log.Printf("getLanguages rows error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	resp := TranscriptLanguagesResponse{
		StreamID:  streamID,
		Languages: langs,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("getLanguages encode error: %v", err)
	}
}
