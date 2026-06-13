import { redirect } from 'next/navigation'

// Product editing now lives in the Band Mgmt tab on the main admin dashboard.
export default function AdminProductsRedirect() {
  redirect('/admin?tab=catalog&sub=products')
}
