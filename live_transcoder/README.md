# NTV Live Transcoder

Multi-quality HLS live streaming transcoder with R2/S3 storage backend.

## Features

- ✅ Multi-quality transcoding (1080p, 720p, 480p, 360p, 240p, 144p)
- ✅ RTMP input support
- ✅ HLS output with DVR support
- ✅ R2/S3 storage backend
- ✅ Graceful shutdown (streams become VOD after ending)
- ✅ Parallel segment uploads for high throughput
- ✅ Docker deployment ready
- ✅ File and console logging

## Quick Start

### Using Docker (Recommended for Production)

1. **Configure** - Set up environment variables (recommended):
```bash
# Copy example env file (from project root)
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required variables in `.env`:
```bash
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=ntv-ott
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_PUBLIC_URL=https://ntv-cdn.nithyananda.ai
```

**Note**: Environment variables override `config.yaml` values. This is the recommended approach for production as it keeps secrets out of config files.

2. **Build and Start** (from project root):
```bash
# Go to project root
cd /path/to/nithyananda-tv

# Option 1: Start transcoder only (standalone)
docker-compose -f docker-compose.transcoder.yml up -d

# Option 2: Start as part of all services
docker-compose up -d transcoder

# Option 3: Start all services (cms, web, transcoder)
docker-compose up -d
```

3. **View Logs**:
```bash
# Real-time logs (if using standalone compose)
docker-compose -f docker-compose.transcoder.yml logs -f

# Real-time logs (if using main compose)
docker-compose logs -f transcoder

# Persistent logs
tail -f live_transcoder/logs/transcoder.log
```

4. **Stop**:
```bash
# If using standalone compose
docker-compose -f docker-compose.transcoder.yml down

# If using main compose
docker-compose stop transcoder
# or
docker-compose down
```

### Manual Deployment

1. **Prerequisites**:
   - Go 1.21+
   - FFmpeg installed and in PATH

2. **Build**:
```bash
go build -o transcoder
```

3. **Run**:
```bash
# Server mode (listens for RTMP)
./transcoder -config config.yaml

# Manual mode (transcode specific stream)
./transcoder -stream YOUR_KEY -rtmp rtmp://source-url/live/stream
```

## API Documentation

### Method 1: RTMP Streaming (Recommended)

The transcoder listens on port **1935** for RTMP streams.

**RTMP URL Format**:
```
rtmp://your-server-ip:1935/live/{STREAM_KEY}
```

The `STREAM_KEY` becomes the folder name in R2 storage.

#### Example: Stream from OBS

**OBS Settings**:
- Server: `rtmp://your-server-ip:1935/live`
- Stream Key: `mystream` (use any unique identifier)

**Output URLs** (after streaming starts):
- Master Playlist: `https://your-cdn.example.com/mystream/master.m3u8`
- 1080p: `https://your-cdn.example.com/mystream/1080p/playlist.m3u8`
- 720p: `https://your-cdn.example.com/mystream/720p/playlist.m3u8`
- 480p: `https://your-cdn.example.com/mystream/480p/playlist.m3u8`
- etc.

#### Example: Stream with FFmpeg

```bash
# Stream a video file
ffmpeg -re -i input.mp4 \
  -c:v libx264 -preset veryfast \
  -c:a aac -b:a 128k \
  -f flv rtmp://your-server-ip:1935/live/test

# Re-stream from another RTMP source
ffmpeg -i rtmp://source-server/live/input \
  -c copy \
  -f flv rtmp://your-server-ip:1935/live/relay
```

### Method 2: Command Line (Manual Control)

Start transcoding from any RTMP source:

```bash
./transcoder -stream STREAM_KEY -rtmp rtmp://source-url/live/stream
```

**Parameters**:
- `-stream`: Unique stream identifier (becomes folder name in R2)
- `-rtmp`: Source RTMP URL to transcode from

**Example 1: Transcode from external RTMP server**
```bash
./transcoder -stream "live-event-2025" \
  -rtmp rtmp://origin-server:1935/live/source-stream
```

**Example 2: Transcode from local FFmpeg**
```bash
# Terminal 1: Start FFmpeg server
ffmpeg -re -i video.mp4 -c copy -f flv rtmp://localhost:1935/live/source

# Terminal 2: Start transcoding
./transcoder -stream "test" -rtmp rtmp://localhost:1935/live/source
```

**Output Structure in R2**:
```
STREAM_KEY/
├── master.m3u8              # Master playlist
├── 1080p/
│   ├── playlist.m3u8
│   ├── segment_000.ts
│   ├── segment_001.ts
│   └── ...
├── 720p/
│   ├── playlist.m3u8
│   └── segments...
└── ... (other qualities)
```

