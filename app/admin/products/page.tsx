import { redirect } from 'next/navigation'

// Product editing now lives on the combined Band Management screen.
export default function AdminProductsRedirect() {
  redirect('/admin/catalog?tab=products')
}
