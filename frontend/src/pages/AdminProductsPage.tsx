import {
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createProduct,
  deleteProduct,
  listAdminProducts,
  updateProduct,
} from '../api/admin'
import { ProductImageManager } from '../components/admin/ProductImageManager'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import type { CreateProductRequest, Product, ProductImage } from '../types/product'
import { cn } from '../utils/cn'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'
import {
  fallbackProductImageUrl,
  primaryProductImageUrl,
} from '../utils/productImages'

const categoryOptions = [
  { label: 'All categories', value: '' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Office', value: 'office' },
]

const fieldClass =
  'h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'
const labelClass = 'text-sm font-semibold text-slate-700'

type ProductForm = {
  name: string
  slug: string
  description: string
  category: string
  priceMajor: string
  currency: string
  dpi: string
  wireless: boolean
  ergonomic: boolean
  stock: string
  imageUrl: string
}

type EditorState =
  | {
      form: ProductForm
      mode: 'create'
      slugTouched: boolean
    }
  | {
      form: ProductForm
      mode: 'edit'
      productId: string
      slugTouched: boolean
    }

function emptyProductForm(): ProductForm {
  return {
    name: '',
    slug: '',
    description: '',
    category: 'gaming',
    priceMajor: '0.00',
    currency: 'PLN',
    dpi: '1600',
    wireless: false,
    ergonomic: false,
    stock: '0',
    imageUrl: '',
  }
}

function productToForm(product: Product): ProductForm {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    priceMajor: (product.priceCents / 100).toFixed(2),
    currency: product.currency,
    dpi: String(product.dpi),
    wireless: product.wireless,
    ergonomic: product.ergonomic,
    stock: String(product.stock),
    imageUrl: product.imageUrl,
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function stockBadge(stock: number) {
  if (stock <= 0) {
    return { label: 'Out of stock', variant: 'danger' as const }
  }
  if (stock <= 5) {
    return { label: `${stock} left`, variant: 'warning' as const }
  }
  return { label: 'In stock', variant: 'success' as const }
}

type PayloadResult =
  | { error: string; ok: false }
  | { ok: true; payload: CreateProductRequest }

function buildPayload(form: ProductForm): PayloadResult {
  const name = form.name.trim()
  const slug = form.slug.trim()
  const description = form.description.trim()
  const category = form.category.trim().toLowerCase()
  const currency = form.currency.trim().toUpperCase()
  const price = Number.parseFloat(form.priceMajor.replace(',', '.'))
  const dpi = Number(form.dpi)
  const stock = Number(form.stock)

  if (!name || !slug || !description || !category) {
    return { error: 'Name, slug, description, and category are required.', ok: false }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      error: 'Slug must use lowercase letters, numbers, and single hyphens.',
      ok: false,
    }
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: 'Currency must be a three-letter code such as PLN or USD.', ok: false }
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: 'Price must be greater than zero.', ok: false }
  }
  if (!Number.isInteger(dpi) || dpi <= 0) {
    return { error: 'DPI must be a positive whole number.', ok: false }
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: 'Stock must be zero or a positive whole number.', ok: false }
  }

  return {
    ok: true,
    payload: {
      name,
      slug,
      description,
      category,
      priceCents: Math.round(price * 100),
      currency,
      dpi,
      wireless: form.wireless,
      ergonomic: form.ergonomic,
      stock,
      imageUrl: form.imageUrl.trim(),
    },
  }
}

