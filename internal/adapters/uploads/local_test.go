package uploads

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"
)

func TestLocalStoreSaveProductImageAcceptsPNGAndJPEG(t *testing.T) {
	store := newTestStore(t, 1024*1024)

	pngFile, err := store.SaveProductImage("prod_123", "mouse.png", bytes.NewReader(testPNG(t)))
	if err != nil {
		t.Fatalf("SaveProductImage png: %v", err)
	}
	if pngFile.ProductID != "prod_123" ||
		pngFile.ContentType != "image/png" ||
		pngFile.Width != 2 ||
		pngFile.Height != 3 ||
		!strings.HasPrefix(pngFile.URL, "/uploads/products/prod_123/img_") ||
		path.Ext(pngFile.URL) != ".png" {
		t.Fatalf("png stored file = %+v", pngFile)
	}

	jpegFile, err := store.SaveProductImage("prod-456", "mouse.jpeg", bytes.NewReader(testJPEG(t)))
	if err != nil {
		t.Fatalf("SaveProductImage jpeg: %v", err)
	}
	if jpegFile.ProductID != "prod-456" ||
		jpegFile.ContentType != "image/jpeg" ||
		!strings.HasPrefix(jpegFile.URL, "/uploads/products/prod-456/img_") ||
		path.Ext(jpegFile.URL) != ".jpg" {
		t.Fatalf("jpeg stored file = %+v", jpegFile)
	}
}

func TestNewLocalStoreRejectsRootURLPrefix(t *testing.T) {
	_, err := NewLocalStore(Config{
		Dir:                  t.TempDir(),
		URLPrefix:            "/",
		MaxProductImageBytes: 1024,
	})
	if err == nil {
		t.Fatal("NewLocalStore accepted root URL prefix")
	}
}

func TestLocalStoreSaveProductImageRejectsUnsafeInputs(t *testing.T) {
	store := newTestStore(t, 1024)

	tests := []struct {
		name     string
		product  string
		filename string
		body     []byte
		wantErr  error
	}{
		{
			name:     "path traversal product",
			product:  "../prod",
			filename: "mouse.png",
			body:     testPNG(t),
			wantErr:  ErrInvalidProductID,
		},
		{
			name:     "svg extension",
			product:  "prod_123",
			filename: "mouse.svg",
			body:     []byte("<svg></svg>"),
			wantErr:  ErrUnsupportedType,
		},
		{
			name:     "extension content mismatch",
			product:  "prod_123",
			filename: "mouse.jpg",
			body:     testPNG(t),
			wantErr:  ErrUnsupportedType,
		},
		{
			name:     "not an image",
			product:  "prod_123",
			filename: "mouse.png",
			body:     []byte("not an image"),
			wantErr:  ErrUnsupportedType,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := store.SaveProductImage(tt.product, tt.filename, bytes.NewReader(tt.body))
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("SaveProductImage error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestLocalStoreSaveProductImageRejectsOversizedFiles(t *testing.T) {
	store := newTestStore(t, 8)

	_, err := store.SaveProductImage("prod_123", "mouse.png", bytes.NewReader(testPNG(t)))
	if !errors.Is(err, ErrFileTooLarge) {
		t.Fatalf("SaveProductImage error = %v, want file too large", err)
	}
}

func TestLocalStoreServesUploadedFilesWithoutDirectoryListing(t *testing.T) {
	store := newTestStore(t, 1024*1024)

	storedFile, err := store.SaveProductImage("prod_123", "mouse.png", bytes.NewReader(testPNG(t)))
	if err != nil {
		t.Fatalf("SaveProductImage: %v", err)
	}

	fileRes := httptest.NewRecorder()
	fileReq := httptest.NewRequest(http.MethodGet, storedFile.URL, nil)
	store.ServeHTTP(fileRes, fileReq)
	if fileRes.Code != http.StatusOK {
		t.Fatalf("GET uploaded file status = %d, want 200; body: %s", fileRes.Code, fileRes.Body.String())
	}
	if contentType := fileRes.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "image/png") {
		t.Fatalf("Content-Type = %q, want image/png", contentType)
	}

	rootRes := httptest.NewRecorder()
	rootReq := httptest.NewRequest(http.MethodGet, "/uploads", nil)
	store.ServeHTTP(rootRes, rootReq)
	if rootRes.Code != http.StatusNotFound {
		t.Fatalf("GET upload root status = %d, want 404", rootRes.Code)
	}

	methodRes := httptest.NewRecorder()
	methodReq := httptest.NewRequest(http.MethodPost, storedFile.URL, nil)
	store.ServeHTTP(methodRes, methodReq)
	if methodRes.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST uploaded file status = %d, want 405", methodRes.Code)
	}

	traversalRes := httptest.NewRecorder()
	traversalReq := httptest.NewRequest(http.MethodGet, "/uploads/../"+storedFile.Filename, nil)
	store.ServeHTTP(traversalRes, traversalReq)
	if traversalRes.Code != http.StatusNotFound {
		t.Fatalf("GET traversal status = %d, want 404", traversalRes.Code)
	}
}

func newTestStore(t *testing.T, maxBytes int64) *LocalStore {
	t.Helper()

	store, err := NewLocalStore(Config{
		Dir:                  t.TempDir(),
		URLPrefix:            "/uploads",
		MaxProductImageBytes: maxBytes,
	})
	if err != nil {
		t.Fatalf("NewLocalStore: %v", err)
	}

	return store
}

func testPNG(t *testing.T) []byte {
	t.Helper()

	var buffer bytes.Buffer
	if err := png.Encode(&buffer, testImage()); err != nil {
		t.Fatalf("encode png: %v", err)
	}

	return buffer.Bytes()
}

func testJPEG(t *testing.T) []byte {
	t.Helper()

	var buffer bytes.Buffer
	if err := jpeg.Encode(&buffer, testImage(), &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}

	return buffer.Bytes()
}

func testImage() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 2, 3))
	for y := range 3 {
		for x := range 2 {
			img.Set(x, y, color.RGBA{R: uint8(80 + x), G: uint8(120 + y), B: 180, A: 255})
		}
	}

	return img
}
