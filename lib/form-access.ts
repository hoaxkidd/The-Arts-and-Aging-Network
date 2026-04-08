import { isValidRole, normalizeRoleList } from "@/lib/roles"

type TemplateAccessInput = {
  isActive: boolean
  isPublic: boolean
  allowedRoles: string | null
}

export function parseAllowedRolesCsv(allowedRoles: string | null): string[] {
  if (!allowedRoles) return []
  return normalizeRoleList(
    allowedRoles
      .split(',')
      .map((r) => r.trim())
      .filter((r) => isValidRole(r))
  )
}

type AccessCheck = {
  /** Roles from the session; used for any-role matching. */
  roles: string[]
  /** If true, treat public templates as inaccessible to HOME_ADMIN. */
  isHomeAdmin?: boolean
}

/** Strict, deny-by-default template access check. */
export function canAccessTemplate(template: TemplateAccessInput, ctx: AccessCheck): boolean {
  const roles = Array.isArray(ctx.roles) ? ctx.roles.filter((r) => typeof r === 'string') : []

  if (roles.includes('ADMIN')) return true
  if (!template.isActive) return false

  const allowed = parseAllowedRolesCsv(template.allowedRoles)

  // If roles are explicitly assigned, enforce them (even if the template is marked Public).
  // This prevents role-scoped templates from leaking into other role portals.
  if (allowed.length > 0) {
    return roles.some((r) => allowed.includes(r))
  }

  // Preserve existing home-admin policy: public templates aren't shown in /dashboard/forms
  // unless they are explicitly role-scoped (handled above).
  if (ctx.isHomeAdmin && template.isPublic) return false

  if (template.isPublic) return true

  // Private template: empty allowedRoles means deny all non-admins (strict).
  return false
}