function sortByName(products: Product[]): Product[] {
  return [...products].sort((a, b) => a.name.localeCompare(b.name))
}

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listAdminProducts({
      category: category || undefined,
      q: query || undefined,
    })
      .then((items) => {
        if (!cancelled) {
          setProducts(items)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProducts([])
          setError(errorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [category, query, reloadToken])

  const visibleProducts = useMemo(() => products ?? [], [products])
  const editorProduct = useMemo(() => {
    if (editor?.mode !== 'edit') {
      return null
    }
    return products?.find((product) => product.id === editor.productId) ?? null
  }, [editor, products])

  function startCreate() {
    setEditor({ form: emptyProductForm(), mode: 'create', slugTouched: false })
    setFormError(null)
    setActionError(null)
    setNotice(null)
  }

  function startEdit(product: Product) {
    setEditor({
      form: productToForm(product),
      mode: 'edit',
      productId: product.id,
      slugTouched: true,
    })
    setFormError(null)
    setActionError(null)
    setNotice(null)
  }

  function updateForm<K extends keyof ProductForm>(field: K, value: ProductForm[K]) {
    setEditor((current) => {
      if (!current) {
        return current
      }
      return {
        ...current,
        form: {
          ...current.form,
          [field]: value,
        },
      }
    })
  }

  function updateName(value: string) {
    setEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        form: {
          ...current.form,
          name: value,
          slug: current.slugTouched ? current.form.slug : slugify(value),
        },
      }
    })
  }

  function updateSlug(value: string) {
    setEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        form: {
          ...current.form,
          slug: value.toLowerCase().replace(/\s+/g, '-'),
        },
        slugTouched: true,
      }
    })
  }

  function resetFilters() {
    setCategory('')
    setQuery('')
    setSearchInput('')
  }

  function refreshProducts() {
    setReloadToken((current) => current + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor) {
      return
    }

    const result = buildPayload(editor.form)
    if (!result.ok) {
      setFormError(result.error)
      return
    }

    setIsSaving(true)
    setFormError(null)
    setActionError(null)
    setNotice(null)
    try {
      const saved =
        editor.mode === 'create'
          ? await createProduct(result.payload)
          : await updateProduct(editor.productId, result.payload)

      setProducts((current) => {
        if (!current) {
          return [saved]
        }
        return sortByName([...current.filter((product) => product.id !== saved.id), saved])
      })
      setEditor(null)
      setNotice(`${saved.name} saved.`)
      refreshProducts()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) {
      return
    }

    setDeletingProductId(product.id)
    setActionError(null)
    setNotice(null)
    try {
      await deleteProduct(product.id)
      setProducts((current) =>
        current ? current.filter((item) => item.id !== product.id) : current,
      )
      if (editor?.mode === 'edit' && editor.productId === product.id) {
        setEditor(null)
      }
      setNotice(`${product.name} deleted.`)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setDeletingProductId(null)
    }
  }

  function handleImagesChange(productId: string, images: ProductImage[]) {
    const primaryImage = images.find((image) => image.isPrimary) ?? images[0]
    const imageUrl = primaryImage?.url ?? ''

    setProducts((current) =>
      current
        ? current.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  imageUrl,
                  images,
                }
              : product,
          )
        : current,
    )
    setEditor((current) => {
      if (!current || current.mode !== 'edit' || current.productId !== productId) {
        return current
      }

      return {
        ...current,
        form: {
          ...current.form,
          imageUrl,
        },
      }
    })
  }

  return (
    <PageShell
      actions={
        <>
          <Button
            leftIcon={<RefreshCw aria-hidden="true" size={18} />}
            onClick={refreshProducts}
            variant="secondary"
          >
            Refresh
          </Button>
          <Button leftIcon={<Plus aria-hidden="true" size={18} />} onClick={startCreate}>
            New product
          </Button>
        </>
      }
      bare
      description="Create, edit, and manage every mouse in the catalog."
      eyebrow="Admin"
      title="Products"
    >
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-400/10 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex flex-1 flex-col gap-3 sm:flex-row" onSubmit={(event) => {
          event.preventDefault()
          setQuery(searchInput.trim())
        }}>
          <label className="flex-1">
            <span className="sr-only">Search products</span>
            <span className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-slate-500">
              <Search aria-hidden="true" size={18} />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search products"
                type="search"
                value={searchInput}
              />
            </span>
          </label>
          <label className="sm:w-48">
            <span className="sr-only">Category</span>
            <select
              className={fieldClass}
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {categoryOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button size="sm" type="submit" variant="secondary">
              Search
            </Button>
            <Button onClick={resetFilters} size="sm" type="button" variant="ghost">
              Reset
            </Button>
          </div>
        </form>
        <p className="text-sm font-semibold text-slate-600">
          {visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      {notice ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}
      {actionError ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      ) : null}

      {editor ? (
        <Card className="mb-6 p-5">
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {editor.mode === 'create' ? 'New product' : 'Edit product'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {editor.mode === 'create' ? 'Create a catalog listing.' : editor.productId}
                </p>
              </div>
              <Button
                leftIcon={<X aria-hidden="true" size={17} />}
                onClick={() => setEditor(null)}
                type="button"
                variant="ghost"
              >
                Close
              </Button>
            </div>

            {formError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className={labelClass}>Name</span>
                <input
                  className={fieldClass}
                  onChange={(event) => updateName(event.target.value)}
                  placeholder="Viper X1 Gaming Mouse"
                  value={editor.form.name}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Slug</span>
                <input
                  className={fieldClass}
                  onChange={(event) => updateSlug(event.target.value)}
                  placeholder="viper-x1-gaming-mouse"
                  value={editor.form.slug}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Category</span>
                <select
                  className={fieldClass}
                  onChange={(event) => updateForm('category', event.target.value)}
                  value={editor.form.category}
                >
                  <option value="gaming">Gaming</option>
                  <option value="office">Office</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Image URL</span>
                <input
                  className={fieldClass}
                  onChange={(event) => updateForm('imageUrl', event.target.value)}
                  placeholder="/assets/products/product-generic.svg"
                  value={editor.form.imageUrl}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Price</span>
                <input
                  className={fieldClass}
                  min="0.01"
                  onChange={(event) => updateForm('priceMajor', event.target.value)}
                  step="0.01"
                  type="number"
                  value={editor.form.priceMajor}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Currency</span>
                <input
                  className={fieldClass}
                  maxLength={3}
                  onChange={(event) => updateForm('currency', event.target.value.toUpperCase())}
                  placeholder="PLN"
                  value={editor.form.currency}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>DPI</span>
                <input
                  className={fieldClass}
                  min="1"
                  onChange={(event) => updateForm('dpi', event.target.value)}
                  type="number"
                  value={editor.form.dpi}
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Stock</span>
                <input
                  className={fieldClass}
                  min="0"
                  onChange={(event) => updateForm('stock', event.target.value)}
                  type="number"
                  value={editor.form.stock}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className={labelClass}>Description</span>
              <textarea
                className={cn(fieldClass, 'min-h-28 py-3')}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Describe the mouse for the product page."
                value={editor.form.description}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700">
                <input
                  checked={editor.form.wireless}
                  className="h-4 w-4 accent-emerald-700"
                  onChange={(event) => updateForm('wireless', event.target.checked)}
                  type="checkbox"
                />
                Wireless
              </label>
              <label className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700">
                <input
                  checked={editor.form.ergonomic}
                  className="h-4 w-4 accent-emerald-700"
                  onChange={(event) => updateForm('ergonomic', event.target.checked)}
                  type="checkbox"
                />
                Ergonomic
              </label>
            </div>

            {editor.mode === 'edit' && editorProduct ? (
              <ProductImageManager
                onImagesChange={(images) => handleImagesChange(editor.productId, images)}
                product={editorProduct}
              />
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-5">
              <Button
                disabled={isSaving}
                leftIcon={<Save aria-hidden="true" size={17} />}
                type="submit"
              >
                {isSaving ? 'Saving...' : 'Save product'}
              </Button>
              <Button onClick={() => setEditor(null)} type="button" variant="secondary">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading && !products ? (
        <LoadingState label="Loading products" />
      ) : error ? (
        <ErrorState message={error} title="Products unavailable" />
      ) : visibleProducts.length === 0 ? (
        <Card className="p-5">
          <EmptyState title="No products found">
            Create a product or adjust the current filters.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 whitespace-nowrap">Price</th>
                  <th className="px-4 py-3 whitespace-nowrap">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {visibleProducts.map((product) => {
                  const stock = stockBadge(product.stock)
                  const imageUrl = primaryProductImageUrl(product)

                  return (
                    <tr
                      className="transition-colors hover:bg-stone-50"
                      key={product.id}
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-xl bg-stone-50 object-contain p-1.5"
                            onError={(event) => {
                              event.currentTarget.src = fallbackProductImageUrl
                            }}
                            src={imageUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs capitalize text-slate-500">
                              {product.category} · {product.dpi.toLocaleString()} DPI
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {formatCents(product.priceCents, product.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={stock.variant}>{stock.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <LinkButton
                            aria-label={`View ${product.name}`}
                            className="!px-2"
                            size="sm"
                            to={`/products/${product.slug}`}
                            variant="ghost"
                          >
                            <ExternalLink aria-hidden="true" size={16} />
                          </LinkButton>
                          <Button
                            aria-label={`Edit ${product.name}`}
                            className="!px-2"
                            onClick={() => startEdit(product)}
                            size="sm"
                            variant="secondary"
                          >
                            <Edit3 aria-hidden="true" size={16} />
                          </Button>
                          <Button
                            aria-label={`Delete ${product.name}`}
                            className="!px-2"
                            disabled={deletingProductId === product.id}
                            onClick={() => void handleDelete(product)}
                            size="sm"
                            variant="danger"
                          >
                            <Trash2 aria-hidden="true" size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  )
}
