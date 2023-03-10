import Firesync from '.'

type Invite = {
  token: string
  docKey: string
}

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

  // TODO: Save to localstorage and load for later?
  static loadFromUrl(firesync: Firesync) {
    const invite = this.parseInviteFromUrl()
    if (invite) {
      return new PendingInvite(firesync, invite)
    }
  }

  private static parseInviteFromUrl(): Invite | undefined {
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
}
