import { NextResponse } from 'next/server'
import { getTeamRole } from '@/lib/team'

// The signed-in caller's team role ('admin' | 'fulfillment' | null). Used by the
// admin and fulfill pages to gate access client-side.
export async function GET() {
  const t = await getTeamRole()
  return NextResponse.json({ role: t?.role ?? null })
}
