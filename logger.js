const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Combined log - all logs
const combinedTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '1d', // Keep logs for 1 day (24 hours)
  format: customFormat,
  level: 'info'
});

// Error log - only errors
const errorTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '1d', // Keep logs for 1 day (24 hours)
  format: customFormat,
  level: 'error'
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      let log = `${timestamp} ${level}: ${message}`;
      if (stack) {
        log += `\n${stack}`;
      }
      return log;
    })
  )
});

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    combinedTransport,
    errorTransport,
    consoleTransport
  ]
});

// Helper functions for common log patterns
logger.logAuth = (action, username, details = {}) => {
  logger.info(`AUTH: ${action}`, { username, ...details });
};

logger.logAPI = (method, path, statusCode, userId = null) => {
  logger.info(`API: ${method} ${path} - ${statusCode}`, { userId });
};

logger.logDB = (operation, table, details = {}) => {
  logger.info(`DB: ${operation} on ${table}`, details);
};

logger.logWS = (action, userId, details = {}) => {
  logger.info(`WS: ${action}`, { userId, ...details });
};

logger.logSecurity = (event, details = {}) => {
  logger.warn(`SECURITY: ${event}`, details);
};

// Log rotation events
combinedTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log rotation', { oldFilename, newFilename });
});

// Log cleanup on startup - remove logs older than 24 hours
const cleanupOldLogs = () => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > oneDayMs) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old log file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
  }
};

// Run cleanup on module load
cleanupOldLogs();

module.exports = logger;
