import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import routes from '../routes'
import rateLimit from 'express-rate-limit'
import { accessLogger } from './access'
import { corsConfig } from './cors'
import { rateLimiter } from './rateLimit'
import { sessionsever } from './session'
config()
const app = express()
app.use(accessLogger)
sessionsever(app)
app.use(cors(corsConfig))
app.use(rateLimit(rateLimiter))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', routes)

export default app