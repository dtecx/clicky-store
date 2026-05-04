FROM golang:1.22-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download
RUN go mod tidy

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/clicky-store ./cmd/server

FROM alpine:3.20

RUN adduser -D -H -s /sbin/nologin appuser

COPY --from=build /out/clicky-store /usr/local/bin/clicky-store

USER appuser
EXPOSE 8080

ENTRYPOINT ["clicky-store"]