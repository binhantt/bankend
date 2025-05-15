import express from 'express'

export function startServer(app: express.Application) {
  try {
    const PORT = process.env.PORT || 3001
    const HOST = process.env.HOST || 'localhost'
    app.listen(PORT, () => {
      console.log('🚀 Server Information:')
      console.log(`📡 API URL: http://${HOST}:${PORT}/api`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log('📝 Press CTRL+C to stop')
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}