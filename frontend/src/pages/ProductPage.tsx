import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'
import { demoProducts } from './demoProducts'

export function ProductPage() {
  const { slug } = useParams()
  const product = demoProducts.find((item) => item.slug === slug)

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

  const galleryImages = [product.imageUrl, '/assets/products/product-generic.svg']

  return (
    <PageShell title={product.name}>
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <Link className="hover:text-slate-950" to="/">
          Home
        </Link>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span className="font-semibold text-slate-950">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <Card className="flex min-h-[26rem] items-center justify-center bg-white p-6">
            <img
              alt={product.name}
              className="max-h-[22rem] w-full object-contain"
              src={product.imageUrl}
            />
          </Card>
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
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">{product.category}</Badge>
              <Badge variant={product.stock === 'Limited' ? 'warning' : 'success'}>
                {product.stock}
              </Badge>
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-950">{product.price}</p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {product.description}
            </p>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 items-center rounded-lg border border-stone-300 bg-white">
                <button
                  aria-label="Decrease quantity"
                  className="flex h-12 w-12 items-center justify-center text-slate-700 hover:text-slate-950"
                  type="button"
                >
                  <Minus aria-hidden="true" size={18} />
                </button>
                <span className="w-10 text-center font-semibold">1</span>
                <button
                  aria-label="Increase quantity"
                  className="flex h-12 w-12 items-center justify-center text-slate-700 hover:text-slate-950"
                  type="button"
                >
                  <Plus aria-hidden="true" size={18} />
                </button>
              </div>
              <Button
                className="flex-1"
                leftIcon={<ShoppingCart aria-hidden="true" size={18} />}
                size="lg"
              >
                Add to cart
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
                  <td className="px-4 py-3 text-slate-950">{product.dpi}</td>
                </tr>
                <tr>
                  <th className="bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Category
                  </th>
                  <td className="px-4 py-3 text-slate-950">{product.category}</td>
                </tr>
                <tr>
                  <th className="bg-stone-50 px-4 py-3 font-semibold text-slate-700">
                    Highlights
                  </th>
                  <td className="px-4 py-3 text-slate-950">
                    {product.traits.join(', ')}
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
