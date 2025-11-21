FROM golang:1.23 AS builder

WORKDIR /app

# Copy module manifest and download deps
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

ENV CGO_ENABLED=0

RUN go build -o /bin/live-translation-api ./cmd/api && \
    go build -o /bin/live-translation-transcription ./cmd/worker

FROM alpine:3.18

RUN adduser -D appuser
USER appuser

WORKDIR /app

COPY --from=builder /bin/live-translation-api /usr/local/bin/live-translation-api
COPY --from=builder /bin/live-translation-transcription /usr/local/bin/live-translation-transcription

EXPOSE 8090

CMD ["live-translation-api"]
