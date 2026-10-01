import { PlaceholderPage } from '@/components/PlaceholderPage'

// Loaded with `lazy` (see src/app/router.tsx): shoppers never download the admin console.
export function AdminPage() {
  return <PlaceholderPage title="Admin" phase={17} />
}