### Method 3: Programmatic API (Future Enhancement)

For programmatic control, you can extend `pkg/server/server.go` with HTTP endpoints.

**Proposed REST API** (not yet implemented):

```bash
# Start transcoding
POST /api/streams/start
Content-Type: application/json

{
  "stream_key": "live-event-2025",
  "rtmp_url": "rtmp://origin-server:1935/live/source"
}

Response: 201 Created
{
  "stream_key": "live-event-2025",
  "status": "started",
  "outputs": {
    "master": "https://cdn.example.com/live-event-2025/master.m3u8",
    "1080p": "https://cdn.example.com/live-event-2025/1080p/playlist.m3u8",
    ...
  }
}

# Alternative: Start with stream_key in path
POST /api/streams/{stream_key}/start
Content-Type: application/json

{
  "rtmp_url": "rtmp://origin-server:1935/live/source"
}

Response: 201 Created
{
  "stream_key": "live-event-2025",
  "status": "started",
  "outputs": {...}
}

# Stop transcoding gracefully
POST /api/streams/{stream_key}/stop

Response: 200 OK
{
  "stream_key": "live-event-2025",
  "status": "stopping",
  "message": "Stream will end gracefully and become available as VOD"
}

# List active streams
GET /api/streams

Response: 200 OK
{
  "streams": [
    {
      "stream_key": "live-event-2025",
      "status": "running",
      "duration": "00:15:32"
    }
  ]
}

# Get stream details
GET /api/streams/{stream_key}

Response: 200 OK
{
  "stream_key": "live-event-2025",
  "status": "running",
  "start_time": "2025-10-15T12:30:00Z",
  "duration": "00:15:32",
  "outputs": {...}
}
```

To implement this, add HTTP handlers in `pkg/server/server.go` and expose port 8080 in docker-compose.

## Configuration

### Environment Variables vs Config File

The transcoder uses a **hybrid configuration approach**:

1. **config.yaml**: Static settings (qualities, ports, HLS settings)
2. **Environment variables**: Secrets and deployment-specific settings (R2 credentials, URLs)

**Environment variables take precedence** over config.yaml values.

#### Storage Configuration

**Recommended (Environment Variables)**:
```bash
# In .env file
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET=ntv-ott
R2_ACCESS_KEY=your-access-key
R2_SECRET_KEY=your-secret-key
R2_PUBLIC_URL=https://ntv-cdn.nithyananda.ai
R2_REGION=auto
```

**Alternative (config.yaml)**:
```yaml
storage:
  endpoint: "https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
  bucket: "ntv-ott"
  access_key: "your-access-key"
  secret_key: "your-secret-key"
  region: "auto"
  public_url: "https://ntv-cdn.nithyananda.ai"
```

**Why use environment variables?**
- ✅ Keep secrets out of config files
- ✅ Different credentials per environment (dev/staging/prod)
- ✅ Docker-friendly
- ✅ No risk of committing secrets to git

#### Server Configuration

```bash
# Optional environment overrides
TRANSCODER_LOG_LEVEL=info        # debug, info, warn, error
TRANSCODER_TEMP_DIR=/app/temp    # Temp directory path
```

### Quality Presets

Edit `config.yaml` to customize transcoding qualities:

```yaml
qualities:
  - name: "1080p"
    width: 1920
    height: 1080
    video_bitrate: "5000k"  # Adjust based on your needs
    audio_bitrate: "192k"
  - name: "720p"
    width: 1280
    height: 720
    video_bitrate: "3000k"
    audio_bitrate: "128k"
  # Add/remove qualities as needed
```

**Tips**:
- **Reduce qualities** for lower CPU usage (remove 144p, 240p)
- **Lower bitrates** to save bandwidth
- **Increase bitrates** for better quality

### HLS Settings

```yaml
hls:
  segment_duration: 4    # 2-10 seconds (lower = lower latency)
  playlist_length: 10    # segments to keep in memory
  dvr_enabled: true      # keep all segments for DVR/VOD playback
```

### Logging Levels

```yaml
server:
  log_level: "info"  # debug, info, warn, error
```

- **debug**: Detailed logs (segment detection, upload timing, file sizes)
- **info**: Standard operation logs (segment uploads, stream lifecycle)
- **warn**: Warnings only
- **error**: Errors only

Logs are written to:
- **Console**: stdout/stderr (visible in `docker-compose logs`)
- **File**: `logs/transcoder.log` (persistent, mounted volume)

## Monitoring & Health Checks

