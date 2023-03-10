
export const roles = ['admin', 'read', 'write'] as const
export type Role = (typeof roles)[number]

export const isRole = (role: string): role is Role => {
  return (roles as unknown as string[]).indexOf(role) > -1
}
