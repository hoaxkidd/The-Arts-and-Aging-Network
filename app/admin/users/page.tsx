import AdminPeopleHomesPage from "@/components/admin/AdminPeopleHomesPage"

export const dynamic = 'force-dynamic'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab: 'team' | 'home-admins' =
    params.tab === 'home-admins' ? params.tab : 'team'

  return <AdminPeopleHomesPage defaultTab={tab} />
}
