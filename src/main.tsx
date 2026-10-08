import '@/app/tracing'
import '@/app/zodConfig'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AppProviders, createQueryClient } from '@/app/providers'
import { RootErrorBoundary } from '@/app/RootErrorBoundary'
import { createAppRouter } from '@/app/router'
import { logWebVitals } from '@/app/webVitals'
import '@/styles/tokens.css'
import '@/styles/base.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

logWebVitals()

createRoot(root).render(
  <StrictMode>
    <RootErrorBoundary>
      <AppProviders client={createQueryClient()}>
        <RouterProvider router={createAppRouter()} />
      </AppProviders>
    </RootErrorBoundary>
  </StrictMode>,
)
