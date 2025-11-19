package window

import (
    "sort"
    "sync"

    "live_translation/internal/types"
)

// Config controls sliding window behavior.
type Config struct {
    // MaxWindowMs is the target maximum duration of a window.
    MaxWindowMs      int // e.g., 60000 for 60 seconds

    StabilityWindows int // reserved for later TTS freeze policy

    // AnchorOverlapMs controls how much overlap we keep when we "shift"
    // the window anchor forward after warmup. If zero, defaults to
    // MaxWindowMs / 2.
    AnchorOverlapMs int

    // AnchorStepMs controls how far the anchor must move forward before
    // we adopt a new anchor. If zero, defaults to MaxWindowMs.
    AnchorStepMs int
}

type Manager struct {
    mu       sync.Mutex
    cfg      Config
    sessions map[string]*session
}

type session struct {
    id            string
    chunks        []types.Chunk
    windows       []types.WindowJob
    lastWindowEnd int64

    // anchorStartMs is the current "base" of the anchored window after warmup.
    anchorStartMs int64
}

func NewManager(cfg Config) *Manager {
    return &Manager{
        cfg:      cfg,
        sessions: make(map[string]*session),
    }
}

// AddChunk records a new chunk and computes the current sliding window job.
// Window selection strategy (per session):
//   - Warmup: while total duration <= MaxWindowMs, use [0, end].
//   - After warmup: use an anchored window with overlap, roughly:
//       [anchorStartMs, end], where anchorStartMs advances forward in
//       AnchorStepMs increments, keeping ~AnchorOverlapMs overlap.
func (m *Manager) AddChunk(ch types.Chunk) types.WindowJob {
    m.mu.Lock()
    defer m.mu.Unlock()

    s := m.getOrCreate(ch.SessionID)
    s.chunks = append(s.chunks, ch)
    // Keep chunks sorted by start time for deterministic windows.
    sort.Slice(s.chunks, func(i, j int) bool { return s.chunks[i].StartMs < s.chunks[j].StartMs })

    windowEnd := ch.EndMs

    maxWin := int64(m.cfg.MaxWindowMs)
    if maxWin <= 0 {
        maxWin = 30000 // sane default if misconfigured
    }
    overlap := int64(m.cfg.AnchorOverlapMs)
    if overlap <= 0 {
        overlap = maxWin / 2
    }
    step := int64(m.cfg.AnchorStepMs)
    if step <= 0 {
        step = maxWin
    }

    var windowStart int64

    // Warmup phase: while the stream is shorter than max window, keep [0, end].
    if windowEnd <= maxWin {
        windowStart = 0
        if s.anchorStartMs == 0 {
            s.anchorStartMs = 0
        }
    } else {
        // Anchored phase: keep an anchor with overlap and shift it forward
        // gradually as end moves.
        if s.anchorStartMs == 0 && s.lastWindowEnd <= maxWin {
            s.anchorStartMs = 0
        }
        newStart := windowEnd - maxWin + overlap
        if newStart < 0 {
            newStart = 0
        }
        if newStart-s.anchorStartMs >= step {
            s.anchorStartMs = newStart
        }
        windowStart = s.anchorStartMs
    }

    // Select chunks that overlap the window [windowStart, windowEnd].
    var chunkIDs []string
    for _, c := range s.chunks {
        if overlaps(windowStart, windowEnd, c.StartMs, c.EndMs) {
            chunkIDs = append(chunkIDs, c.ID)
        }
    }

    job := types.WindowJob{
        SessionID:      ch.SessionID,
        WindowStartMs:  windowStart,
        WindowEndMs:    windowEnd,
        ChunkIDs:       chunkIDs,
        IdempotencyKey: idKey(ch.SessionID, windowEnd),
    }
    s.windows = append(s.windows, job)
    s.lastWindowEnd = max64(s.lastWindowEnd, windowEnd)
    return job
}

func (m *Manager) ListSessions() []types.SessionState {
    m.mu.Lock()
    defer m.mu.Unlock()
    out := make([]types.SessionState, 0, len(m.sessions))
    for _, s := range m.sessions {
        out = append(out, types.SessionState{
            SessionID: s.id,
            Chunks:    append([]types.Chunk(nil), s.chunks...),
            Windows:   append([]types.WindowJob(nil), s.windows...),
        })
    }
    return out
}

func (m *Manager) GetSession(sessionID string) (types.SessionState, bool) {
    m.mu.Lock()
    defer m.mu.Unlock()
    s, ok := m.sessions[sessionID]
    if !ok {
        return types.SessionState{}, false
    }
    return types.SessionState{
        SessionID: s.id,
        Chunks:    append([]types.Chunk(nil), s.chunks...),
        Windows:   append([]types.WindowJob(nil), s.windows...),
    }, true
}

func (m *Manager) ListWindows(sessionID string) []types.WindowJob {
    m.mu.Lock()
    defer m.mu.Unlock()
    s, ok := m.sessions[sessionID]
    if !ok {
        return nil
    }
    return append([]types.WindowJob(nil), s.windows...)
}

func (m *Manager) getOrCreate(id string) *session {
    s, ok := m.sessions[id]
    if ok {
        return s
    }
    s = &session{id: id}
    m.sessions[id] = s
    return s
}

func overlaps(aStart, aEnd, bStart, bEnd int64) bool {
    // intervals overlap if they share any time; inclusive of endpoints
    return aStart <= bEnd && bStart <= aEnd
}

func idKey(sessionID string, windowEnd int64) string {
    return sessionID + ":" + itoa(windowEnd)
}

func itoa(n int64) string {
    if n == 0 {
        return "0"
    }
    neg := n < 0
    if neg {
        n = -n
    }
    var buf [20]byte
    i := len(buf)
    for n > 0 {
        i--
        buf[i] = byte('0' + n%10)
        n /= 10
    }
    if neg {
        i--
        buf[i] = '-'
    }
    return string(buf[i:])
}

func max64(a, b int64) int64 {
    if a > b {
        return a
    }
    return b
}
