// code written by Rupneet (ID: 261096653)

// Role values for API / persisted user records (UI labels: Admin / Student)
export const ROLE_OWNER = 'owner' // @mcgill.ca
export const ROLE_USER = 'user' // @mail.mcgill.ca

export function detectRoleFromEmail(email) {
  const normalized = email.trim().toLowerCase()
  if (normalized.endsWith('@mcgill.ca')) return ROLE_OWNER
  if (normalized.endsWith('@mail.mcgill.ca')) return ROLE_USER
  return null
}

export function isAllowedMcGillEmail(email) {
  return Boolean(detectRoleFromEmail(email))
}
