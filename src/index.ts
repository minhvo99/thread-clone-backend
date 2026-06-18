import 'dotenv/config'
import app from './app.js'
import { closeDatabase } from './config/database.js'

const PORT = Number(process.env.PORT || 8080)

const server = app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`)
})

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully`)
  server.close()
  await closeDatabase()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
