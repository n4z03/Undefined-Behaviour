// code written by Rupneet (ID: 261096653)

export function detectRoleFromEmail(email) {
  const normalized = email.trim().toLowerCase()
  if (normalized.endsWith('@mcgill.ca')) return 'owner'
  if (normalized.endsWith('@mail.mcgill.ca')) return 'student'
  return null
}

export function isAllowedMcGillEmail(email) {
  return Boolean(detectRoleFromEmail(email))
}
