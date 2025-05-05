import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import routes from '../routes'
import rateLimit from 'express-rate-limit'
import { accessLogger } from './access'
import userRoutes from '../routes/users'
import session from 'express-session';
config()

const app = express()

// Access logging middleware
app.use(accessLogger)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 15,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Single CORS configuration that handles all origins
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// Basic middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
})
app.use(limiter)

// Routes
app.use('/api', routes)
app.use('/api/auth', userRoutes)

const startServer = () => {
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

export { app, startServer }