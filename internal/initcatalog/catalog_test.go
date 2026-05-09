package initcatalog

import (
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"clicky-store/internal/adapters/db"
	"clicky-store/internal/adapters/uploads"
	"clicky-store/internal/core/domains"
)

func TestLoadValidatesCatalogAndImages(t *testing.T) {
	dir := t.TempDir()
	writeJPEG(t, filepath.Join(dir, "img", "demo-mouse", "1.jpg"))
	writePNG(t, filepath.Join(dir, "img", "demo-mouse", "2.png"))

	catalogPath := writeCatalog(t, dir, Catalog{
		Products: []Product{
			validProduct("Demo Mouse", "demo-mouse", []Image{
				{
					Path:    "img/demo-mouse/1.jpg",
					AltText: "Demo Mouse front",
				},
				{
					Path:      "img/demo-mouse/2.png",
					AltText:   "Demo Mouse side",
					IsPrimary: true,
				},
			}),
		},
	})

	catalog, err := Load(catalogPath, 10, 1024*1024)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	product := catalog.Products[0]
	if product.Currency != "PLN" || product.Category != "gaming" {
		t.Fatalf("normalized product = %+v, want PLN gaming", product)
	}
	if product.Images[0].IsPrimary || !product.Images[1].IsPrimary {
		t.Fatalf("images primary flags = %+v, want requested second primary", product.Images)
	}
	if product.Images[1].absolutePath == "" {
		t.Fatal("expected loader to resolve absolute image path")
	}
}

func TestLoadRejectsMissingImage(t *testing.T) {
	dir := t.TempDir()
	catalogPath := writeCatalog(t, dir, Catalog{
		Products: []Product{
			validProduct("Demo Mouse", "demo-mouse", []Image{
				{Path: "img/demo-mouse/1.jpg", AltText: "Demo Mouse front"},
			}),
		},
	})

	_, err := Load(catalogPath, 10, 1024*1024)
	if err == nil || !strings.Contains(err.Error(), "image file unavailable") {
		t.Fatalf("Load error = %v, want missing image error", err)
	}
}

