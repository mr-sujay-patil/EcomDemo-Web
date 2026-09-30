import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProductListPage } from '@/features/catalog/ProductListPage'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

createRoot(root).render(
  <StrictMode>
    <ProductListPage />
  </StrictMode>,
)
