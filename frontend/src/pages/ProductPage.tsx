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
import { getProductBySlug } from '../api/products'
import { PageShell } from '../components/layout/PageShell'
import { ProductGallery } from '../components/product/ProductGallery'
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
  const { status: authStatus, isAdmin } = useAuth()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
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

  if (notFound || !product) {
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
    <PageShell
      breadcrumbs={
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
        >
          <Link className="transition-colors hover:text-slate-950" to="/">
            Store
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <Link
            className="capitalize transition-colors hover:text-slate-950"
            to={`/?category=${product.category}`}
          >
            {product.category}
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <span className="font-semibold text-slate-900">{product.name}</span>
        </nav>
      }
      hideHeader
      title={product.name}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
        <ProductGallery product={product} />

        <aside className="space-y-6 lg:sticky lg:top-32">
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
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {product.name}
            </h1>
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-3xl font-bold text-slate-950">
                {formatCents(product.priceCents, product.currency)}
              </p>
              <p className="text-sm text-slate-500">incl. VAT</p>
            </div>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {product.description}
            </p>
          </div>

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Quantity
            </p>
            <div className="mt-2 flex flex-wrap items-stretch gap-3">
              <div className="flex h-12 items-center rounded-lg border border-stone-300 bg-white">
                <button
                  aria-label="Decrease quantity"
                  className="flex h-12 w-12 items-center justify-center text-slate-700 transition-colors hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                  disabled={!canAddToCart || quantity <= 1 || isAdding}
                  onClick={() => adjustQuantity(-1)}
                  type="button"
                >
                  <Minus aria-hidden="true" size={18} />
                </button>
                <span className="w-10 text-center text-base font-bold">{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  className="flex h-12 w-12 items-center justify-center text-slate-700 transition-colors hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                  disabled={!canAddToCart || quantity >= maxQuantity || isAdding}
                  onClick={() => adjustQuantity(1)}
                  type="button"
                >
                  <Plus aria-hidden="true" size={18} />
                </button>
              </div>
              <Button
                className="flex-1 min-w-44"
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
    </PageShell>
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
      <th className="w-40 bg-stone-50/60 px-5 py-3 text-left font-semibold text-slate-700">
        {label}
      </th>
      <td className={`px-5 py-3 text-slate-950 ${valueClassName ?? ''}`.trim()}>
        {value}
      </td>
    </tr>
  )
}
