package initcatalog

import (
	"bytes"
	"encoding/json"
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

	"clicky-store/internal/core/domains"
	"clicky-store/internal/core/ports"
)

const (
	DefaultPath        = "./init/init.json"
	defaultMaxImages   = 10
	defaultMaxFileSize = 4 * 1024 * 1024
)

var fallbackProductIDs = map[string]string{
	"prod-gaming-viper":  "viper-x1-gaming-mouse",
	"prod-gaming-orbit":  "orbit-pro-wireless",
	"prod-office-quiet":  "quietdesk-m2",
	"prod-office-travel": "travelclick-compact",
}

type Config struct {
	Path          string
	MaxImages     int
	MaxImageBytes int64
}

type Catalog struct {
	Products []Product `json:"products"`
}

type Product struct {
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	PriceCents  int     `json:"priceCents"`
	Currency    string  `json:"currency"`
	DPI         int     `json:"dpi"`
	Wireless    bool    `json:"wireless"`
	Ergonomic   bool    `json:"ergonomic"`
	Stock       int     `json:"stock"`
	Images      []Image `json:"images"`
}

type Image struct {
	Path      string `json:"path"`
	AltText   string `json:"altText"`
	IsPrimary bool   `json:"isPrimary"`

	absolutePath string
}

type SeedResult struct {
	Applied      bool
	ProductCount int
	ImageCount   int
	Reason       string
}

func Load(filePath string, maxImages int, maxImageBytes int64) (Catalog, error) {
	filePath = normalizeCatalogPath(filePath)
	maxImages = normalizeMaxImages(maxImages)
	maxImageBytes = normalizeMaxImageBytes(maxImageBytes)

	file, err := os.Open(filePath)
	if err != nil {
		return Catalog{}, fmt.Errorf("open init catalog: %w", err)
	}
	defer file.Close()

	var catalog Catalog
	decoder := json.NewDecoder(file)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&catalog); err != nil {
		return Catalog{}, fmt.Errorf("decode init catalog: %w", err)
	}
	if err := ensureSingleJSONValue(decoder); err != nil {
		return Catalog{}, err
	}

	if err := validateCatalog(&catalog, filepath.Dir(filePath), maxImages, maxImageBytes); err != nil {
		return Catalog{}, err
	}

	return catalog, nil
}

func Seed(store ports.Store, fileStore ports.ProductImageFileStore, cfg Config) (SeedResult, error) {
	if store == nil {
		return SeedResult{Reason: "store unavailable"}, errors.New("store is required")
	}
	if fileStore == nil {
		return SeedResult{Reason: "upload store unavailable"}, errors.New("product image file store is required")
	}

	catalog, err := Load(cfg.Path, cfg.MaxImages, cfg.MaxImageBytes)
	if err != nil {
		return SeedResult{Reason: "catalog invalid"}, err
	}

	existingProducts := store.ListProducts(domains.ProductFilter{})
	if !canReplaceExistingCatalog(existingProducts) {
		return SeedResult{
			Applied:      false,
			ProductCount: len(existingProducts),
			Reason:       "existing product catalog is not the fallback seed",
		}, nil
	}

	createdIDs := make([]string, 0, len(catalog.Products))
	totalImages := 0
	for _, item := range catalog.Products {
		created, err := store.CreateProduct(item.toDomainProduct())
		if err != nil {
			rollbackCreatedProducts(store, createdIDs)
			return SeedResult{Reason: "create product failed"}, fmt.Errorf("create %s: %w", item.Slug, err)
		}
		createdIDs = append(createdIDs, created.ID)

		images, err := saveProductImages(fileStore, created, item.Images)
		if err != nil {
			rollbackCreatedProducts(store, createdIDs)
			return SeedResult{Reason: "save product image failed"}, fmt.Errorf("save images for %s: %w", item.Slug, err)
		}
		if _, err := store.CreateProductImages(created.ID, images); err != nil {
			rollbackCreatedProducts(store, createdIDs)
			return SeedResult{Reason: "create image metadata failed"}, fmt.Errorf("create image metadata for %s: %w", item.Slug, err)
		}
		totalImages += len(images)
	}

	for _, product := range existingProducts {
		if _, ok := fallbackProductIDs[product.ID]; !ok {
			continue
		}
		if err := store.DeleteProduct(product.ID); err != nil {
			return SeedResult{Reason: "remove fallback product failed"}, fmt.Errorf("delete fallback product %s: %w", product.ID, err)
		}
	}

	return SeedResult{
		Applied:      true,
		ProductCount: len(catalog.Products),
		ImageCount:   totalImages,
		Reason:       "catalog seeded",
	}, nil
}

