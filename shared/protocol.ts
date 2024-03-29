import { decoding, encoding } from 'lib0'
import { BadRequestError } from './errors'

type SessionDocId = string
type YjsUpdate = Uint8Array
type YjsStateVector = Uint8Array
type AwarenessUpdate = Uint8Array

export enum MessageType {
  HANDSHAKE_REQUEST = 50,
  HANDSHAKE_RESPONSE = 51,
  SUBSCRIBE_REQUEST = 0,
  SUBSCRIBE_RESPONSE = 1,
  SUBSCRIBE_ERROR = 2,
  UNSUBSCRIBE_REQUEST = 3,
  UNSUBSCRIBE_RESPONSE = 4,
  UNSUBSCRIBE_ERROR = 5,
  SYNC_STATE_VECTOR = 10,
  UPDATE = 20,
  UPDATE_ACK = 21,
  UPDATE_ERROR = 22,
  ERROR_RESYNC = 30,
  ERROR_FATAL = 31,
  AWARENESS_UPDATE = 40
}

export type HandshakeRequestMessage = {
  messageType: MessageType.HANDSHAKE_REQUEST,
  protocolVersion: number,
  userAgent: string
}

export type HandshakeResponseMessage = {
  messageType: MessageType.HANDSHAKE_RESPONSE
}

export type SubscribeRequestMessage = {
  messageType: MessageType.SUBSCRIBE_REQUEST
  docKey: string
}

export type SubscribeResponseMessage = {
  messageType: MessageType.SUBSCRIBE_RESPONSE
  docKey: string
  sessionDocId: SessionDocId
}

export type SubscribeErrorMessage = {
  messageType: MessageType.SUBSCRIBE_ERROR
  docKey: string
  errorType: string
  errorMessage: string
}

export type UnsubscribeRequestMessage = {
  messageType: MessageType.UNSUBSCRIBE_REQUEST
  sessionDocId: SessionDocId
}

export type UnsubscribeResponseMessage = {
  messageType: MessageType.UNSUBSCRIBE_RESPONSE
  sessionDocId: SessionDocId
}

export type UnsubscribeErrorMessage = {
  messageType: MessageType.UNSUBSCRIBE_ERROR
  sessionDocId: SessionDocId
  errorType: string
  errorMessage: string
}

export type StateVectorMessage = {
  messageType: MessageType.SYNC_STATE_VECTOR
  sessionDocId: SessionDocId
  stateVector: YjsStateVector
}

export type UpdateMessage = {
  messageType: MessageType.UPDATE
  updateId: number
  updates: Map<SessionDocId, YjsUpdate>
}

export type UpdateAckMessage = {
  messageType: MessageType.UPDATE_ACK
  updateId: number
}

export type UpdateErrorMessage = {
  messageType: MessageType.UPDATE_ERROR
  updateId: number
  errorType: string
  errorMessage: string
}

export type ErrorResyncMessage = {
  messageType: MessageType.ERROR_RESYNC
  sessionDocId: SessionDocId
  errorType: string
  errorMessage: string
}

export type ErrorFatalMessage = {
  messageType: MessageType.ERROR_FATAL
  errorType: string
  errorMessage: string
}

export type AwarenessUpdateMessage = {
  messageType: MessageType.AWARENESS_UPDATE,
  sessionDocId: SessionDocId,
  update: AwarenessUpdate
}

export type Message =
  | HandshakeRequestMessage
  | HandshakeResponseMessage
  | SubscribeRequestMessage
  | SubscribeResponseMessage
  | SubscribeErrorMessage
  | UnsubscribeRequestMessage
  | UnsubscribeResponseMessage
  | UnsubscribeErrorMessage
  | StateVectorMessage
  | UpdateMessage
  | UpdateAckMessage
  | UpdateErrorMessage
  | ErrorResyncMessage
  | ErrorFatalMessage
  | AwarenessUpdateMessage

