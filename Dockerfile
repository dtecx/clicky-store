FROM node:22-alpine AS frontend-build

WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM golang:1.25-alpine AS backend-build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/clicky-store ./cmd/server

FROM alpine:3.20

RUN adduser -D -H -s /sbin/nologin appuser

WORKDIR /app

ENV FRONTEND_DIST_DIR=/app/frontend/dist

COPY --from=backend-build /out/clicky-store /usr/local/bin/clicky-store
COPY --from=frontend-build /src/frontend/dist ./frontend/dist

USER appuser
EXPOSE 8080

ENTRYPOINT ["clicky-store"]
