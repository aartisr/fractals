package middleware

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "sync"
    "time"

    "github.com/nithyananda-tv/chat-service/internal/config"
    "go.uber.org/zap"
)

type ctxKey int

const identityKey ctxKey = iota

// Identity represents the authenticated user context
type Identity struct {
    Email     string
    FirstName string
    LastName  string
}

// GetIdentity retrieves the Identity from the context
func GetIdentity(ctx context.Context) (*Identity, bool) {
    v := ctx.Value(identityKey)
    if v == nil {
        return nil, false
    }
    id, ok := v.(*Identity)
    return id, ok
}

// simple cache for token validations
type cacheEntry struct {
    id   *Identity
    exp  time.Time
}

type validator struct {
    cfg    *config.Config
    log    *zap.Logger
    client *http.Client
    mu     sync.Mutex
    cache  map[string]cacheEntry
    ttl    time.Duration
}

func newValidator(cfg *config.Config, log *zap.Logger, ttl time.Duration) *validator {
    return &validator{
        cfg:    cfg,
        log:    log,
        client: &http.Client{Timeout: 5 * time.Second},
        cache:  make(map[string]cacheEntry),
        ttl:    ttl,
    }
}

// validateToken calls the auth service and returns the identity
func (v *validator) validateToken(token string) (*Identity, error) {
    // cache check
    now := time.Now()
    v.mu.Lock()
    if ent, ok := v.cache[token]; ok && now.Before(ent.exp) {
        v.mu.Unlock()
        return ent.id, nil
    }
    v.mu.Unlock()

    url := fmt.Sprintf("%s/auth/get-session?client_id=%s", strings.TrimRight(v.cfg.Auth.Base, "/"), v.cfg.Auth.ClientID)
    req, err := http.NewRequest("GET", url, nil)
    if err != nil {
        return nil, err
    }
    // Per api-1.json, cookieAuth is required with cookie name nandi_session
    req.Header.Set("Cookie", fmt.Sprintf("nandi_session=%s", token))

    resp, err := v.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unauthorized: status %d", resp.StatusCode)
    }

    var body struct {
        User *struct {
            Email     string `json:"email"`
            FirstName string `json:"first_name"`
            LastName  string `json:"last_name"`
        } `json:"user"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
        return nil, err
    }
    if body.User == nil || body.User.Email == "" {
        return nil, fmt.Errorf("unauthorized: missing user")
    }

    id := &Identity{Email: body.User.Email, FirstName: body.User.FirstName, LastName: body.User.LastName}

    // cache store
    v.mu.Lock()
    v.cache[token] = cacheEntry{ id: id, exp: time.Now().Add(v.ttl) }
    v.mu.Unlock()

    return id, nil
}

// AuthMiddleware enforces Authorization on requests and injects Identity into context
func AuthMiddleware(cfg *config.Config, log *zap.Logger, ttl time.Duration, next http.Handler) http.Handler {
    v := newValidator(cfg, log, ttl)
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := ""
        // Prefer Authorization header
        auth := r.Header.Get("Authorization")
        if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
            token = strings.TrimSpace(auth[7:])
        }
        // Fallback to query param `auth` (for SSE if headers cannot be set)
        if token == "" {
            token = r.URL.Query().Get("auth")
        }
        if token == "" {
            http.Error(w, "missing authorization", http.StatusUnauthorized)
            return
        }

        id, err := v.validateToken(token)
        if err != nil {
            // Do not leak token
            log.Warn("auth validation failed", zap.String("path", r.URL.Path), zap.Error(err))
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }

        ctx := context.WithValue(r.Context(), identityKey, id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

