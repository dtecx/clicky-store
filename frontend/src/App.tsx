import { Route, Routes } from 'react-router-dom'
import { AdminRoute } from './components/layout/AdminRoute'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { AdminProductsPage } from './pages/AdminProductsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductPage } from './pages/ProductPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <div className="min-h-screen bg-stone-100 text-slate-950">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <AdminProductsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrdersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
