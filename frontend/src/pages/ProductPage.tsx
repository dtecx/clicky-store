import {
  CheckCircle2,
  ChevronRight,
  Edit3,
  Headphones,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getProductBySlug, listProducts } from '../api/products'
import { Container } from '../components/layout/Container'
import { ProductGallery } from '../components/product/ProductGallery'
import { RelatedProducts } from '../components/product/RelatedProducts'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../state/useAuth'
import { useCart } from '../state/useCart'
import type { Product } from '../types/product'
import { errorMessage, isApiErrorWithStatus } from '../utils/errors'
import { formatCents } from '../utils/money'

function formatDpi(dpi: number): string {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    return ''
  }
  if (dpi >= 1000 && dpi % 1000 === 0) {
    return `${dpi / 1000}K DPI`
  }
  return `${dpi.toLocaleString()} DPI`
}

const trustItems = [
  { icon: Truck, label: 'Free shipping over 200 PLN' },
  { icon: ShieldCheck, label: '2-year manufacturer warranty' },
  { icon: Headphones, label: 'Email support, real humans' },
]

export function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, status: authStatus } = useAuth()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addNotice, setAddNotice] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    setProduct(null)
    setRelated([])
    setQuantity(1)
    setAddError(null)
    setAddNotice(null)

    if (!slug) {
      setNotFound(true)
      setIsLoading(false)
      return () => {
        controller.abort()
      }
    }

    getProductBySlug(slug, { signal: controller.signal })
      .then((item) => {
        setProduct(item)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        if (isApiErrorWithStatus(err, 404)) {
          setNotFound(true)
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
  }, [slug])

  // Once we have the current product, ask the API for siblings in its
  // category. Best-effort; on failure leave the related strip empty.
  useEffect(() => {
    if (!product) {
      return
    }
    const controller = new AbortController()
    listProducts(
      { category: product.category },
      { signal: controller.signal },
    )
      .then((items) => {
        const siblings = items.filter((item) => item.id !== product.id).slice(0, 4)
        setRelated(siblings)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setRelated([])
      })
    return () => {
      controller.abort()
    }
  }, [product])

  if (isLoading) {
    return (
      <Container className="py-10">
        <LoadingState label="Loading product" />
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-10">
        <ErrorState
          action={<LinkButton to="/">Back to store</LinkButton>}
          message={error}
        />
      </Container>
    )
  }

  if (notFound || !product) {
    return (
      <Container className="py-10">
        <EmptyState
          action={<LinkButton to="/">Back to store</LinkButton>}
          title="No matching product"
        >
          The selected mouse could not be found.
        </EmptyState>
      </Container>
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

  async function handleAddToCart() {
    const selectedProduct = product
    if (!selectedProduct) {
      return
    }

    if (authStatus !== 'authenticated') {
      navigate('/login', { state: { from: location } })
      return
    }

    setIsAdding(true)
    setAddError(null)
    setAddNotice(null)
    try {
      await addItem(selectedProduct.id, quantity)
      setAddNotice(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to cart.`)
    } catch (err) {
      setAddError(errorMessage(err))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      {/* Page body. Add bottom padding on mobile so the fixed buy bar never
          covers content. */}
      <Container className="pb-32 pt-6 lg:pb-12 lg:pt-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
        >
          <Link className="transition-colors hover:text-slate-900" to="/">
            Store
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <Link
            className="capitalize transition-colors hover:text-slate-900"
            to={`/?category=${product.category}`}
          >
            {product.category}
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <span className="font-semibold text-slate-900">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
          <ProductGallery product={product} />

          <aside className="space-y-6 lg:sticky lg:top-20">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="capitalize" variant="accent">
                  {product.category}
                </Badge>
                <Badge variant={stockBadge.variant}>{stockBadge.label}</Badge>
                {traits.map((trait) => (
                  <Badge key={trait}>{trait}</Badge>
                ))}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {product.name}
              </h1>
              <div className="mt-3 flex items-baseline gap-3">
                <p className="text-3xl font-bold text-slate-900">
                  {formatCents(product.priceCents, product.currency)}
                </p>
                <p className="text-sm text-slate-500">incl. VAT</p>
              </div>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {product.description}
              </p>
            </div>

            {/* Inline buy box — desktop only. Mobile uses the fixed bottom bar
                rendered outside the container. */}
            <Card className="hidden p-5 lg:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quantity
              </p>
              <div className="mt-2 flex flex-wrap items-stretch gap-3">
                <div className="flex h-12 items-center rounded-lg border border-stone-300 bg-white">
                  <button
                    aria-label="Decrease quantity"
                    className="flex h-12 w-12 items-center justify-center text-slate-700 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                    disabled={!canAddToCart || quantity <= 1 || isAdding}
                    onClick={() => adjustQuantity(-1)}
                    type="button"
                  >
                    <Minus aria-hidden="true" size={18} />
                  </button>
                  <span className="w-10 text-center text-base font-bold">{quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    className="flex h-12 w-12 items-center justify-center text-slate-700 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                    disabled={!canAddToCart || quantity >= maxQuantity || isAdding}
                    onClick={() => adjustQuantity(1)}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={18} />
                  </button>
                </div>
                <Button
                  className="min-w-44 flex-1"
                  disabled={!canAddToCart || isAdding}
                  leftIcon={<ShoppingCart aria-hidden="true" size={18} />}
                  onClick={handleAddToCart}
                  size="lg"
                >
                  {canAddToCart
                    ? isAdding
                      ? 'Adding…'
                      : authStatus === 'authenticated'
                        ? 'Add to cart'
                        : 'Login to add'
                    : 'Sold out'}
                </Button>
              </div>
              {addNotice ? (
                <p className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 aria-hidden="true" size={17} />
                  {addNotice}
                  <Link className="underline underline-offset-2" to="/cart">
                    View cart
                  </Link>
                </p>
              ) : null}
              {addError ? (
                <p className="mt-4 text-sm font-semibold text-red-700">{addError}</p>
              ) : null}

              <ul className="mt-5 space-y-2 border-t border-stone-200 pt-4 text-sm text-slate-600">
                {trustItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li className="flex items-center gap-2" key={item.label}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Icon aria-hidden="true" size={15} />
                      </span>
                      {item.label}
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* Mobile feedback (shows under the title block). The actual
                buy controls are in the fixed bottom bar. */}
            <div className="lg:hidden">
              {addNotice ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 aria-hidden="true" className="mr-1 inline" size={16} />
                  {addNotice}{' '}
                  <Link className="underline underline-offset-2" to="/cart">
                    View cart
                  </Link>
                </div>
              ) : null}
              {addError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {addError}
                </div>
              ) : null}
            </div>

            {isAdmin ? (
              <LinkButton
                leftIcon={<Edit3 aria-hidden="true" size={16} />}
                to="/admin/products"
                variant="secondary"
              >
                Manage products
              </LinkButton>
            ) : null}

            <Card className="overflow-hidden">
              <header className="border-b border-stone-200 bg-stone-50 px-5 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Specifications
                </h2>
              </header>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-stone-200">
                  <SpecRow label="Sensor" value={formatDpi(product.dpi) || '—'} />
                  <SpecRow label="Category" value={product.category} valueClassName="capitalize" />
                  <SpecRow
                    label="Connectivity"
                    value={product.wireless ? 'Wireless' : 'Wired'}
                  />
                  <SpecRow
                    label="Shape"
                    value={product.ergonomic ? 'Ergonomic' : 'Symmetric'}
                  />
                  <SpecRow
                    label="Stock"
                    value={
                      product.stock > 0 ? `${product.stock} available` : 'Out of stock'
                    }
                  />
                </tbody>
              </table>
            </Card>
          </aside>
        </div>

        <RelatedProducts category={product.category} products={related} />
      </Container>

      {/* Fixed bottom buy bar — mobile and tablet only. Sits above the page
          and never overlaps the desktop buy box (hidden at lg+). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(15,23,42,0.06)] lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {product.name}
            </p>
            <p className="text-lg font-bold text-slate-900">
              {formatCents(product.priceCents, product.currency)}
            </p>
          </div>
          <div className="flex h-11 shrink-0 items-center rounded-lg border border-stone-300 bg-white">
            <button
              aria-label="Decrease quantity"
              className="flex h-11 w-10 items-center justify-center text-slate-700 disabled:text-slate-300"
              disabled={!canAddToCart || quantity <= 1 || isAdding}
              onClick={() => adjustQuantity(-1)}
              type="button"
            >
              <Minus aria-hidden="true" size={16} />
            </button>
            <span className="w-7 text-center text-sm font-bold">{quantity}</span>
            <button
              aria-label="Increase quantity"
              className="flex h-11 w-10 items-center justify-center text-slate-700 disabled:text-slate-300"
              disabled={!canAddToCart || quantity >= maxQuantity || isAdding}
              onClick={() => adjustQuantity(1)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
            </button>
          </div>
          <Button
            className="shrink-0"
            disabled={!canAddToCart || isAdding}
            leftIcon={<ShoppingCart aria-hidden="true" size={16} />}
            onClick={handleAddToCart}
            size="md"
          >
            {canAddToCart ? (isAdding ? '…' : 'Add') : 'Sold out'}
          </Button>
        </div>
      </div>
    </>
  )
}

function SpecRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <tr>
      <th className="w-40 bg-stone-50 px-5 py-3 text-left font-semibold text-slate-700">
        {label}
      </th>
      <td className={`px-5 py-3 text-slate-900 ${valueClassName ?? ''}`.trim()}>
        {value}
      </td>
    </tr>
  )
}
