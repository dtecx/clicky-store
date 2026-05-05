import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listProducts } from '../api/products'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import type { Product } from '../types/product'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'

const fallbackImageUrl = '/assets/products/product-generic.svg'

function formatDpi(dpi: number): string {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    return ''
  }
  if (dpi >= 1000 && dpi % 1000 === 0) {
    return `${dpi / 1000}K DPI`
  }
  return `${dpi.toLocaleString()} DPI`
}

export function ProductPage() {
  const { slug } = useParams()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Phase 6 will add a dedicated `/api/v1/products/slug/{slug}` lookup; until
  // then the React app fetches the listing and finds the product by slug. The
  // catalog is small, so this is acceptable as an interim step.
  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    listProducts({}, { signal: controller.signal })
      .then((items) => {
        setProducts(items)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setError(errorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })
    return () => {
      controller.abort()
    }
  }, [])

  const product = useMemo(
    () => products?.find((item) => item.slug === slug) ?? null,
    [products, slug],
  )

  if (isLoading) {
    return (
      <PageShell title="Loading product">
        <LoadingState label="Loading product" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="Product unavailable">
        <ErrorState
          action={<LinkButton to="/">Back to store</LinkButton>}
          message={error}
        />
      </PageShell>
    )
  }

  if (!product) {
    return (
      <PageShell title="Product not found">
        <EmptyState
          action={<LinkButton to="/">Back to store</LinkButton>}
          title="No matching product"
        >
          The selected mouse could not be found.
        </EmptyState>
      </PageShell>
    )
  }

  const traits = [
    product.wireless ? 'Wireless' : 'Wired',
    product.ergonomic ? 'Ergonomic' : null,
  ].filter((trait): trait is string => Boolean(trait))
  const stockBadge =
    product.stock <= 0
      ? { label: 'Out of stock', variant: 'danger' as const }
      : product.stock <= 5
        ? { label: `Only ${product.stock} left`, variant: 'warning' as const }
        : { label: 'In stock', variant: 'success' as const }
  const galleryImages = [product.imageUrl || fallbackImageUrl]
  const maxQuantity = Math.max(1, product.stock)
  const canAddToCart = product.stock > 0

  function adjustQuantity(delta: number) {
    setQuantity((current) => {
      const next = current + delta
      if (next < 1) return 1
      if (next > maxQuantity) return maxQuantity
      return next
    })
  }

  return (
    <PageShell title={product.name}>
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Link className="hover:text-slate-950" to="/">
          Home
        </Link>
        <span>/</span>
        <span className="capitalize">{product.category}</span>
        <span>/</span>
        <span className="font-semibold text-slate-950">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <Card className="flex min-h-[26rem] items-center justify-center bg-white p-6">
            <img
              alt={product.name}
              className="max-h-[22rem] w-full object-contain"
              onError={(event) => {
                event.currentTarget.src = fallbackImageUrl
              }}
              src={product.imageUrl || fallbackImageUrl}
            />
          </Card>
          {galleryImages.length > 1 ? (
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((imageUrl) => (
                <button
                  className="flex aspect-square items-center justify-center rounded-lg border border-stone-300 bg-white p-2 hover:border-emerald-700"
                  key={imageUrl}
                  type="button"
                >
                  <img
                    alt=""
                    className="h-full w-full object-contain"
                    src={imageUrl}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="capitalize" variant="accent">
                {product.category}
              </Badge>
              <Badge variant={stockBadge.variant}>{stockBadge.label}</Badge>
              {traits.map((trait) => (
                <Badge key={trait}>{trait}</Badge>
              ))}
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-950">
              {formatCents(product.priceCents, product.currency)}
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {product.description}
            </p>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 items-center rounded-lg border border-stone-300 bg-white">
                <button
                  aria-label="Decrease quantity"
                  className="flex h-12 w-12 items-center justify-center text-slate-700 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                  disabled={!canAddToCart || quantity <= 1}
                  onClick={() => adjustQuantity(-1)}
                  type="button"
                >
                  <Minus aria-hidden="true" size={18} />
                </button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  className="flex h-12 w-12 items-center justify-center text-slate-700 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                  disabled={!canAddToCart || quantity >= maxQuantity}
                  onClick={() => adjustQuantity(1)}
                  type="button"
                >
                  <Plus aria-hidden="true" size={18} />
                </button>
              </div>
              <Button
                className="flex-1"
                disabled={!canAddToCart}
                leftIcon={<ShoppingCart aria-hidden="true" size={18} />}
                size="lg"
              >
                {canAddToCart ? 'Add to cart' : 'Sold out'}
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-stone-200">
                <tr>
                  <th className="w-40 bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Sensor
                  </th>
                  <td className="px-4 py-3 text-slate-950">
                    {formatDpi(product.dpi) || '—'}
                  </td>
                </tr>
                <tr>
                  <th className="bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Category
                  </th>
                  <td className="px-4 py-3 capitalize text-slate-950">
                    {product.category}
                  </td>
                </tr>
                <tr>
                  <th className="bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Connectivity
                  </th>
                  <td className="px-4 py-3 text-slate-950">
                    {product.wireless ? 'Wireless' : 'Wired'}
                  </td>
                </tr>
                <tr>
                  <th className="bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Shape
                  </th>
                  <td className="px-4 py-3 text-slate-950">
                    {product.ergonomic ? 'Ergonomic' : 'Symmetric'}
                  </td>
                </tr>
                <tr>
                  <th className="bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Stock
                  </th>
                  <td className="px-4 py-3 text-slate-950">
                    {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
