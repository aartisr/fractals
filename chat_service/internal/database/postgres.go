package database

import (
	"context"
	"strings"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nithyananda-tv/chat-service/internal/config"
	"go.uber.org/zap"
)

type Pool struct {
    *pgxpool.Pool
    log *zap.Logger
}

func NewPool(ctx context.Context, cfg *config.Config, log *zap.Logger) (*Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URI: %w", err)
	}

	// Configure connection pool
	poolConfig.MaxConns = int32(cfg.Database.MaxConns)
	poolConfig.MinConns = int32(cfg.Database.MinConns)
	poolConfig.MaxConnLifetime = cfg.Database.MaxConnLifetime
	poolConfig.MaxConnIdleTime = cfg.Database.MaxConnIdleTime

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Pool{Pool: pool, log: log}, nil
}

// SaveMessage inserts a new message directly into the live_chat table
func (p *Pool) SaveMessage(ctx context.Context, msg *Message) error {
    query := `
        INSERT INTO live_chat (content, ecitizen_id, stream_id, type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `

    now := time.Now()
    msg.CreatedAt = now
    msg.UpdatedAt = now

    err := p.QueryRow(ctx, query,
        msg.Content,
        msg.ECitizenID,
        msg.StreamID,
        msg.Type,
        msg.CreatedAt,
        msg.UpdatedAt,
    ).Scan(&msg.ID)

    if err != nil {
        p.log.Error("Failed to save message",
            zap.Error(err),
            zap.Int("ecitizenId", msg.ECitizenID),
            zap.String("streamId", msg.StreamID),
        )
        return fmt.Errorf("failed to save message: %w", err)
    }

    p.log.Debug("Message saved successfully",
        zap.String("messageId", msg.ID),
        zap.Int("ecitizenId", msg.ECitizenID),
        zap.String("streamId", msg.StreamID),
    )

    return nil
}

// GetRecentMessages retrieves recent messages for a stream
func (p *Pool) GetRecentMessages(ctx context.Context, streamID string, limit int) ([]Message, error) {
    query := `
        SELECT lc.id, lc.content, lc.ecitizen_id, e.email, e.first_name, e.last_name,
               lc.stream_id, lc.type, lc.created_at, lc.updated_at, lc.deleted_at
        FROM live_chat lc
        JOIN ecitizen e ON e.id = lc.ecitizen_id
        WHERE lc.stream_id = $1 AND lc.deleted_at IS NULL
        ORDER BY lc.created_at DESC
        LIMIT $2
    `

    rows, err := p.Query(ctx, query, streamID, limit)
    if err != nil {
        return nil, fmt.Errorf("failed to query messages: %w", err)
    }
    defer rows.Close()

    messages := make([]Message, 0, limit)
    for rows.Next() {
        var msg Message
        err := rows.Scan(
            &msg.ID,
            &msg.Content,
            &msg.ECitizenID,
            &msg.Email,
            &msg.FirstName,
            &msg.LastName,
            &msg.StreamID,
            &msg.Type,
            &msg.CreatedAt,
            &msg.UpdatedAt,
            &msg.DeletedAt,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan message: %w", err)
        }
        messages = append(messages, msg)
    }

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating messages: %w", err)
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

// SoftDeleteMessage marks a message as deleted (for moderation)
func (p *Pool) SoftDeleteMessage(ctx context.Context, messageID string) error {
    query := `
        UPDATE live_chat
        SET deleted_at = $1, updated_at = $1
        WHERE id = $2 AND deleted_at IS NULL
    `

	now := time.Now()
	result, err := p.Exec(ctx, query, now, messageID)
	if err != nil {
		return fmt.Errorf("failed to soft delete message: %w", err)
	}

	if result.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	p.log.Info("Message soft deleted",
		zap.String("messageId", messageID),
		zap.Time("deletedAt", now),
	)

	return nil
}

// HealthCheck verifies database connectivity
func (p *Pool) HealthCheck(ctx context.Context) error {
    return p.Ping(ctx)
}

// GetOrCreateECitizen returns the ecitizen id for an email, creating a row if needed
func (p *Pool) GetOrCreateECitizen(ctx context.Context, email, firstName, lastName string) (int, error) {
    // compute display_name as "First Last" (trim spaces)
    displayName := strings.TrimSpace(strings.TrimSpace(firstName) + " " + strings.TrimSpace(lastName))
    query := `
        INSERT INTO ecitizen (email, first_name, last_name, display_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            display_name = EXCLUDED.display_name
        RETURNING id
    `
    var id int
    if err := p.QueryRow(ctx, query, email, firstName, lastName, displayName).Scan(&id); err != nil {
        return 0, fmt.Errorf("failed to upsert ecitizen: %w", err)
    }
    return id, nil
}
