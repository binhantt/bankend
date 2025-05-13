import crypto from 'crypto'
import jwt from 'jsonwebtoken'
const ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012', 'utf8')
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const IV_LENGTH = 16

export const encryptResponse = (data: any): string => {
  const text = typeof data === 'string' ? data : JSON.stringify(data)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export const generateOneTimeToken = (email: string, password: string, permissions: string[]): string => {
  const payload = {
    email,
    permissions,
    iat: Date.now(),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
  }
  return jwt.sign(payload, JWT_SECRET)
}

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export const decryptResponse = (encryptedData: string): string => {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export const comparePasswords = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    const hashedInput = hashPassword(plainPassword);
    return hashedInput === hashedPassword;
};