func TestSeedReplacesFallbackCatalogAfterValidation(t *testing.T) {
	dir := t.TempDir()
	writeJPEG(t, filepath.Join(dir, "img", "demo-mouse", "1.jpg"))

	catalogPath := writeCatalog(t, dir, Catalog{
		Products: []Product{
			validProduct("Demo Mouse", "demo-mouse", []Image{
				{Path: "img/demo-mouse/1.jpg", AltText: "Demo Mouse front"},
			}),
		},
	})

	store := db.NewMemoryStore()
	uploadStore := newTestUploadStore(t, dir)

	result, err := Seed(store, uploadStore, Config{
		Path:          catalogPath,
		MaxImages:     10,
		MaxImageBytes: 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("Seed: %v", err)
	}
	if !result.Applied || result.ProductCount != 1 || result.ImageCount != 1 {
		t.Fatalf("Seed result = %+v, want one applied product and image", result)
	}

	products := store.ListProducts(domains.ProductFilter{})
	if len(products) != 1 || products[0].Slug != "demo-mouse" {
		t.Fatalf("products after seed = %+v, want only demo catalog", products)
	}
	if len(products[0].Images) != 1 ||
		!products[0].Images[0].IsPrimary ||
		!strings.HasPrefix(products[0].Images[0].URL, "/uploads/products/"+products[0].ID+"/img_") {
		t.Fatalf("seeded product images = %+v, want uploaded primary image", products[0].Images)
	}
	if _, err := store.GetProduct("prod-gaming-viper"); !errors.Is(err, domains.ErrNotFound) {
		t.Fatalf("fallback product lookup error = %v, want not found", err)
	}
}

func TestSeedKeepsFallbackCatalogWhenInitIsInvalid(t *testing.T) {
	dir := t.TempDir()
	catalogPath := writeCatalog(t, dir, Catalog{
		Products: []Product{
			validProduct("Demo Mouse", "demo-mouse", []Image{
				{Path: "img/demo-mouse/1.jpg", AltText: "Demo Mouse front"},
			}),
		},
	})

	store := db.NewMemoryStore()
	uploadStore := newTestUploadStore(t, dir)

	result, err := Seed(store, uploadStore, Config{
		Path:          catalogPath,
		MaxImages:     10,
		MaxImageBytes: 1024 * 1024,
	})
	if err == nil {
		t.Fatal("Seed error = nil, want invalid catalog error")
	}
	if result.Applied {
		t.Fatalf("Seed result = %+v, want not applied", result)
	}

	products := store.ListProducts(domains.ProductFilter{})
	if len(products) != len(fallbackProductIDs) {
		t.Fatalf("products after invalid seed = %d, want fallback count %d", len(products), len(fallbackProductIDs))
	}
}

func TestSeedSkipsCustomizedCatalog(t *testing.T) {
	dir := t.TempDir()
	writeJPEG(t, filepath.Join(dir, "img", "demo-mouse", "1.jpg"))
	catalogPath := writeCatalog(t, dir, Catalog{
		Products: []Product{
			validProduct("Demo Mouse", "demo-mouse", []Image{
				{Path: "img/demo-mouse/1.jpg", AltText: "Demo Mouse front"},
			}),
		},
	})

	store := db.NewMemoryStore()
	if _, err := store.CreateProduct(validProduct("Existing Mouse", "existing-mouse", nil).toDomainProduct()); err != nil {
		t.Fatalf("CreateProduct: %v", err)
	}
	uploadStore := newTestUploadStore(t, dir)

	result, err := Seed(store, uploadStore, Config{
		Path:          catalogPath,
		MaxImages:     10,
		MaxImageBytes: 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("Seed: %v", err)
	}
	if result.Applied || !strings.Contains(result.Reason, "not the fallback") {
		t.Fatalf("Seed result = %+v, want skip for customized catalog", result)
	}
	if got := len(store.ListProducts(domains.ProductFilter{})); got != len(fallbackProductIDs)+1 {
		t.Fatalf("product count = %d, want fallback plus custom product", got)
	}
}

func validProduct(name, slug string, images []Image) Product {
	return Product{
		Name:        name,
		Slug:        slug,
		Description: "A complete test product description.",
		Category:    "gaming",
		PriceCents:  12300,
		Currency:    "pln",
		DPI:         12000,
		Wireless:    true,
		Ergonomic:   false,
		Stock:       7,
		Images:      images,
	}
}

func writeCatalog(t *testing.T, dir string, catalog Catalog) string {
	t.Helper()

	body, err := json.MarshalIndent(catalog, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndent: %v", err)
	}

	filePath := filepath.Join(dir, "init.json")
	if err := os.WriteFile(filePath, body, 0o644); err != nil {
		t.Fatalf("WriteFile catalog: %v", err)
	}

	return filePath
}

func newTestUploadStore(t *testing.T, dir string) *uploads.LocalStore {
	t.Helper()

	uploadStore, err := uploads.NewLocalStore(uploads.Config{
		Dir:                  filepath.Join(dir, "uploads"),
		URLPrefix:            "/uploads",
		MaxProductImageBytes: 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("NewLocalStore: %v", err)
	}

	return uploadStore
}

func writeJPEG(t *testing.T, filePath string) {
	t.Helper()

	file := createImageFile(t, filePath)
	defer file.Close()

	if err := jpeg.Encode(file, testImage(), nil); err != nil {
		t.Fatalf("jpeg.Encode: %v", err)
	}
}

func writePNG(t *testing.T, filePath string) {
	t.Helper()

	file := createImageFile(t, filePath)
	defer file.Close()

	if err := png.Encode(file, testImage()); err != nil {
		t.Fatalf("png.Encode: %v", err)
	}
}

func createImageFile(t *testing.T, filePath string) *os.File {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(filePath), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}

	file, err := os.Create(filePath)
	if err != nil {
		t.Fatalf("Create image: %v", err)
	}

	return file
}

func testImage() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	for y := 0; y < 4; y++ {
		for x := 0; x < 4; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 80, B: 40, A: 255})
		}
	}

	return img
}
