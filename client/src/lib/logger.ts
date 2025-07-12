// Simple logger that only logs in development
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      logger.debug(...args)
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    logger.error(...args)
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      logger.warn(...args)
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      logger.debug('[DEBUG]', ...args)
    }
  }
} 