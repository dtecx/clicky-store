package main

import (
	"flag"
	"fmt"
	"os"

	"clicky-store/internal/initcatalog"
)

func main() {
	path := flag.String("path", initcatalog.DefaultPath, "path to init catalog JSON")
	maxImages := flag.Int("max-images", 10, "maximum images per product")
	maxImageBytes := flag.Int64("max-image-bytes", 4*1024*1024, "maximum bytes per image")
	flag.Parse()

	catalog, err := initcatalog.Load(*path, *maxImages, *maxImageBytes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "init catalog invalid: %v\n", err)
		os.Exit(1)
	}

	imageCount := 0
	for _, product := range catalog.Products {
		imageCount += len(product.Images)
	}

	fmt.Printf("init catalog valid: %d products, %d images\n", len(catalog.Products), imageCount)
}
