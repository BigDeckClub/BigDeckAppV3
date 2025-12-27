/**
 * Centralized logging utility
 * Replaces console.log statements with structured logging
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  /**
   * Format log message with timestamp and context
   */
  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = this.enableColors ? COLORS[level] : '';
    const reset = this.enableColors ? COLORS.RESET : '';

    const metaStr = Object.keys(meta).length > 0
      ? JSON.stringify(meta, null, 2)
      : '';

    return `${color}[${timestamp}] [${level}]${reset} ${message}${metaStr ? '\n' + metaStr : ''}`;
  }

  /**
   * Check if current log level should be logged
   */
  shouldLog(level) {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.format(LOG_LEVELS.ERROR, message, meta));
    }
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.format(LOG_LEVELS.WARN, message, meta));
    }
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(this.format(LOG_LEVELS.INFO, message, meta));
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.format(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  /**
   * Log HTTP request
   */
  request(method, url, meta = {}) {
    this.info(`${method} ${url}`, meta);
  }

  /**
   * Log HTTP response
   */
  response(method, url, statusCode, duration, meta = {}) {
    const level = statusCode >= 500 ? LOG_LEVELS.ERROR
                : statusCode >= 400 ? LOG_LEVELS.WARN
                : LOG_LEVELS.INFO;

    this[level.toLowerCase()](`${method} ${url} ${statusCode} ${duration}ms`, meta);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger, LOG_LEVELS };
