import { db } from '../config/database'
import { generateOneTimeToken, verifyToken } from '../utils/crypto'
import jwt from 'jsonwebtoken'

interface TokenData {
  userId: number;  // Make userId required
  type: string;
}

class Token {
  private static readonly EXPIRY_TIME = 3600; // 1 hour in seconds
  private static readonly REFRESH_TIME = 7 * 24 * 60 * 60; // 7 days in seconds

  static create(data: TokenData) {
    const payload = {
      userId: data.userId,
      type: data.type,
      iat: Date.now(),
      exp: Math.floor(Date.now() / 1000) + this.EXPIRY_TIME
    }
    return {
      token: jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key'),
      expiresIn: this.EXPIRY_TIME,
      permissions: [data.type]
    }
  }

  static async createRefreshToken(data: TokenData): Promise<string> {
    const payload = {
      userId: data.userId,
      type: data.type,
      iat: Date.now(),
      exp: Math.floor(Date.now() / 1000) + this.REFRESH_TIME
    }
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key')
  }

  static validateRefreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as {
        userId: number;
        type: string;
        iat: number;
        exp: number;
      }
      return {
        userId: decoded.userId,
        type: decoded.type,
        valid: true
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid refresh token'
      }
    }
  }
}

export default Token;

export const createRegistrationToken = (email: string, password: string) => {
  const permissions = ['register']
  const token = generateOneTimeToken(email, password, permissions)
  
  return {
    token,
    expiresIn: 3600,
    permissions
  }
}

export const validateRegistrationToken = (token: string) => {
  try {
    const decoded = verifyToken(token)
    const tokenAge = Date.now() - decoded.timestamp
    
    if (tokenAge > 3600000) { // 1 hour in milliseconds
      throw new Error('Token expired')
    }
    
    if (!decoded.permissions.includes('register')) {
      throw new Error('Invalid token permissions')
    }
    
    return {
      email: decoded.email,
      timestamp: decoded.timestamp,
      valid: true
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid token'
    }
  }
}

export const createToken = async (userId: number, email: string, password: string, type: string, permissions: string[]) => {
  const token = generateOneTimeToken(email, password, permissions)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  await db.insertInto('tokens').values({
    user_id: userId,
    token,
    type,
    permissions: JSON.stringify(permissions),
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString()
  }).execute()

  return {
    token,
    expiresIn: 3600,
    permissions
  }
}

export const validateToken = async (token: string) => {
  const tokenRecord = await db
    .selectFrom('tokens')
    .select(['id', 'user_id', 'permissions', 'used', 'expires_at'])
    .where('token', '=', token)
    .executeTakeFirst()

  if (!tokenRecord || tokenRecord.used) {
    throw new Error('Invalid or used token')
  }

  const expiresAt = new Date(tokenRecord.expires_at)
  if (expiresAt < new Date()) {
    throw new Error('Token expired')
  }

  // Mark token as used
  await db
    .updateTable('tokens')
    .set({ used: true })
    .where('id', '=', tokenRecord.id)
    .execute()

  return {
    userId: tokenRecord.user_id,
    permissions: JSON.parse(tokenRecord.permissions)
  }
}