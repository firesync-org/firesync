import { db } from '../../db/db'

export const invites = {
  async getInvite(docId: string, token: string, txn = db.knex) {
    return await txn('invite_tokens')
      .where('doc_id', docId)
      .where('token', token)
      .where('expires_at', '>', new Date().toISOString())
      .where('redeemed_at', 'IS', null)
      .first()
  },

  async markAsRedeemed(inviteId: string, docRoleId: string, txn = db.knex) {
    await txn('invite_tokens')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_as_doc_role_id: docRoleId
      })
      .where('id', inviteId)
  }
}
