import AdminPeopleHomesPage from "@/components/admin/AdminPeopleHomesPage"

export const dynamic = 'force-dynamic'

export default async function AdminHomesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab: 'team' | 'home-admins' | 'homes' =
    params.tab === 'team' || params.tab === 'home-admins' ? params.tab : 'homes'

  return <AdminPeopleHomesPage defaultTab={tab} />
}