### Check Service Status

```bash
# Docker
docker-compose ps

# Check if process is running
pgrep -x transcoder
```

### View Active Streams

```bash
# Check logs for active streams
grep "Starting FFmpeg" logs/transcoder.log

# See recent segment uploads
grep "Segment uploaded" logs/transcoder.log | tail -20
```

### Log Analysis

```bash
# Find errors
grep "ERR" logs/transcoder.log | tail -20

# Track graceful shutdowns
grep "Graceful shutdown\|EXT-X-ENDLIST" logs/transcoder.log

# Monitor upload performance
grep "Segment uploaded" logs/transcoder.log | awk '{print $NF}' | tail -20
```

## Troubleshooting

### Issue: Segments return 404 errors

**Symptoms**: Player shows "Failed to open segment X"

**Causes**:
1. Uploads not keeping up with encoding
2. Partial/corrupted segments uploaded

**Solutions**:
1. Check upload bandwidth:
   ```bash
   speedtest-cli --upload
   ```
   Required: ~15 Mbps for 6 qualities

2. Reduce quality count:
   ```yaml
   # Edit config.yaml - remove 144p, 240p, 360p
   qualities:
     - name: "1080p"
       ...
     - name: "720p"
       ...
     - name: "480p"
       ...
   ```

3. Increase segment duration:
   ```yaml
   hls:
     segment_duration: 6  # gives more time for uploads
   ```

4. Check logs for upload errors:
   ```bash
   grep "Failed to upload" logs/transcoder.log
   ```

### Issue: Stream has gaps/discontinuities

**Symptoms**: Playback freezes or skips

**Causes**:
- Network issues
- CPU overload
- Source stream problems

**Diagnostics**:
```bash
# Check CPU usage
top -p $(pgrep transcoder)

# Check for encoding lag in logs
grep "fps=" logs/transcoder.log | tail -20

# Verify segment upload timing
grep "Segment uploaded" logs/transcoder.log | tail -50
```

**Solutions**:
- Increase CPU resources in `docker-compose.yml`
- Use faster encoding preset (edit `transcoder.go`: change `-preset veryfast` to `-preset ultrafast`)
- Check source stream stability

### Issue: High CPU usage

**Symptoms**: CPU at 100%, system slow

**Causes**:
- Encoding multiple qualities is CPU-intensive
- Each quality uses ~1 CPU core

**Solutions**:

1. Limit CPU in Docker:
   ```yaml
   # docker-compose.yml
   deploy:
     resources:
       limits:
         cpus: '4.0'  # adjust based on server
   ```

2. Reduce quality count (see above)

3. Use hardware encoding (requires code changes):
   - NVENC (NVIDIA GPUs)
   - QuickSync (Intel CPUs)
   - VAAPI (Linux GPUs)

### Issue: Stream doesn't start

**Symptoms**: No segments created, logs show errors

**Diagnostics**:
```bash
# Check if FFmpeg is installed
docker-compose exec transcoder ffmpeg -version

# Check RTMP connection
telnet your-server-ip 1935

# Verify config
cat config.yaml | grep -A5 storage
```

**Solutions**:
- Ensure FFmpeg is in PATH
- Check firewall allows port 1935
- Verify R2 credentials in config.yaml
- Check source RTMP URL is accessible

## Production Deployment

### Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 2GB | 4GB+ |
| Upload | 10 Mbps | 20+ Mbps |
| Storage | 10GB | 50GB+ (for logs/temp) |

**CPU per quality**: ~1 core
**RAM per stream**: ~500MB

### Docker Production Setup

1. **Configure limits**:
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '6.0'    # Adjust based on quality count
      memory: 4G
    reservations:
      cpus: '2.0'
      memory: 2G
```

2. **Enable auto-restart**:
```yaml
restart: unless-stopped  # Already included
```

3. **Set up log rotation**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

4. **Secure R2 credentials**:
```bash
# Use environment variables instead of config.yaml
docker-compose run --rm \
  -e R2_ACCESS_KEY="xxx" \
  -e R2_SECRET_KEY="yyy" \
  transcoder
```

### Firewall Configuration

```bash
# Allow RTMP
sudo ufw allow 1935/tcp

# If adding HTTP API (future):
sudo ufw allow 8080/tcp
```

### Systemd Service (Alternative to Docker)

```ini
# /etc/systemd/system/ntv-transcoder.service
[Unit]
Description=NTV Live Transcoder
After=network.target

