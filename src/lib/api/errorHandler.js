// src/lib/api/errorHandler.js
/**
 * API Error handler and validation utilities
 */

/**
 * Standard API error structure
 */
export class ApiError extends Error {
    constructor(status, code, message, details = null) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
  
  /**
   * Common API error types
   */
  export const ErrorTypes = {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    CONFLICT: 'CONFLICT',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    
    // Custom business logic errors
    ORDER_NOT_ELIGIBLE: 'ORDER_NOT_ELIGIBLE',
    ITEM_NOT_RETURNABLE: 'ITEM_NOT_RETURNABLE',
    RETURN_WINDOW_EXPIRED: 'RETURN_WINDOW_EXPIRED',
    FRAUD_DETECTED: 'FRAUD_DETECTED',
    SHOPIFY_API_ERROR: 'SHOPIFY_API_ERROR'
  };
  
  /**
   * Map error types to HTTP status codes
   */
  const statusCodeMap = {
    [ErrorTypes.BAD_REQUEST]: 400,
    [ErrorTypes.UNAUTHORIZED]: 401,
    [ErrorTypes.FORBIDDEN]: 403,
    [ErrorTypes.NOT_FOUND]: 404,
    [ErrorTypes.METHOD_NOT_ALLOWED]: 405,
    [ErrorTypes.CONFLICT]: 409,
    [ErrorTypes.TOO_MANY_REQUESTS]: 429,
    [ErrorTypes.INTERNAL_SERVER_ERROR]: 500,
    [ErrorTypes.SERVICE_UNAVAILABLE]: 503,
    
    // Custom business errors with appropriate status codes
    [ErrorTypes.ORDER_NOT_ELIGIBLE]: 400,
    [ErrorTypes.ITEM_NOT_RETURNABLE]: 400,
    [ErrorTypes.RETURN_WINDOW_EXPIRED]: 400,
    [ErrorTypes.FRAUD_DETECTED]: 403,
    [ErrorTypes.SHOPIFY_API_ERROR]: 502
  };
  
  /**
   * Create a standardized API error
   */
  export function createApiError(type, message, details = null) {
    const status = statusCodeMap[type] || 500;
    return new ApiError(status, type, message, details);
  }
  
  /**
   * Validate required fields in a request body
   */
  export function validateRequiredFields(body, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        'Missing required fields',
        { missingFields }
      );
    }
    
    return true;
  }
  
  /**
   * Validate an email address format
   */
  export function validateEmail(email) {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        'Invalid email address format'
      );
    }
    
    return true;
  }
  
  /**
   * Validate an order ID format
   */
  export function validateOrderId(orderId) {
    // Remove any non-numeric characters for Shopify IDs
    const cleanId = String(orderId).replace(/\D/g, '');
    
    if (!cleanId || isNaN(Number(cleanId))) {
      throw createApiError(
        ErrorTypes.BAD_REQUEST,
        'Invalid order ID format'
      );
    }
    
    return cleanId;
  }
  
  /**
   * API middleware to handle errors consistently
   */
  export function withErrorHandler(handler) {
    return async (req, res) => {
      try {
        // Log request for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`${req.method} ${req.url}`, {
            body: req.body,
            query: req.query,
            headers: {
              'content-type': req.headers['content-type'],
              'x-tenant-id': req.headers['x-tenant-id']
            }
          });
        }
        
        // Call the original handler
        return await handler(req, res);
      } catch (error) {
        // Handle ApiError instances
        if (error instanceof ApiError) {
          return res.status(error.status).json({
            error: error.code,
            message: error.message,
            details: error.details
          });
        }
        
        // Handle Shopify API errors
        if (error.response && error.response.errors) {
          const shopifyError = error.response.errors;
          return res.status(502).json({
            error: ErrorTypes.SHOPIFY_API_ERROR,
            message: 'Shopify API Error',
            details: shopifyError
          });
        }
        
        // Default error handling for unhandled errors
        console.error('Unhandled API error:', error);
        
        return res.status(500).json({
          error: ErrorTypes.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    };
  }
  
  /**
   * Verify required request method
   */
  export function verifyMethod(req, methods) {
    const allowedMethods = Array.isArray(methods) ? methods : [methods];
    
    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods);
      throw createApiError(
        ErrorTypes.METHOD_NOT_ALLOWED,
        `Method ${req.method} is not allowed, use ${allowedMethods.join(', ')}`
      );
    }
    
    return true;
  }
  
  /**
   * Verify admin authorization
   */
  export function verifyAdminAuth(req) {
    const adminToken = req.headers.authorization?.split(' ')[1];
    
    if (!adminToken || adminToken !== 'demo-admin-token') {
      throw createApiError(
        ErrorTypes.UNAUTHORIZED,
        'Admin authentication required'
      );
    }
    
    return true;
  }