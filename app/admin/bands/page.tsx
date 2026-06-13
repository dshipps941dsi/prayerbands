import { redirect } from 'next/navigation'

// Band operations now live in the Band Mgmt tab on the main admin dashboard.
export default function AdminBandsRedirect() {
  redirect('/admin?tab=catalog&sub=bands')
}
