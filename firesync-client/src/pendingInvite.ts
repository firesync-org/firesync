import Firesync from '.'

type Invite = {
  token: string
  docKey: string
}

const INVITE_KEY = 'firesync-invite'

export class PendingInvite {
  firesync: Firesync
  invite: Invite

  constructor(firesync: Firesync, invite: Invite) {
    this.firesync = firesync
    this.invite = invite
  }

  async accept() {
    await this.firesync.redeemInvite(this.invite.docKey, this.invite.token)
    this.firesync.pendingInvite = undefined
  }

  ignore() {
    PendingInvite.clearSessionStorage()
    this.firesync.pendingInvite = undefined
  }

  static load(firesync: Firesync) {
    let invite = this.getInviteFromUrl()
    if (invite) {
      this.saveInviteToSessionStorage(invite)
    } else {
      invite = this.getInviteFromSessionStorage()
    }

    if (invite) {
      return new PendingInvite(firesync, invite)
    }
  }

  private static getInviteFromUrl(): Invite | undefined {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(
      window.location.hash.substring(1) // skip the first char (#)
    )

    if (params.get('firesync_flow') === 'redeem_invite') {
      const token = params.get('token')
      const docKey = params.get('doc_key')
      if (token && docKey) {
        window.location.hash = ''
        return { token, docKey }
      }
    }
  }

  private static getInviteFromSessionStorage(): Invite | undefined {
    if (typeof window === 'undefined') {
      return
    }
    const storage = window.sessionStorage

    const invite = storage.getItem(INVITE_KEY)
    if (invite) {
      const { token, docKey } = JSON.parse(invite) as Partial<Invite>
      if (token && docKey) {
        return { token, docKey }
      }
    }
  }

  private static saveInviteToSessionStorage(invite: Invite) {
    if (typeof window === 'undefined') {
      return
    }
    const storage = window.sessionStorage
    storage.setItem(INVITE_KEY, JSON.stringify(invite))
  }

  private static clearSessionStorage() {
    if (typeof window === 'undefined') {
      return
    }
    window.sessionStorage.removeItem(INVITE_KEY)
  }
}
