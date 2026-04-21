// code written by Rupneet (ID: 261096653)
// code added by Nazifa Ahmed (261112966)

export function detectRoleFromEmail(email) {
  const normalized = email.trim().toLowerCase()
  if (normalized.endsWith('@mcgill.ca')) return 'owner'
  if (normalized.endsWith('@mail.mcgill.ca')) return 'user' // updated from 'student' to 'user' to align w backend
  return null
}

export function isAllowedMcGillEmail(email) {
  return Boolean(detectRoleFromEmail(email))
}
