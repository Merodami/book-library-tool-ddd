export default {
  // MongoDB connection details – use environment variables to switch environments.
  mongodb: {
    url: process.env.MONGO_URI || 'mongodb://localhost:27017',
    databaseName: process.env.MONGO_DB_NAME || 'event_store',
  },

  // Folder where the migration files are stored.
  migrationsDir: 'migrations',

  // Collection to track applied migrations.
  changelogCollectionName: 'database_changelog',

  // File extension for migration files.
  migrationFileExtension: '.js',
}
