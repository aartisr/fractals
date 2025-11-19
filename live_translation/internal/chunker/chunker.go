package chunker

import (
    "encoding/binary"
    "fmt"
    "io"
    "os"
    "path/filepath"
)

// Config controls silence-based chunking.
type Config struct {
    SampleRate    int   // e.g., 16000
    Channels      int   // 1 (mono)
    FrameMs       int   // analysis frame in ms, e.g., 20
    SilenceThresh int16 // absolute amplitude threshold (0-32768)
    MinSilenceMs  int   // silence duration to close chunk, e.g., 700
    MinChunkMs    int   // minimum chunk length to emit, e.g., 1500

    // OutputDir, if non-empty, is where WAV chunk files will be written.
    // Files are named chunk_0001.wav, chunk_0002.wav, ...
    OutputDir string
}

// Sink is invoked when a chunk is detected.
// path is the WAV file path if OutputDir is set, else "".
type Sink func(startMs, endMs int64, path string)

// Run reads 16-bit PCM (s16le), writes active speech to per-chunk files (if configured),
// and invokes sink with chunk boundaries in ms and the file path.
func Run(r io.Reader, cfg Config, sink Sink) error {
    bytesPerSample := 2 * cfg.Channels
    frameSamples := cfg.SampleRate * cfg.FrameMs / 1000
    frameBytes := frameSamples * bytesPerSample
    buf := make([]byte, frameBytes)

    var (
        inSpeech       bool
        chunkStartMs   int64
        totalSamples   int64
        silenceMsAccum int64
        chunkIndex     int
        curWriter      *wavWriter
        curPath        string
    )

    for {
        n, err := io.ReadFull(r, buf)
        if err != nil {
            if err == io.EOF || err == io.ErrUnexpectedEOF {
                // End of stream; close any open chunk.
                if inSpeech {
                    endMs := samplesToMs(totalSamples, cfg.SampleRate)
                    if endMs-chunkStartMs >= int64(cfg.MinChunkMs) {
                        if curWriter != nil {
                            _ = curWriter.Close()
                            curWriter = nil
                        }
                        sink(chunkStartMs, endMs, curPath)
                    } else {
                        if curWriter != nil {
                            path := curWriter.Path()
                            _ = curWriter.Close()
                            _ = os.Remove(path)
                            curWriter = nil
                            curPath = ""
                        }
                    }
                }
                return nil
            }
            return err
        }

        // Compute average absolute amplitude for this frame (mono).
        var sum int64
        for i := 0; i < n; i += 2 * cfg.Channels {
            // Use first channel only since it's mono.
            s := int16(uint16(buf[i]) | uint16(buf[i+1])<<8)
            if s < 0 {
                s = -s
            }
            sum += int64(s)
        }
        avg := int16(sum / int64(frameSamples))
        frameMs := int64(cfg.FrameMs)
        totalSamples += int64(frameSamples)

        isSilence := avg < cfg.SilenceThresh

        switch {
        case !inSpeech && !isSilence:
            // Speech starts.
            inSpeech = true
            chunkStartMs = samplesToMs(totalSamples-int64(frameSamples), cfg.SampleRate)
            silenceMsAccum = 0
            chunkIndex++
            // Open WAV file for this chunk if configured.
            if cfg.OutputDir != "" {
                if err := os.MkdirAll(cfg.OutputDir, 0o755); err != nil {
                    return err
                }
                curPath = filepath.Join(cfg.OutputDir, fmt.Sprintf("chunk_%04d.wav", chunkIndex))
                w, err := NewWavWriterInternal(curPath, cfg.SampleRate, cfg.Channels, 16)
                if err != nil {
                    return err
                }
                curWriter = w
            } else {
                curPath = ""
            }
        case inSpeech && isSilence:
            // In speech, but frame is silent.
            silenceMsAccum += frameMs
            if silenceMsAccum >= int64(cfg.MinSilenceMs) {
                // Close chunk just before this silence.
                endMs := samplesToMs(totalSamples-int64(frameSamples), cfg.SampleRate)
                if endMs-chunkStartMs >= int64(cfg.MinChunkMs) {
                    if curWriter != nil {
                        _ = curWriter.Close()
                        curWriter = nil
                    }
                    sink(chunkStartMs, endMs, curPath)
                } else {
                    // Too short; discard file if we created one.
                    if curWriter != nil {
                        path := curWriter.Path()
                        _ = curWriter.Close()
                        _ = os.Remove(path)
                        curWriter = nil
                        curPath = ""
                    }
                }
                inSpeech = false
                silenceMsAccum = 0
            }
        case inSpeech && !isSilence:
            // Continue speech.
            silenceMsAccum = 0
        default:
            // !inSpeech && isSilence: staying idle.
        }

        // Write audio for this frame if we are in speech and have a writer.
        if inSpeech && curWriter != nil {
            if _, err := curWriter.Write(buf[:n]); err != nil {
                return err
            }
        }
    }
}

