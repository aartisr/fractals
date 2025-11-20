package storage

import (
	"bytes"
	"context"
	"io"
	"live_transcoder/pkg/config"
	"os"
	"path/filepath"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/rs/zerolog/log"
)

type R2Client struct {
	client    *s3.Client
	bucket    string
	publicURL string
	wg        sync.WaitGroup
}

func NewR2Client(ctx context.Context, cfg *config.Config) (*R2Client, error) {
	return NewR2ClientWithParams(ctx, cfg.Storage.Endpoint, cfg.Storage.Region, cfg.Storage.Bucket, cfg.Storage.AccessKey, cfg.Storage.SecretKey, cfg.Storage.PublicURL)
}

func NewR2ClientWithParams(ctx context.Context, endpoint, region, bucket, accessKey, secretKey, publicURL string) (*R2Client, error) {
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               endpoint,
			HostnameImmutable: true,
		}, nil
	})

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithEndpointResolverWithOptions(resolver),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKey,
			secretKey,
			"",
		)),
		awsconfig.WithRegion(region),
	)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(awsCfg)

	return &R2Client{
		client:    client,
		bucket:    bucket,
		publicURL: publicURL,
	}, nil
}

func (r *R2Client) UploadFile(ctx context.Context, key string, body io.Reader, contentType string) error {
	return r.uploadFileWithOptions(ctx, key, body, contentType, nil)
}

func (r *R2Client) UploadPlaylist(ctx context.Context, key string, body io.Reader, contentType string) error {
	// Playlists need no-cache headers to prevent stale content
	cacheControl := "no-cache, no-store, must-revalidate"
	return r.uploadFileWithOptions(ctx, key, body, contentType, &cacheControl)
}

func (r *R2Client) uploadFileWithOptions(ctx context.Context, key string, body io.Reader, contentType string, cacheControl *string) error {
	// For file uploads, we need to read the entire content into memory or use a seeker
	// to avoid checksum issues with streaming readers
	var bodyReader io.Reader = body

	// If the body is a file, use it directly as it implements io.ReadSeeker
	if file, ok := body.(*os.File); ok {
		bodyReader = file
	} else {
		// For other readers, read into memory and create a bytes.Reader (implements io.ReadSeeker)
		data, err := io.ReadAll(body)
		if err != nil {
			log.Error().Err(err).Str("key", key).Msg("Failed to read file data")
			return err
		}
		bodyReader = bytes.NewReader(data)
	}

	input := &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(key),
		Body:        bodyReader,
		ContentType: aws.String(contentType),
	}

	if cacheControl != nil {
		input.CacheControl = aws.String(*cacheControl)
	}

	_, err := r.client.PutObject(ctx, input)

	if err != nil {
		log.Error().Err(err).Str("key", key).Msg("Failed to upload file to R2")
		return err
	}

	log.Debug().Str("key", key).Msg("Successfully uploaded file to R2")
	return nil
}

func (r *R2Client) UploadFileAsync(ctx context.Context, key string, body io.Reader, contentType string) {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		if err := r.UploadFile(ctx, key, body, contentType); err != nil {
			log.Error().Err(err).Str("key", key).Msg("Async upload failed")
		}
	}()
}

func (r *R2Client) GetPublicURL(key string) string {
	return r.publicURL + "/" + key
}

func (r *R2Client) Wait() {
	r.wg.Wait()
}

func (r *R2Client) DeleteFile(ctx context.Context, key string) error {
	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.bucket),
		Key:    aws.String(key),
	})

	if err != nil {
		log.Error().Err(err).Str("key", key).Msg("Failed to delete file from R2")
		return err
	}

	log.Debug().Str("key", key).Msg("Successfully deleted file from R2")
	return nil
}

func GetContentType(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	case ".mpd":
		return "application/dash+xml"
	case ".m4s":
		return "video/iso.segment"
	case ".webp":
		return "image/webp"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	default:
		return "application/octet-stream"
	}
}
