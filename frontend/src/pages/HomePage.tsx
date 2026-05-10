import {
  ArrowRight,
  Headphones,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { listProducts } from '../api/products'
import { Container } from '../components/layout/Container'
import { ProductGrid } from '../components/product/ProductGrid'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { ProductCardSkeleton } from '../components/ui/Skeleton'
import { useAuth } from '../state/useAuth'
import { useCart } from '../state/useCart'
import type { Product } from '../types/product'
import { cn } from '../utils/cn'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'
import {
  fallbackProductImageUrl,
  primaryProductImageUrl,
} from '../utils/productImages'

const categories: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Office', value: 'office' },
]

const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to high', value: 'price_asc' },
  { label: 'Price: High to low', value: 'price_desc' },
  { label: 'Name: A → Z', value: 'name_asc' },
] as const

type SortOption = (typeof sortOptions)[number]['value']

function isSortOption(value: string): value is SortOption {
  return sortOptions.some((option) => option.value === value)
}

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products]
  switch (sort) {
    case 'price_asc':
      sorted.sort((a, b) => a.priceCents - b.priceCents)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.priceCents - a.priceCents)
      break
    case 'name_asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'featured':
    default:
      sorted.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
      break
  }
  return sorted
}

const valueProps = [
  {
    description: 'Tracked shipping across PL · 24h dispatch',
    icon: Truck,
    title: 'Fast delivery',
  },
  {
    description: 'Two-year warranty on every mouse',
    icon: ShieldCheck,
    title: 'Buyer protection',
  },
  {
    description: 'Real specs, honest stock — no marketing fluff',
    icon: Sparkles,
    title: 'Curated catalog',
  },
  {
    description: 'Email support that actually replies',
    icon: Headphones,
    title: 'Friendly help',
  },
]

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { status: authStatus } = useAuth()
  const { addItem } = useCart()
  const category = searchParams.get('category') ?? ''
  const queryParam = searchParams.get('q') ?? ''
  const sort: SortOption = isSortOption(searchParams.get('sort') ?? '')
    ? (searchParams.get('sort') as SortOption)
    : 'featured'

  const [searchInput, setSearchInput] = useState(queryParam)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)
  const [cartNotice, setCartNotice] = useState<string | null>(null)

  useEffect(() => {
    setSearchInput(queryParam)
  }, [queryParam])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    listProducts(
      { category: category || undefined, q: queryParam || undefined },
      { signal: controller.signal },
    )
      .then((items) => {
        setProducts(items)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setProducts([])
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
  }, [category, queryParam])

  const sortedProducts = useMemo(
    () => (products ? sortProducts(products, sort) : []),
    [products, sort],
  )
  const featuredProduct = useMemo(() => {
    if (!products || products.length === 0) {
      return null
    }
    const inStock = products.filter((product) => product.stock > 0)
    return (inStock[0] ?? products[0]) ?? null
  }, [products])

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    setSearchParams(next, { replace: true })
  }

  function handleCategoryChange(value: string) {
    updateSearchParams({ category: value || null })
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({ q: searchInput.trim() || null })
  }

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    updateSearchParams({ sort: event.target.value === 'featured' ? null : event.target.value })
  }

  async function handleAddToCart(product: Product) {
    if (authStatus !== 'authenticated') {
      navigate('/login', { state: { from: location } })
      return
    }

    setPendingProductId(product.id)
    setCartError(null)
    setCartNotice(null)
    try {
      await addItem(product.id, 1)
      setCartNotice(`${product.name} added to cart.`)
    } catch (err) {
      setCartError(errorMessage(err))
    } finally {
      setPendingProductId(null)
    }
  }

  return (
    <>
      <Hero featuredProduct={featuredProduct} />
      <ValueProps />

      <section id="catalog">
        <Container>
          <CategoryRow
            activeCategory={category}
            onSelect={handleCategoryChange}
          />
        </Container>

        <div className="sticky top-16 z-20 border-y border-stone-200 bg-white/90 backdrop-blur">
          <Container className="py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <form className="flex w-full items-center gap-2 md:max-w-md" onSubmit={handleSearchSubmit}>
                <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-slate-500 transition-colors focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
                  <Search aria-hidden="true" size={18} />
                  <span className="sr-only">Search products</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name"
                    type="search"
                    value={searchInput}
                  />
                </label>
                <button
                  className="hidden h-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-50 sm:inline-flex"
                  type="submit"
                >
                  Search
                </button>
              </form>
              <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-900">{sortedProducts.length}</span>{' '}
                  {sortedProducts.length === 1 ? 'mouse' : 'mice'}
                </p>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  <span className="text-slate-500">Sort</span>
                  <select
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
                    onChange={handleSortChange}
                    value={sort}
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </Container>
        </div>

        <Container>
          <div className="py-8">
            {cartNotice ? (
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {cartNotice}{' '}
                <Link className="underline underline-offset-2" to="/cart">
                  View cart
                </Link>
              </div>
            ) : null}
            {cartError ? (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {cartError}
              </div>
            ) : null}

            {isLoading && products === null ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <ErrorState message={error} title="We couldn't load products" />
            ) : sortedProducts.length === 0 ? (
              <EmptyState
                action={
                  <Button
                    onClick={() => {
                      setSearchInput('')
                      updateSearchParams({ q: null, category: null })
                    }}
                    variant="secondary"
                  >
                    Clear filters
                  </Button>
                }
                title="No matching mice"
              >
                Try clearing the search box or selecting a different category.
              </EmptyState>
            ) : (
              <ProductGrid
                onAddToCart={handleAddToCart}
                pendingProductId={pendingProductId}
                products={sortedProducts}
              />
            )}
          </div>
        </Container>
      </section>
    </>
  )
}

