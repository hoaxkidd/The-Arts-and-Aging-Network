// Shared type definitions for the application

// Personnel type used across home management components
export type Personnel = {
  id: string
  name: string
  email: string
  phone: string
  position: string
  isPrimary?: boolean
}
