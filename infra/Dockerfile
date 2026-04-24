# Build from the repository root:
#   docker build -f infra/Dockerfile .
# Default command is the API; override with `docker run ... /worker` (Render worker service).
FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./apps/api/cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/worker ./apps/worker/cmd/worker

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build --chown=65532:65532 /out/api /api
COPY --from=build --chown=65532:65532 /out/worker /worker
COPY --from=build --chown=65532:65532 /src/apps/api/migrations /apps/api/migrations
USER nonroot:nonroot
CMD ["/api"]
