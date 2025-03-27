// src/lib/logging/index.js
/**
 * Centralized logging system for return portal
 * This provides consistent logging across the application and
 * allows for easy integration with external monitoring systems
 */

// Log levels
export const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  };
  
  // Log categories for easier filtering
  export const LogCategory = {
    API: 'api',
    SHOPIFY: 'shopify',
    FRAUD: 'fraud',
    ORDER: 'order',
    RETURN: 'return',
    EXCHANGE: 'exchange',
    SECURITY: 'security',
    SYSTEM: 'system',
    USER: 'user'
  };
  
  /**
   * Configuration for the logging system
   */
  let config = {
    // Default to INFO in production, DEBUG in development
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    // Enable console logging
    console: true,
    // Include timestamps
    timestamps: true,
    // Enable performance tracking
    performance: true
  };
  
  /**
   * Configure the logging system
   */
  export function configureLogging(newConfig) {
    config = {
      ...config,
      ...newConfig
    };
  }
  
  /**
   * Main logger class
   */
  class Logger {
    constructor(module) {
      this.module = module;
      this.performance = new Map();
    }
    
    /**
     * Format a log message
     */
    formatMessage(level, message, data = {}, category = LogCategory.SYSTEM) {
      const timestamp = config.timestamps ? new Date().toISOString() : '';
      
      return {
        timestamp,
        level,
        category,
        module: this.module,
        message,
        data
      };
    }
    
    /**
     * Write a log entry to console
     */
    writeToConsole(entry) {
      if (!config.console) return;
      
      const { timestamp, level, category, module, message, data } = entry;
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}] [${module}]`;
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, data);
          break;
        case LogLevel.INFO:
          console.info(prefix, message, data);
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, data);
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, data);
          break;
        default:
          console.log(prefix, message, data);
      }
    }
    
    /**
     * Send log entry to external monitoring service
     * This is a placeholder for integration with services like
     * Sentry, Datadog, New Relic, etc.
     */
    async sendToMonitoring() {
      // In a production environment, this would send to an external service
      // Example integration with Sentry:
      /*
      if (level === LogLevel.ERROR && Sentry) {
        Sentry.captureException(new Error(message), {
          level,
          tags: { category, module: this.module },
          extra: data
        });
      }
      */
    }
    
    /**
     * Generic log method
     */
    log(level, message, data = {}, category = LogCategory.SYSTEM) {
      // Skip if below minimum level
      if (shouldSkipLevel(level)) return;
      
      const entry = this.formatMessage(level, message, data, category);
      
      // Write to console
      this.writeToConsole(entry);
      
      // Send to monitoring
      this.sendToMonitoring(entry);
      
      return entry;
    }
    
    // Convenience methods for different log levels
    debug(message, data = {}, category = LogCategory.SYSTEM) {
      return this.log(LogLevel.DEBUG, message, data, category);
    }
    
    info(message, data = {}, category = LogCategory.SYSTEM) {
      return this.log(LogLevel.INFO, message, data, category);
    }
    
    warn(message, data = {}, category = LogCategory.SYSTEM) {
      return this.log(LogLevel.WARN, message, data, category);
    }
    
    error(message, data = {}, category = LogCategory.SYSTEM) {
      return this.log(LogLevel.ERROR, message, data, category);
    }
    
    /**
     * Start tracking performance for an operation
     */
    startTimer(operation) {
      if (!config.performance) return;
      this.performance.set(operation, performance.now());
    }
    
    /**
     * End tracking performance and log the result
     */
    endTimer(operation, category = LogCategory.SYSTEM) {
      if (!config.performance) return;
      
      const startTime = this.performance.get(operation);
      if (!startTime) return;
      
      const duration = performance.now() - startTime;
      this.performance.delete(operation);
      
      // Log if exceeds thresholds
      if (duration > 1000) { // Over 1 second
        this.warn(`Operation '${operation}' took ${duration.toFixed(2)}ms`, { duration }, category);
      } else {
        this.debug(`Operation '${operation}' took ${duration.toFixed(2)}ms`, { duration }, category);
      }
      
      return duration;
    }
    
    /**
     * Log a user action like placing a return or exchange
     */
    logUserAction(action, userId, details = {}) {
      return this.info(
        `User action: ${action}`,
        { userId, ...details },
        LogCategory.USER
      );
    }
    
    /**
     * Log a security event like failed login or rate limiting
     */
    logSecurityEvent(event, ip, details = {}) {
      return this.warn(
        `Security event: ${event}`,
        { ip, ...details },
        LogCategory.SECURITY
      );
    }
    
    /**
     * Log a Shopify API error with structured details
     */
    logShopifyError(error, operation, details = {}) {
      // Handle different error formats
      const errorDetails = error.response?.body?.errors || 
                          error.response?.errors || 
                          error.message || 
                          'Unknown Shopify error';
                          
      return this.error(
        `Shopify API error during ${operation}`,
        { errorDetails, ...details },
        LogCategory.SHOPIFY
      );
    }
    
    /**
     * Log a fraud detection event
     */
    logFraudEvent(orderId, riskScore, riskFactors, details = {}) {
      const level = riskScore > 5 ? LogLevel.WARN : LogLevel.INFO;
      
      return this.log(
        level,
        `Fraud detection: order #${orderId} risk score ${riskScore}`,
        { orderId, riskScore, riskFactors, ...details },
        LogCategory.FRAUD
      );
    }
    
    /**
     * Log a return process event
     */
    logReturnProcess(orderId, lineItemId, status, details = {}) {
      return this.info(
        `Return for order #${orderId}, item ${lineItemId}: ${status}`,
        { orderId, lineItemId, status, ...details },
        LogCategory.RETURN
      );
    }
    
    /**
     * Log an exchange process event
     */
    logExchangeProcess(orderId, lineItemId, newVariantId, status, details = {}) {
      return this.info(
        `Exchange for order #${orderId}, item ${lineItemId} to variant ${newVariantId}: ${status}`,
        { orderId, lineItemId, newVariantId, status, ...details },
        LogCategory.EXCHANGE
      );
    }
  }
  
  /**
   * Determine if a log level should be skipped based on config
   */
  function shouldSkipLevel(level) {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevelIndex = levels.indexOf(config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex < configLevelIndex;
  }
  
  /**
   * Request logger middleware for API routes
   */
  export function apiLogger(req, res, next) {
    const logger = createLogger('api');
    
    // Log the request
    logger.info(
      `${req.method} ${req.url}`,
      {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body ? JSON.stringify(req.body) : undefined,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      },
      LogCategory.API
    );
    
    // Start timer for request
    logger.startTimer(`request-${req.method}-${req.url}`);
    
    // Track response
    const originalEnd = res.end;
    res.end = function() {
      // Log the response
      logger.info(
        `Response ${res.statusCode} for ${req.method} ${req.url}`,
        {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: logger.endTimer(`request-${req.method}-${req.url}`)
        },
        LogCategory.API
      );
      
      originalEnd.apply(res, arguments);
    };
    
    if (next) next();
  }
  
  /**
   * Create a new logger instance for a specific module
   */
  export function createLogger(module) {
    return new Logger(module);
  }
  
  // Default logger for imports
  export default createLogger('app');