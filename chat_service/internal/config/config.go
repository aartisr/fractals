package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
    Database struct {
        URI             string        `yaml:"-"` // From env var
        MaxConns        int           `yaml:"max_conns"`
        MinConns        int           `yaml:"min_conns"`
        MaxConnLifetime time.Duration `yaml:"max_conn_lifetime"`
        MaxConnIdleTime time.Duration `yaml:"max_conn_idle_time"`
    } `yaml:"database"`

	RateLimit struct {
		MessagesPerWindow int `yaml:"messages_per_window"`
		WindowSeconds     int `yaml:"window_seconds"`
	} `yaml:"rate_limit"`

    Chat struct {
        MaxMessageLength int `yaml:"max_message_length"`
        HistoryMaxLength int `yaml:"history_max_length"`
    } `yaml:"chat"`

    LogLevel string `yaml:"log_level"`

    // Loaded from environment
    Auth struct {
        Base     string `yaml:"-"`
        ClientID string `yaml:"-"`
    } `yaml:"-"`
}

func Load() (*Config, error) {
	cfg := &Config{}

	// Load from config.yaml
	configFile := os.Getenv("CONFIG_FILE")
	if configFile == "" {
		configFile = "config.yaml"
	}

	data, err := os.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Load sensitive values from environment variables
	cfg.Database.URI = os.Getenv("DATABASE_URI")
	if cfg.Database.URI == "" {
		return nil, fmt.Errorf("DATABASE_URI environment variable is required")
	}

    // Override log level from env if set
    if logLevel := os.Getenv("CHAT_SERVICE_LOG_LEVEL"); logLevel != "" {
        cfg.LogLevel = logLevel
    }

    // Auth config from env
    cfg.Auth.Base = os.Getenv("AUTH_BASE")
    cfg.Auth.ClientID = os.Getenv("AUTH_CLIENT_ID")
    if cfg.Auth.Base == "" || cfg.Auth.ClientID == "" {
        return nil, fmt.Errorf("AUTH_BASE and AUTH_CLIENT_ID environment variables are required")
    }

    return cfg, nil
}
