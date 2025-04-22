import { Router } from 'express'
import userRoutes from './users'
import adminRoutes from './admin'
const router = Router()

router.use('/users', userRoutes),
router.use('/v1/admin', adminRoutes)
export default router