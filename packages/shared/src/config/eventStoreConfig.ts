export interface EventStoreConfig {
  type: 'mongodb' | 'eventstoredb' | 'custom'
  connectionString: string
  dbName?: string
}

export const eventStoreConfig: EventStoreConfig = {
  type: 'mongodb',
  connectionString:
    process.env.EVENT_STORE_CONN_STRING || 'mongodb://localhost:27017',
  dbName: process.env.EVENT_STORE_DB || 'event_store',
}