func (p Product) toDomainProduct() domains.Product {
	return domains.Product{
		Name:        p.Name,
		Slug:        p.Slug,
		Description: p.Description,
		Category:    p.Category,
		PriceCents:  p.PriceCents,
		Currency:    p.Currency,
		DPI:         p.DPI,
		Wireless:    p.Wireless,
		Ergonomic:   p.Ergonomic,
		Stock:       p.Stock,
		ImageURL:    "",
	}
}

func saveProductImages(fileStore ports.ProductImageFileStore, product domains.Product, specs []Image) ([]domains.ProductImage, error) {
	images := make([]domains.ProductImage, 0, len(specs))

	for sortOrder, spec := range specs {
		file, err := os.Open(spec.absolutePath)
		if err != nil {
			return nil, err
		}

		storedFile, saveErr := fileStore.SaveProductImage(product.ID, filepath.Base(spec.absolutePath), file)
		closeErr := file.Close()
		if saveErr != nil {
			return nil, saveErr
		}
		if closeErr != nil {
			return nil, closeErr
		}

		altText := strings.TrimSpace(spec.AltText)
		if altText == "" {
			altText = product.Name
		}
		images = append(images, domains.ProductImage{
			URL:       storedFile.URL,
			AltText:   altText,
			SortOrder: sortOrder,
			IsPrimary: spec.IsPrimary,
		})
	}

	return images, nil
}

func validateCatalog(catalog *Catalog, baseDir string, maxImages int, maxImageBytes int64) error {
	if len(catalog.Products) == 0 {
		return errors.New("init catalog must include at least one product")
	}

	seenSlugs := make(map[string]bool, len(catalog.Products))
	seenImagePaths := make(map[string]bool)
	for productIndex := range catalog.Products {
		product := &catalog.Products[productIndex]
		product.Name = strings.TrimSpace(product.Name)
		product.Slug = strings.TrimSpace(product.Slug)
		product.Description = strings.TrimSpace(product.Description)
		product.Category = strings.ToLower(strings.TrimSpace(product.Category))
		product.Currency = domains.NormalizeCurrency(product.Currency)

		domainProduct := product.toDomainProduct()
		domainProduct = domains.NormalizeProduct(domainProduct)
		if err := domains.ValidateProduct(domainProduct); err != nil {
			return fmt.Errorf("product %d (%s) is invalid: %w", productIndex+1, product.Slug, err)
		}
		if product.Category != "gaming" && product.Category != "office" {
			return fmt.Errorf("product %s category must be gaming or office", product.Slug)
		}
		if seenSlugs[product.Slug] {
			return fmt.Errorf("product slug %q is duplicated", product.Slug)
		}
		seenSlugs[product.Slug] = true

		if len(product.Images) == 0 {
			return fmt.Errorf("product %s must include at least one image", product.Slug)
		}
		if len(product.Images) > maxImages {
			return fmt.Errorf("product %s has %d images; maximum is %d", product.Slug, len(product.Images), maxImages)
		}

		primaryCount := 0
		for imageIndex := range product.Images {
			image := &product.Images[imageIndex]
			cleanPath, absolutePath, err := validateImagePath(baseDir, product.Slug, image.Path)
			if err != nil {
				return fmt.Errorf("product %s image %d: %w", product.Slug, imageIndex+1, err)
			}
			if seenImagePaths[cleanPath] {
				return fmt.Errorf("product %s image %d path %q is duplicated", product.Slug, imageIndex+1, cleanPath)
			}
			seenImagePaths[cleanPath] = true

			if err := validateImageFile(absolutePath, maxImageBytes); err != nil {
				return fmt.Errorf("product %s image %d (%s): %w", product.Slug, imageIndex+1, cleanPath, err)
			}

			image.Path = cleanPath
			image.AltText = strings.TrimSpace(image.AltText)
			image.absolutePath = absolutePath
			if image.IsPrimary {
				primaryCount++
			}
		}
		if primaryCount > 1 {
			return fmt.Errorf("product %s must not have more than one primary image", product.Slug)
		}
		if primaryCount == 0 {
			product.Images[0].IsPrimary = true
		}
	}

	return nil
}

