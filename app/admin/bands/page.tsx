import { redirect } from 'next/navigation'

// Band operations now live on the combined Band Management screen.
export default function AdminBandsRedirect() {
  redirect('/admin/catalog?tab=bands')
}
