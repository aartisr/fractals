package pubsub

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type PostgresClient struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

func NewPostgresClient(pool *pgxpool.Pool, log *zap.Logger) *PostgresClient {
	return &PostgresClient{
		pool: pool,
		log:  log,
	}
}

// Subscribe listens to a PostgreSQL channel and calls handler for each notification
func (p *PostgresClient) Subscribe(ctx context.Context, channel string, handler func(context.Context, string, string) error) error {
	// Acquire a dedicated connection for LISTEN
	conn, err := p.pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	// Start listening
	_, err = conn.Exec(ctx, fmt.Sprintf("LISTEN %s", channel))
	if err != nil {
		return fmt.Errorf("failed to listen to channel: %w", err)
	}

	p.log.Info("Subscribed to PostgreSQL channel", zap.String("channel", channel))

	// Listen for notifications
	for {
		select {
		case <-ctx.Done():
			p.log.Info("Stopping PostgreSQL subscription", zap.String("channel", channel))
			return ctx.Err()
		default:
			notification, err := conn.Conn().WaitForNotification(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return ctx.Err()
				}
				p.log.Error("Failed to wait for notification", zap.Error(err))
				return err
			}

			p.log.Debug("Received notification from PostgreSQL",
				zap.String("channel", notification.Channel),
				zap.Int("payloadSize", len(notification.Payload)),
			)

			// Handle notification (non-blocking)
			if err := handler(ctx, notification.Channel, notification.Payload); err != nil {
				p.log.Error("Failed to handle notification",
					zap.Error(err),
					zap.String("channel", notification.Channel),
				)
				// Continue processing other notifications
			}
		}
	}
}

// Publish sends a message to a PostgreSQL channel using NOTIFY
func (p *PostgresClient) Publish(ctx context.Context, channel string, payload string) error {
	query := fmt.Sprintf("NOTIFY %s, '%s'", channel, payload)
	_, err := p.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to notify channel: %w", err)
	}

	p.log.Debug("Published notification to PostgreSQL",
		zap.String("channel", channel),
		zap.Int("payloadSize", len(payload)),
	)

	return nil
}

// Close closes the PostgreSQL client (connection pool managed externally)
func (p *PostgresClient) Close() error {
	// Pool is managed by the database package, so nothing to close here
	return nil
}
