import { IncomingMessage } from 'http'

export type UserId = number | null

export type AuthInterface = {
  getUserIdFromRequest: (request: IncomingMessage) => Promise<UserId | null>
  canConnect: (request: IncomingMessage, userId: UserId) => Promise<boolean>
  canReadDoc: (userId: UserId, docId: number) => Promise<boolean>
  canWriteDoc: (userId: UserId, docId: number) => Promise<boolean>
}

export const roles = ['admin', 'read', 'write'] as const
export type Role = (typeof roles)[number]

export const isRole = (role: string): role is Role => {
  return (roles as unknown as string[]).indexOf(role) > -1
}
