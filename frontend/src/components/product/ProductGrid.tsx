import type { Product } from '../../types/product'
import { ProductCard } from './ProductCard'

type ProductGridProps = {
  products: Product[]
  onAddToCart?: (product: Product) => void
  pendingProductId?: string | null
}

export function ProductGrid({ products, onAddToCart, pendingProductId }: ProductGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          isAdding={pendingProductId === product.id}
          key={product.id}
          onAddToCart={onAddToCart}
          product={product}
        />
      ))}
    </div>
  )
}
