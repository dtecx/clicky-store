import { ArrowRight, ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { LinkButton } from '../components/ui/LinkButton'
import { demoProducts, type DemoProduct } from './demoProducts'

const categories = ['Gaming', 'Office', 'Travel', 'Ergonomic']

function ProductCard({ product }: { product: DemoProduct }) {
  return (
    <Card className="overflow-hidden">
      <Link className="block bg-stone-50 p-5" to={`/products/${product.slug}`}>
        <img
          alt={product.name}
          className="mx-auto aspect-square h-44 w-full max-w-56 object-contain"
          loading="lazy"
          src={product.imageUrl}
        />
      </Link>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              className="block truncate text-lg font-bold text-slate-950 hover:text-emerald-800"
              to={`/products/${product.slug}`}
            >
              {product.name}
            </Link>
            <p className="mt-1 text-sm text-slate-600">{product.dpi}</p>
          </div>
          <Badge variant={product.stock === 'Limited' ? 'warning' : 'success'}>
            {product.stock}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.traits.map((trait) => (
            <Badge key={trait}>{trait}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-bold text-slate-950">{product.price}</p>
          <Button leftIcon={<ShoppingCart aria-hidden="true" size={17} />} size="sm">
            Add
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function HomePage() {
  const featured = demoProducts[0]

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-contain object-right opacity-20 sm:opacity-30"
          src={featured.imageUrl}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge className="border-emerald-500/40 bg-emerald-400/15 text-emerald-100">
              {featured.category}
            </Badge>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Gaming and office mice
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-200">
              Find precise gaming gear, quiet desk mice, and portable pointers in one focused shop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton
                rightIcon={<ArrowRight aria-hidden="true" size={18} />}
                size="lg"
                to={`/products/${featured.slug}`}
              >
                View featured
              </LinkButton>
              <LinkButton size="lg" to="/cart" variant="secondary">
                Open cart
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Shop mice</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Gaming, office, and travel picks from the current catalog.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-stone-50"
                key={category}
                type="button"
              >
                {category}
              </button>
            ))}
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-stone-50"
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" size={16} />
              Filters
            </button>
          </div>
        </div>

        <div className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {demoProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </>
  )
}
