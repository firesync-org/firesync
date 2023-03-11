// Roles in order of increasing access
const rolesArray = ['read', 'write', 'admin'] as const

export const roles = new Set(rolesArray)
export type Role = (typeof rolesArray)[number]

export const isRole = (role: string): role is Role => {
  return roles.has(role as Role)
}

// Higher number means more access - DO NOT RELY ON SPECIFIC NUMBERS THESE MAY CHANGE AS NEW ROLES ARE ADDED
export const rolePrecendence = {
  'read': 1,
  'write': 2,
  'admin': 3
}