func samplesToMs(samples int64, sampleRate int) int64 {
    return samples * 1000 / int64(sampleRate)
}

// wavWriter writes 16-bit PCM to a file and patches the WAV header on Close.
type wavWriter struct {
    f            *os.File
    bytesWritten int64
}

// NewWavWriterInternal is exported for internal packages to reuse WAV writing.
func NewWavWriterInternal(path string, sampleRate, channels, bitsPerSample int) (*wavWriter, error) {
    f, err := os.Create(path)
    if err != nil {
        return nil, err
    }

    // Write placeholder header (we'll update sizes on Close).
    header := make([]byte, 44)
    copy(header[0:], "RIFF")
    // ChunkSize placeholder at [4:8]
    copy(header[8:], "WAVE")
    copy(header[12:], "fmt ")
    binary.LittleEndian.PutUint32(header[16:], 16)                     // Subchunk1Size
    binary.LittleEndian.PutUint16(header[20:], 1)                      // AudioFormat PCM
    binary.LittleEndian.PutUint16(header[22:], uint16(channels))       // NumChannels
    binary.LittleEndian.PutUint32(header[24:], uint32(sampleRate))     // SampleRate
    byteRate := sampleRate * channels * bitsPerSample / 8
    binary.LittleEndian.PutUint32(header[28:], uint32(byteRate))       // ByteRate
    blockAlign := channels * bitsPerSample / 8
    binary.LittleEndian.PutUint16(header[32:], uint16(blockAlign))     // BlockAlign
    binary.LittleEndian.PutUint16(header[34:], uint16(bitsPerSample))  // BitsPerSample
    copy(header[36:], "data")
    // Subchunk2Size placeholder at [40:44]

    if _, err := f.Write(header); err != nil {
        _ = f.Close()
        return nil, err
    }

    return &wavWriter{f: f}, nil
}

func (w *wavWriter) Write(p []byte) (int, error) {
    n, err := w.f.Write(p)
    w.bytesWritten += int64(n)
    return n, err
}

func (w *wavWriter) Path() string {
    if w.f == nil {
        return ""
    }
    return w.f.Name()
}

func (w *wavWriter) Close() error {
    if w.f == nil {
        return nil
    }
    defer func() {
        _ = w.f.Close()
        w.f = nil
    }()

    dataSize := uint32(w.bytesWritten)
    chunkSize := uint32(36) + dataSize

    // Patch ChunkSize at offset 4.
    if _, err := w.f.Seek(4, io.SeekStart); err != nil {
        return err
    }
    var buf4 [4]byte
    binary.LittleEndian.PutUint32(buf4[:], chunkSize)
    if _, err := w.f.Write(buf4[:]); err != nil {
        return err
    }

    // Patch Subchunk2Size at offset 40.
    if _, err := w.f.Seek(40, io.SeekStart); err != nil {
        return err
    }
    binary.LittleEndian.PutUint32(buf4[:], dataSize)
    if _, err := w.f.Write(buf4[:]); err != nil {
        return err
    }

    return nil
}
