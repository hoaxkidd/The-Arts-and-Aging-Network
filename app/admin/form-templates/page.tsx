import { redirect } from "next/navigation"

export default async function FormTemplatesAdminPage() {
  redirect('/admin/forms?tab=templates')
}
