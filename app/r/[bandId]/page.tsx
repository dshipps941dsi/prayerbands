import { redirect } from 'next/navigation'

export default function NFCRedirect({ params }: { params: { bandId: string } }) {
  redirect(`/register?id=${params.bandId}`)
}