package uploads

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"clicky-store/internal/core/ports"
)

var (
	ErrInvalidProductID = ports.ErrInvalidProductUpload
	ErrInvalidImage     = ports.ErrInvalidProductImageUpload
	ErrUnsupportedType  = ports.ErrUnsupportedProductImageType
	ErrFileTooLarge     = ports.ErrProductImageUploadTooLarge
)

type Config struct {
	Dir                  string
	URLPrefix            string
	MaxProductImageBytes int64
}

type LocalStore struct {
	dir                  string
	urlPrefix            string
	maxProductImageBytes int64
	files                fs.FS
}

func NewLocalStore(cfg Config) (*LocalStore, error) {
	uploadDir := strings.TrimSpace(cfg.Dir)
	if uploadDir == "" {
		return nil, errors.New("upload dir is required")
	}

	urlPrefix := cleanURLPrefix(cfg.URLPrefix)
	if urlPrefix == "/" {
		return nil, errors.New("upload URL prefix must not be root")
	}

	if cfg.MaxProductImageBytes <= 0 {
		return nil, errors.New("max product image bytes must be greater than zero")
	}

	if err := os.MkdirAll(filepath.Join(uploadDir, "products"), 0o755); err != nil {
		return nil, fmt.Errorf("create upload directory: %w", err)
	}

	return &LocalStore{
		dir:                  uploadDir,
		urlPrefix:            urlPrefix,
		maxProductImageBytes: cfg.MaxProductImageBytes,
		files:                os.DirFS(uploadDir),
	}, nil
}

func (s *LocalStore) URLPrefix() string {
	return s.urlPrefix
}

func (s *LocalStore) SaveProductImage(productID, originalFilename string, reader io.Reader) (ports.ProductImageFile, error) {
	productID, err := safePathSegment(productID)
	if err != nil {
		return ports.ProductImageFile{}, err
	}

	expectedContentType, extension, err := allowedImageType(originalFilename)
	if err != nil {
		return ports.ProductImageFile{}, err
	}

	data, err := readLimited(reader, s.maxProductImageBytes)
	if err != nil {
		return ports.ProductImageFile{}, err
	}

	detectedContentType := http.DetectContentType(data)
	if detectedContentType != expectedContentType {
		return ports.ProductImageFile{}, ErrUnsupportedType
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return ports.ProductImageFile{}, ErrInvalidImage
	}
	if !formatMatchesContentType(format, expectedContentType) {
		return ports.ProductImageFile{}, ErrUnsupportedType
	}

	filename, err := generatedFilename(extension)
	if err != nil {
		return ports.ProductImageFile{}, err
	}

	productDir := filepath.Join(s.dir, "products", productID)
	if err := os.MkdirAll(productDir, 0o755); err != nil {
		return ports.ProductImageFile{}, fmt.Errorf("create product upload directory: %w", err)
	}

	destination := filepath.Join(productDir, filename)
	file, err := os.OpenFile(destination, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return ports.ProductImageFile{}, fmt.Errorf("write uploaded image: %w", err)
	}
	if _, err := file.Write(data); err != nil {
		_ = file.Close()
		return ports.ProductImageFile{}, fmt.Errorf("write uploaded image: %w", err)
	}
	if err := file.Close(); err != nil {
		return ports.ProductImageFile{}, fmt.Errorf("close uploaded image: %w", err)
	}

	return ports.ProductImageFile{
		ProductID:   productID,
		Filename:    filename,
		URL:         path.Join(s.urlPrefix, "products", productID, filename),
		ContentType: expectedContentType,
		SizeBytes:   int64(len(data)),
		Width:       cfg.Width,
		Height:      cfg.Height,
	}, nil
}

func (s *LocalStore) Handler() http.Handler {
	return http.HandlerFunc(s.ServeHTTP)
}

func (s *LocalStore) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rel, ok := s.relativeRequestPath(r.URL.Path)
	if !ok {
		http.NotFound(w, r)
		return
	}

	file, err := s.files.Open(rel)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}

	readSeeker, ok := file.(io.ReadSeeker)
	if !ok {
		http.Error(w, "upload file unavailable", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=3600")
	http.ServeContent(w, r, info.Name(), info.ModTime(), readSeeker)
}

func (s *LocalStore) relativeRequestPath(urlPath string) (string, bool) {
	if urlPath == s.urlPrefix {
		return "", false
	}

	rel := strings.TrimPrefix(urlPath, s.urlPrefix+"/")
	if rel == urlPath {
		return "", false
	}

	rel = path.Clean(rel)
	if rel == "." || strings.HasPrefix(rel, "../") || strings.HasPrefix(rel, "/") {
		return "", false
	}
	if !fs.ValidPath(rel) {
		return "", false
	}

	return rel, true
}

func readLimited(reader io.Reader, maxBytes int64) ([]byte, error) {
	var buffer bytes.Buffer
	written, err := io.Copy(&buffer, io.LimitReader(reader, maxBytes+1))
	if err != nil {
		return nil, err
	}
	if written > maxBytes {
		return nil, ErrFileTooLarge
	}
	if written == 0 {
		return nil, ErrInvalidImage
	}

	return buffer.Bytes(), nil
}

func allowedImageType(filename string) (string, string, error) {
	switch strings.ToLower(filepath.Ext(strings.TrimSpace(filename))) {
	case ".jpg", ".jpeg":
		return "image/jpeg", ".jpg", nil
	case ".png":
		return "image/png", ".png", nil
	default:
		return "", "", ErrUnsupportedType
	}
}

func formatMatchesContentType(format, contentType string) bool {
	switch contentType {
	case "image/jpeg":
		return format == "jpeg"
	case "image/png":
		return format == "png"
	default:
		return false
	}
}

func safePathSegment(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", ErrInvalidProductID
	}

	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
		case r >= 'A' && r <= 'Z':
		case r >= '0' && r <= '9':
		case r == '-', r == '_':
		default:
			return "", ErrInvalidProductID
		}
	}

	return value, nil
}

func generatedFilename(extension string) (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate upload filename: %w", err)
	}

	return "img_" + hex.EncodeToString(raw) + extension, nil
}

func cleanURLPrefix(prefix string) string {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return "/uploads"
	}
	if !strings.HasPrefix(prefix, "/") {
		prefix = "/" + prefix
	}

	clean := path.Clean(prefix)
	if clean == "/" {
		return "/"
	}

	return strings.TrimSuffix(clean, "/")
}
