import { Role } from '@firesync/client'

export const displayRole = (role: Role) => {
  if (role === 'admin') return 'Owner'
  if (role === 'write') return 'Editor'
  if (role === 'read') return 'Reader'
  return 'Unknown'
}
