// This is hacky fix for the fact that ts-jest resolves module paths via symlinks
// as the source directory, not the destination. So including '../y' from 
// firesync-server/src/shared actually resolved here when run via ts-jest. So point
// back to the server module. This only affects the tests run via jest.
export { Y } from './firesync-server/src/y'
