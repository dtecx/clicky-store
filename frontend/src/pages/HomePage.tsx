import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listProducts } from '../api/products'
import { ProductGrid } from '../components/product/ProductGrid'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import type { Product } from '../types/product'
import { cn } from '../utils/cn'
import { errorMessage } from '../utils/errors'

const categories: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Office', value: 'office' },
  { label: 'Travel', value: 'travel' },
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
      // Trust backend order; in-stock items first as a small UX improvement.
      sorted.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
      break
  }
  return sorted
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') ?? ''
  const queryParam = searchParams.get('q') ?? ''
  const sort: SortOption = isSortOption(searchParams.get('sort') ?? '')
    ? (searchParams.get('sort') as SortOption)
    : 'featured'

  const [searchInput, setSearchInput] = useState(queryParam)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep the search input synced when the URL changes (e.g., via Header search
  // in the future or browser back/forward).
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
  const featuredProduct = sortedProducts[0] ?? null

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

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {featuredProduct?.imageUrl ? (
          <img
            alt=""
            className="absolute inset-y-0 right-0 h-full w-full object-contain object-right opacity-20 sm:opacity-30"
            src={featuredProduct.imageUrl}
          />
        ) : null}
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            {featuredProduct ? (
              <Badge className="border-emerald-500/40 bg-emerald-400/15 capitalize text-emerald-100">
                {featuredProduct.category}
              </Badge>
            ) : null}
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Gaming and office mice
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-200">
              Find precise gaming gear, quiet desk mice, and portable pointers in one focused shop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {featuredProduct ? (
                <LinkButton
                  rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                  size="lg"
                  to={`/products/${featuredProduct.slug}`}
                >
                  View {featuredProduct.name}
                </LinkButton>
              ) : null}
              <LinkButton size="lg" to="/cart" variant="secondary">
                Open cart
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Shop mice</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gaming, office, and travel picks from the current catalog.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
                <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-slate-500 sm:w-72">
                  <Search aria-hidden="true" size={18} />
                  <span className="sr-only">Search products</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name"
                    type="search"
                    value={searchInput}
                  />
                </label>
                <button
                  className="hidden h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 sm:inline-flex"
                  type="submit"
                >
                  Search
                </button>
              </form>
              <label className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700">
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
          <div className="flex flex-wrap gap-2">
            {categories.map((entry) => {
              const isActive = entry.value === category
              return (
                <button
                  className={cn(
                    'h-9 rounded-lg border px-3 text-sm font-semibold transition',
                    isActive
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-50',
                  )}
                  key={entry.value || 'all'}
                  onClick={() => handleCategoryChange(entry.value)}
                  type="button"
                >
                  {entry.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="py-8">
          {isLoading && products === null ? (
            <LoadingState label="Loading products" />
          ) : error ? (
            <ErrorState
              message={error}
              title="We couldn't load products"
            />
          ) : sortedProducts.length === 0 ? (
            <EmptyState title="No matching mice">
              Try clearing the search box or selecting a different category.
            </EmptyState>
          ) : (
            <ProductGrid products={sortedProducts} />
          )}
        </div>
      </section>
    </>
  )
}
