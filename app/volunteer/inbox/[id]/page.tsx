import { redirect } from "next/navigation"

export default async function VolunteerInboxThreadRedirectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  redirect(`/staff/inbox/${id}`)
}
