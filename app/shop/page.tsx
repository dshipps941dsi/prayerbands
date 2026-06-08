import { redirect } from 'next/navigation'

// The shop was redesigned and lives at /store now. Send any old links there.
export default function ShopRedirect() {
  redirect('/store')
}
