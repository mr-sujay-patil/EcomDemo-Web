import { NavLink, Navigate, Route, Routes } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { ImportPage } from './ImportPage'
import { ProductFormPage } from './ProductFormPage'
import { ProductsAdminPage } from './ProductsAdminPage'
import { SearchIndexPage } from './SearchIndexPage'
import { StockPage } from './StockPage'
import './admin.css'

const SECTIONS = [
  { to: 'products', label: 'Products' },
  { to: 'stock', label: 'Stock' },
  { to: 'import', label: 'Import' },
  { to: 'search-index', label: 'Search index' },
] as const

// Loaded with `lazy` (see src/app/router.tsx): shoppers never download the admin console. The route is `admin/*`, so
// the sections are routed here, inside the one lazy chunk.
export function AdminPage() {
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin sections">
        <ul>
          {SECTIONS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to}>{label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="admin-main">
        <Routes>
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<ProductsAdminPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="search-index" element={<SearchIndexPage />} />
          <Route path="*" element={<PlaceholderPage title="Not found" phase={17} />} />
        </Routes>
      </div>
    </div>
  )
}