func validateImagePath(baseDir, slug, value string) (string, string, error) {
	value = strings.ReplaceAll(strings.TrimSpace(value), "\\", "/")
	if value == "" {
		return "", "", errors.New("image path is required")
	}
	if path.IsAbs(value) || filepath.IsAbs(value) {
		return "", "", errors.New("image path must be relative")
	}

	cleanPath := path.Clean(value)
	if cleanPath == "." || strings.HasPrefix(cleanPath, "../") || strings.HasPrefix(cleanPath, "/") {
		return "", "", errors.New("image path must stay inside the init directory")
	}
	if !fs.ValidPath(cleanPath) {
		return "", "", errors.New("image path is not a valid slash-separated path")
	}

	expectedPrefix := path.Join("img", slug) + "/"
	if !strings.HasPrefix(cleanPath, expectedPrefix) {
		return "", "", fmt.Errorf("image path must be under %s", expectedPrefix)
	}

	switch strings.ToLower(path.Ext(cleanPath)) {
	case ".jpg", ".jpeg", ".png":
	default:
		return "", "", errors.New("image must be a JPG or PNG file")
	}

	absolutePath := filepath.Join(baseDir, filepath.FromSlash(cleanPath))
	rel, err := filepath.Rel(baseDir, absolutePath)
	if err != nil || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || rel == ".." {
		return "", "", errors.New("image path escapes the init directory")
	}

	return cleanPath, absolutePath, nil
}

func validateImageFile(filePath string, maxImageBytes int64) error {
	info, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("image file unavailable: %w", err)
	}
	if info.IsDir() {
		return errors.New("image path points to a directory")
	}
	if info.Size() <= 0 {
		return errors.New("image file is empty")
	}
	if info.Size() > maxImageBytes {
		return fmt.Errorf("image file is too large: %d bytes exceeds %d", info.Size(), maxImageBytes)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("read image file: %w", err)
	}

	expectedContentType, err := expectedContentType(filePath)
	if err != nil {
		return err
	}
	detectedContentType := http.DetectContentType(data)
	if detectedContentType != expectedContentType {
		return fmt.Errorf("image content type %s does not match extension %s", detectedContentType, expectedContentType)
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("decode image header: %w", err)
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		return errors.New("image dimensions are invalid")
	}
	if !formatMatchesContentType(format, expectedContentType) {
		return fmt.Errorf("image format %s does not match extension %s", format, expectedContentType)
	}

	return nil
}

func expectedContentType(filePath string) (string, error) {
	switch strings.ToLower(filepath.Ext(filePath)) {
	case ".jpg", ".jpeg":
		return "image/jpeg", nil
	case ".png":
		return "image/png", nil
	default:
		return "", errors.New("image must be a JPG or PNG file")
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

func canReplaceExistingCatalog(products []domains.Product) bool {
	if len(products) == 0 {
		return true
	}
	if len(products) != len(fallbackProductIDs) {
		return false
	}

	for _, product := range products {
		expectedSlug, ok := fallbackProductIDs[product.ID]
		if !ok || product.Slug != expectedSlug {
			return false
		}
	}

	return true
}

func rollbackCreatedProducts(store ports.Store, productIDs []string) {
	for i := len(productIDs) - 1; i >= 0; i-- {
		_ = store.DeleteProduct(productIDs[i])
	}
}

func normalizeCatalogPath(filePath string) string {
	filePath = strings.TrimSpace(filePath)
	if filePath == "" {
		return DefaultPath
	}

	return filePath
}

func normalizeMaxImages(maxImages int) int {
	if maxImages <= 0 {
		return defaultMaxImages
	}

	return maxImages
}

func normalizeMaxImageBytes(maxImageBytes int64) int64 {
	if maxImageBytes <= 0 {
		return defaultMaxFileSize
	}

	return maxImageBytes
}

func ensureSingleJSONValue(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err == nil {
		return errors.New("decode init catalog: multiple JSON values found")
	} else if !errors.Is(err, io.EOF) {
		return fmt.Errorf("decode init catalog: %w", err)
	}

	return nil
}
