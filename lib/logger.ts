const isDev = process.env.NODE_ENV === 'development'

export type LogCategory = 'auth' | 'database' | 'upload' | 'email' | 'api' | 'server-action' | 'validation'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category?: LogCategory
  message: string
  context?: Record<string, unknown>
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry, null, 2)
}

export const logger = {
  log: (message: string, context?: unknown, category?: LogCategory) => {
    if (isDev) {
      const ctx = context as Record<string, unknown> | undefined
      console.log(formatLogEntry({ timestamp: new Date().toISOString(), level: 'debug', category, message, context: ctx }))
    }
  },
  error: (message: string, contextOrError?: unknown, category?: LogCategory) => {
    let context: Record<string, unknown> | undefined
    
    if (contextOrError instanceof Error) {
      context = {
        error: contextOrError.message,
        stack: contextOrError.stack,
        ...(category ? { category } : {})
      }
    } else if (contextOrError && typeof contextOrError === 'object') {
      context = contextOrError as Record<string, unknown>
    } else if (contextOrError !== undefined) {
      context = { value: contextOrError }
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      category,
      message,
      context
    }
    
    console.error(formatLogEntry(entry))
  },
  warn: (message: string, context?: unknown, category?: LogCategory) => {
    if (isDev) {
      const ctx = context as Record<string, unknown> | undefined
      console.warn(formatLogEntry({ timestamp: new Date().toISOString(), level: 'warn', category, message, context: ctx }))
    }
  },
  info: (message: string, context?: unknown, category?: LogCategory) => {
    if (isDev) {
      const ctx = context as Record<string, unknown> | undefined
      console.info(formatLogEntry({ timestamp: new Date().toISOString(), level: 'info', category, message, context: ctx }))
    }
  },
  db: (message: string, context?: unknown) => {
    logger.error(message, context, 'database')
  },
  auth: (message: string, context?: unknown) => {
    logger.error(message, context, 'auth')
  },
  upload: (message: string, context?: unknown) => {
    logger.error(message, context, 'upload')
  },
  email: (message: string, context?: unknown) => {
    logger.error(message, context, 'email')
  },
  api: (message: string, context?: unknown) => {
    logger.error(message, context, 'api')
  },
  serverAction: (message: string, context?: unknown) => {
    logger.error(message, context, 'server-action')
  }
}
