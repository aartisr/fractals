package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	RTMP      RTMPConfig      `yaml:"rtmp"`
	Storage   StorageConfig   `yaml:"storage"`
	Qualities []QualityPreset `yaml:"qualities"`
	HLS       HLSConfig       `yaml:"hls"`
	DASH      DASHConfig      `yaml:"dash"`
	Server    ServerConfig    `yaml:"server"`
}

type RTMPConfig struct {
	Port      int `yaml:"port"`
	ChunkSize int `yaml:"chunk_size"`
}

type StorageConfig struct {
	Endpoint  string `yaml:"endpoint"`
	Bucket    string `yaml:"bucket"`
	AccessKey string `yaml:"access_key"`
	SecretKey string `yaml:"secret_key"`
	Region    string `yaml:"region"`
	PublicURL string `yaml:"public_url"`
}

type QualityPreset struct {
	Name         string `yaml:"name"`
	Width        int    `yaml:"width"`
	Height       int    `yaml:"height"`
	VideoBitrate string `yaml:"video_bitrate"`
	AudioBitrate string `yaml:"audio_bitrate"`
}

type HLSConfig struct {
	SegmentDuration int  `yaml:"segment_duration"`
	PlaylistLength  int  `yaml:"playlist_length"`
	DVREnabled      bool `yaml:"dvr_enabled"`
}

type DASHConfig struct {
	Enabled         bool `yaml:"enabled"`
	SegmentDuration int  `yaml:"segment_duration"`
}

type ServerConfig struct {
	TempDir  string `yaml:"temp_dir"`
	LogLevel string `yaml:"log_level"`
	APIPort  int    `yaml:"api_port"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	// Override with environment variables if set
	if endpoint := os.Getenv("R2_ENDPOINT"); endpoint != "" {
		cfg.Storage.Endpoint = endpoint
	}
	if bucket := os.Getenv("R2_BUCKET"); bucket != "" {
		cfg.Storage.Bucket = bucket
	}
	if accessKey := os.Getenv("R2_ACCESS_KEY"); accessKey != "" {
		cfg.Storage.AccessKey = accessKey
	}
	if secretKey := os.Getenv("R2_SECRET_KEY"); secretKey != "" {
		cfg.Storage.SecretKey = secretKey
	}
	if publicURL := os.Getenv("R2_PUBLIC_URL"); publicURL != "" {
		cfg.Storage.PublicURL = publicURL
	}
	if region := os.Getenv("R2_REGION"); region != "" {
		cfg.Storage.Region = region
	}

	// Override server settings from env
	if logLevel := os.Getenv("TRANSCODER_LOG_LEVEL"); logLevel != "" {
		cfg.Server.LogLevel = logLevel
	}
	if tempDir := os.Getenv("TRANSCODER_TEMP_DIR"); tempDir != "" {
		cfg.Server.TempDir = tempDir
	}

	return &cfg, nil
}
