import { redirect } from "next/navigation"

export default function ContactsRedirectPage() {
  redirect('/dashboard/profile?tab=facility')
}
