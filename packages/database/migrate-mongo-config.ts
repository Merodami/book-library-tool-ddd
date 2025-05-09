export default {
  mongodb: {
    url: process.env.MONGO_URI || 'mongodb://localhost:27017',

    databaseName: process.env.MONGO_DB_NAME_EVENT || 'events',

    options: {
      useNewUrlParser: true, // removes a deprecation warning when connecting
      useUnifiedTopology: true, // removes a deprecating warning when connecting
      connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    },
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: 'src/infrastructure/persistence/mongo/migrations',

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: 'migrations_changelog',
}
