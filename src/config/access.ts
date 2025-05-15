import { Request, Response, NextFunction } from 'express'
import chalk from 'chalk'

const accessLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString()
  const method = req.method
  const url = req.url
  const ip = req.ip || req.socket.remoteAddress
  const userAgent = req.headers['user-agent']
  const referer = req.headers.referer || 'Direct access'
  const accessInfo = {
    timestamp,
    method,
    url,
    ip,
    userAgent,
    referer
  }

  console.log(chalk.cyan('🌐 Access Log:'))
  console.log(chalk.yellow(`Time: ${timestamp}`))
  console.log(chalk.green(`Method: ${method}`))
  console.log(chalk.blue(`URL: ${url}`))
  console.log(chalk.magenta(`IP: ${ip}`))
  console.log(chalk.white(`User Agent: ${userAgent}`))
  console.log(chalk.gray(`Referer: ${referer}`))
  console.log('-------------------')

  next()
}

export { accessLogger }