export const decodeMessage = (message: Uint8Array): Message => {
  const decoder = decoding.createDecoder(message)
  const messageType = decoding.readVarUint(decoder)
  switch (messageType) {
    case MessageType.HANDSHAKE_REQUEST: {
      const protocolVersion = decoding.readUint8(decoder)
      const userAgent = decoding.readVarString(decoder)
      return {
        messageType,
        protocolVersion,
        userAgent
      }
    }
    case MessageType.HANDSHAKE_RESPONSE: {
      return {
        messageType
      }
    }
    case MessageType.SUBSCRIBE_REQUEST: {
      const docKey = decoding.readVarString(decoder)
      return {
        messageType,
        docKey
      }
    }
    case MessageType.SUBSCRIBE_RESPONSE: {
      const docKey = decoding.readVarString(decoder)
      const sessionDocId = decoding.readVarString(decoder)
      return {
        messageType,
        docKey,
        sessionDocId
      }
    }
    case MessageType.SUBSCRIBE_ERROR: {
      const docKey = decoding.readVarString(decoder)
      const errorType = decoding.readVarString(decoder)
      const errorMessage = decoding.readVarString(decoder)
      return {
        messageType,
        docKey,
        errorType,
        errorMessage
      }
    }
    case MessageType.UNSUBSCRIBE_REQUEST: {
      const sessionDocId = decoding.readVarString(decoder)
      return {
        messageType,
        sessionDocId
      }
    }
    case MessageType.UNSUBSCRIBE_RESPONSE: {
      const sessionDocId = decoding.readVarString(decoder)
      return {
        messageType,
        sessionDocId
      }
    }
    case MessageType.UNSUBSCRIBE_ERROR: {
      const sessionDocId = decoding.readVarString(decoder)
      const errorType = decoding.readVarString(decoder)
      const errorMessage = decoding.readVarString(decoder)
      return {
        messageType,
        sessionDocId,
        errorType,
        errorMessage
      }
    }
    case MessageType.SYNC_STATE_VECTOR: {
      const sessionDocId = decoding.readVarString(decoder)
      const stateVector = decoding.readVarUint8Array(decoder)
      return {
        messageType,
        sessionDocId,
        stateVector
      }
    }
    case MessageType.UPDATE: {
      const updateId = decoding.readVarUint(decoder)
      const updatesSize = decoding.readVarUint(decoder)
      const updates = new Map<SessionDocId, YjsUpdate>()
      for (let i = 0; i < updatesSize; i++) {
        const sessionDocId = decoding.readVarString(decoder)
        const update = decoding.readVarUint8Array(decoder)
        updates.set(sessionDocId, update)
      }
      return {
        messageType,
        updateId,
        updates
      }
    }
    case MessageType.UPDATE_ACK: {
      const updateId = decoding.readVarUint(decoder)
      return {
        messageType,
        updateId
      }
    }
    case MessageType.UPDATE_ERROR: {
      const updateId = decoding.readVarUint(decoder)
      const errorType = decoding.readVarString(decoder)
      const errorMessage = decoding.readVarString(decoder)
      return {
        messageType,
        updateId,
        errorType,
        errorMessage
      }
    }
    case MessageType.ERROR_RESYNC: {
      const sessionDocId = decoding.readVarString(decoder)
      const errorType = decoding.readVarString(decoder)
      const errorMessage = decoding.readVarString(decoder)
      return {
        messageType,
        sessionDocId,
        errorType,
        errorMessage
      }
    }
    case MessageType.ERROR_FATAL: {
      const errorType = decoding.readVarString(decoder)
      const errorMessage = decoding.readVarString(decoder)
      return {
        messageType,
        errorType,
        errorMessage
      }
    }
    case MessageType.AWARENESS_UPDATE: {
      const sessionDocId = decoding.readVarString(decoder)
      const update = decoding.readVarUint8Array(decoder)
      return {
        messageType,
        sessionDocId,
        update
      }
    }
    default:
      throw new BadRequestError(`Unknown message type: ${messageType}`)
  }
}

export const encodeMessage = (message: Message): Uint8Array => {
  const encoder = encoding.createEncoder()

  encoding.writeVarUint(encoder, message.messageType)
  switch (message.messageType) {
    case MessageType.HANDSHAKE_REQUEST: {
      encoding.writeUint8(encoder, message.protocolVersion)
      encoding.writeVarString(encoder, message.userAgent)
      break
    }
    case MessageType.HANDSHAKE_RESPONSE: {
      break
    }
    case MessageType.SUBSCRIBE_REQUEST: {
      encoding.writeVarString(encoder, message.docKey)
      break
    }
    case MessageType.SUBSCRIBE_RESPONSE: {
      encoding.writeVarString(encoder, message.docKey)
      encoding.writeVarString(encoder, message.sessionDocId)
      break
    }
    case MessageType.SUBSCRIBE_ERROR: {
      encoding.writeVarString(encoder, message.docKey)
      encoding.writeVarString(encoder, message.errorType)
      encoding.writeVarString(encoder, message.errorMessage)
      break
    }
    case MessageType.UNSUBSCRIBE_REQUEST: {
      encoding.writeVarString(encoder, message.sessionDocId)
      break
    }
    case MessageType.UNSUBSCRIBE_RESPONSE: {
      encoding.writeVarString(encoder, message.sessionDocId)
      break
    }
    case MessageType.UNSUBSCRIBE_ERROR: {
      encoding.writeVarString(encoder, message.sessionDocId)
      encoding.writeVarString(encoder, message.errorType)
      encoding.writeVarString(encoder, message.errorMessage)
      break
    }
    case MessageType.SYNC_STATE_VECTOR: {
      encoding.writeVarString(encoder, message.sessionDocId)
      encoding.writeVarUint8Array(encoder, message.stateVector)
      break
    }
    case MessageType.UPDATE: {
      encoding.writeVarUint(encoder, message.updateId)
      encoding.writeVarUint(encoder, message.updates.size)
      message.updates.forEach((update, sessionDocId) => {
        encoding.writeVarString(encoder, sessionDocId)
        encoding.writeVarUint8Array(encoder, update)
      })
      break
    }
    case MessageType.UPDATE_ACK: {
      encoding.writeVarUint(encoder, message.updateId)
      break
    }
    case MessageType.UPDATE_ERROR: {
      encoding.writeVarUint(encoder, message.updateId)
      encoding.writeVarString(encoder, message.errorType)
      encoding.writeVarString(encoder, message.errorMessage)
      break
    }
    case MessageType.ERROR_RESYNC: {
      encoding.writeVarString(encoder, message.sessionDocId)
      encoding.writeVarString(encoder, message.errorType)
      encoding.writeVarString(encoder, message.errorMessage)
      break
    }
    case MessageType.ERROR_FATAL: {
      encoding.writeVarString(encoder, message.errorType)
      encoding.writeVarString(encoder, message.errorMessage)
      break
    }
    case MessageType.AWARENESS_UPDATE: {
      encoding.writeVarString(encoder, message.sessionDocId)
      encoding.writeVarUint8Array(encoder, message.update)
    }
  }

  return encoding.toUint8Array(encoder)
}
