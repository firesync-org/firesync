import { FireSync } from './firesync'

// Export the Yjs version we're using because it's important that all code
// uses the same version, because constructor checks are used to test for
// equality. yjs will warn about this if you use multiple version and things
// will randomly fail.
export { Y } from './y'
export { Awareness } from 'y-protocols/awareness'
export { FireSync } from './firesync'
export { LogLevel, setLogLevel } from './logging'
export { MessageType } from './shared/protocol'
export * from './shared/errors'
export * as chaosMonkey from './shared/chaosMonkey'

export default FireSync
