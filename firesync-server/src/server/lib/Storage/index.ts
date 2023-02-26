// import { MemoryStorage } from './Memory'
import { PostgresStorage } from './pg'
export const storage = new PostgresStorage()
