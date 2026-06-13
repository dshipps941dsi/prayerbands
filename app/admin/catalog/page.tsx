import { redirect } from 'next/navigation'

// Band Management is now a tab on the main admin dashboard.
export default function AdminCatalogRedirect() {
  redirect('/admin?tab=catalog')
}