function Hero({ featuredProduct }: { featuredProduct: Product | null }) {
  const featuredImageUrl = featuredProduct
    ? primaryProductImageUrl(featuredProduct, '')
    : ''

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_85%_75%,rgba(56,189,248,0.12),transparent_55%)]" />
      <Container className="relative py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="max-w-2xl">
            <Badge
              className="border-emerald-400/30 bg-emerald-400/15 text-emerald-100"
              variant="success"
            >
              <Sparkles aria-hidden="true" size={13} />
              New season · curated mice
            </Badge>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Click better.
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">
                Work and play smoother.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">
              Honest specs, real stock counts, and a single focused catalog of gaming and office
              mice. Find the one that fits your hand and ship it the same day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton
                rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                size="lg"
                to="#catalog"
              >
                Shop the catalog
              </LinkButton>
              {featuredProduct ? (
                <LinkButton
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                  size="lg"
                  to={`/products/${featuredProduct.slug}`}
                  variant="secondary"
                >
                  Featured: {featuredProduct.name}
                </LinkButton>
              ) : null}
            </div>
          </div>

          {featuredProduct ? (
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:block">
              <div className="flex items-center justify-center rounded-xl bg-white/95 p-6">
                <img
                  alt=""
                  className="h-56 w-full max-w-xs object-contain"
                  onError={(event) => {
                    event.currentTarget.src = fallbackProductImageUrl
                  }}
                  src={featuredImageUrl || fallbackProductImageUrl}
                />
              </div>
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                  Featured pick
                </p>
                <p className="mt-1 text-lg font-bold text-white">{featuredProduct.name}</p>
                <p className="mt-1 text-sm text-stone-200">
                  From{' '}
                  <span className="font-bold text-white">
                    {formatCents(featuredProduct.priceCents, featuredProduct.currency)}
                  </span>
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}

function ValueProps() {
  return (
    <section className="border-b border-stone-200 bg-white">
      <Container className="py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {valueProps.map((prop) => {
            const Icon = prop.icon
            return (
              <div className="flex items-start gap-3" key={prop.title}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{prop.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">{prop.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

function CategoryRow({
  activeCategory,
  onSelect,
}: {
  activeCategory: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Browse the shop
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Find your fit
          </h2>
        </div>
      </div>
      <div className="mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {categories.map((entry) => {
          const isActive = entry.value === activeCategory
          return (
            <button
              className={cn(
                'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-stone-200 bg-white text-slate-700 hover:border-stone-300 hover:bg-stone-50',
              )}
              key={entry.value || 'all'}
              onClick={() => onSelect(entry.value)}
              type="button"
            >
              {entry.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
