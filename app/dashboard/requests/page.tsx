import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export default async function HomeRequestsRedirectPage({ searchParams }: Props) {
  const params = await searchParams
  const tab = params.tab || "all"
  redirect(`/dashboard/my-bookings?section=requests&tab=${encodeURIComponent(tab)}`)
}
