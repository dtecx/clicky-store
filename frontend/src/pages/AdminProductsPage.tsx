import { Plus } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { demoProducts } from './demoProducts'

export function AdminProductsPage() {
  return (
    <PageShell
      actions={<Button leftIcon={<Plus aria-hidden="true" size={18} />}>New product</Button>}
      eyebrow="Admin"
      title="Products"
    >
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {demoProducts.map((product) => (
                <tr key={product.slug}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        alt=""
                        className="h-12 w-12 rounded-lg bg-stone-50 object-contain p-1"
                        src={product.imageUrl}
                      />
                      <div>
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{product.category}</td>
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    {product.price}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={product.stock === 'Limited' ? 'warning' : 'success'}>
                      {product.stock}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                      <Button size="sm" variant="danger">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
