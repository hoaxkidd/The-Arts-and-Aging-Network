import { redirect } from "next/navigation"

type Params = {
  category?: string
  tab?: string
  formsTab?: string
  view?: string
  sort?: string
  search?: string
  status?: string
}

export default async function DashboardFormsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const params = await searchParams
  const query = new URLSearchParams()

  query.set('tab', 'forms')
  query.set('formsTab', params.formsTab || params.tab || 'browse')
  if (params.category) query.set('category', params.category)
  if (params.view) query.set('view', params.view)
  if (params.sort) query.set('sort', params.sort)
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)

  redirect(`/dashboard/profile?${query.toString()}`)
}