[Service]
Type=simple
User=transcoder
WorkingDirectory=/opt/ntv/live_transcoder
ExecStart=/opt/ntv/live_transcoder/transcoder -config /opt/ntv/live_transcoder/config.yaml
Restart=always
RestartSec=10
StandardOutput=append:/var/log/ntv-transcoder/transcoder.log
StandardError=append:/var/log/ntv-transcoder/transcoder.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ntv-transcoder
sudo systemctl start ntv-transcoder
sudo systemctl status ntv-transcoder
```

## Architecture

```
┌──────────────────────────────────────────────┐
│  Input Sources                               │
│  • OBS Studio (RTMP)                         │
│  • FFmpeg (RTMP)                             │
│  • External RTMP server                      │
└──────────────┬───────────────────────────────┘
               │ RTMP (Port 1935)
               ↓
┌──────────────────────────────────────────────┐
│  NTV Live Transcoder (Docker Container)      │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  FFmpeg Transcoding Pipeline           │ │
│  │  • Decode input stream                 │ │
│  │  • 6x parallel encode (qualities)      │ │
│  │  • HLS segmentation (4s segments)      │ │
│  │  • Write to temp directory             │ │
│  └─────────────┬──────────────────────────┘ │
│                │                             │
│  ┌─────────────┴──────────────────────────┐ │
│  │  Upload Watcher (Go)                   │ │
│  │  • File stability check (1s)           │ │
│  │  • Parallel uploads (6 qualities)      │ │
│  │  • Playlist generation & updates       │ │
│  └─────────────┬──────────────────────────┘ │
└────────────────┼────────────────────────────┘
                 │ HTTPS
                 ↓
┌──────────────────────────────────────────────┐
│  Cloudflare R2 Storage                       │
│  • {stream_key}/master.m3u8                  │
│  • {stream_key}/1080p/playlist.m3u8 + *.ts   │
│  • {stream_key}/720p/playlist.m3u8 + *.ts    │
│  • ... (other qualities)                     │
└─────────────┬────────────────────────────────┘
              │ CDN Distribution
              ↓
┌──────────────────────────────────────────────┐
│  Viewers (HLS Players)                       │
│  • Web browsers (hls.js, Video.js)           │
│  • Mobile apps (native HLS)                  │
│  • VLC, ffplay, etc.                         │
└──────────────────────────────────────────────┘
```

**Key Features**:
- **Graceful shutdown**: When stream ends, adds `#EXT-X-ENDLIST` to playlists (becomes VOD)
- **Parallel uploads**: All qualities upload simultaneously
- **File stability**: Waits 1 second to confirm segment is complete before uploading
- **DVR support**: Keeps all segments (configurable)

## Development

### Building from Source

```bash
# Install dependencies
go mod tidy

# Build
go build -o transcoder

# Build with race detector (for testing)
go build -race -o transcoder

# Run tests
go test ./...
```

### Code Structure

```
nithyananda-tv/                 # Project root
├── .env                        # Environment variables (create from .env.example)
├── .env.example                # Example environment configuration
├── docker-compose.yml          # Main orchestration (all services)
├── cms/                        # Payload CMS
├── web/                        # Frontend
└── live_transcoder/
    ├── main.go                 # Entry point, CLI, logger setup
    ├── config.yaml             # Static configuration (ports, qualities, etc.)
    ├── Dockerfile              # Docker build
    ├── .dockerignore           # Docker build exclusions
    ├── README.md               # This file
    ├── pkg/
    │   ├── config/
    │   │   └── config.go       # Config loader
    │   ├── server/
    │   │   └── server.go       # Server, session management
    │   ├── transcoder/
    │   │   └── transcoder.go   # FFmpeg pipeline, upload logic
    │   └── storage/
    │       └── r2.go           # R2/S3 client
    ├── logs/                   # Log files (persisted, created at runtime)
    └── temp/                   # Segment temp storage (ephemeral)
```

**Note**: `docker-compose.yml` is at the project root, not in `live_transcoder/`

## Roadmap

- [x] Multi-quality HLS transcoding
- [x] R2/S3 storage backend
- [x] Graceful shutdown & VOD conversion
- [x] Parallel uploads
- [x] Docker deployment
- [x] Comprehensive logging
- [ ] HTTP REST API for stream control
- [ ] Authentication & API keys
- [ ] Multiple concurrent streams
- [ ] Stream analytics (viewers, bitrate, etc.)
- [ ] Webhook notifications (stream start/end)
- [ ] VOD archive management
- [ ] Hardware encoding support (NVENC, QuickSync)

## License

Private - Nithyananda TV Project

## Support

For issues, check:
1. `logs/transcoder.log`
2. `docker-compose logs transcoder`
3. GitHub issues (if repository is public)
