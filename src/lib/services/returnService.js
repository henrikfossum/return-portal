// src/lib/services/returnService.js
import ReturnRequest from '@/lib/db/models/ReturnRequest';
import connectToDatabase from '@/lib/db/connection';

/**
 * Create a new return request in the database
 * @param {Object} returnData - Return request data
 * @returns {Promise<Object>} - Created return request
 */
export async function createReturnRequest(returnData) {
  await connectToDatabase();
  
  try {
    // Log the entire return data before saving
    console.log('Attempting to save return request:', JSON.stringify(returnData, null, 2));

    const newReturn = new ReturnRequest({
      ...returnData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Log the Mongoose model before saving
    console.log('Mongoose Return Request Model:', newReturn);

    const savedReturn = await newReturn.save();
    
    console.log('Return request saved successfully:', savedReturn);
    return savedReturn;
  } catch (error) {
    console.error('DETAILED Error creating return request:', error);
    
    // Log specific validation errors
    if (error.name === 'ValidationError') {
      console.error('Validation Errors:', Object.values(error.errors).map(e => e.message));
    }

    throw error;
  }
}

/**
 * Get returns by order ID
 * @param {String} orderId - Order ID to search for
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<Array>} - Array of return requests
 */
export async function getReturnsByOrderId(orderId, tenantId = 'default') {
  await connectToDatabase();
  
  try {
    // Look up by orderNumber instead of shopifyOrderId
    return ReturnRequest.find({ 
      orderNumber: orderId, 
      tenantId 
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error fetching returns by order ID:', error);
    throw error;
  }
}

/**
 * Get a single return by ID
 * @param {String} id - Return ID
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<Object>} - Return request object
 */
export async function getReturnById(id, tenantId = 'default') {
  await connectToDatabase();
  
  try {
    return ReturnRequest.findOne({ 
      _id: id, 
      tenantId 
    });
  } catch (error) {
    console.error('Error fetching return by ID:', error);
    throw error;
  }
}

/**
 * Get all returns with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {Number} page - Page number (1-based)
 * @param {Number} limit - Number of items per page
 * @returns {Promise<Object>} - Paginated result with total count
 */
// Add or update these functions in the file
export async function getAllReturns(filters = {}, page = 1, limit = 10) {
  await connectToDatabase();
  
  try {
    const query = { tenantId: filters.tenantId || 'default' };
    
    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      if (filters.dateRange === 'today') {
        cutoffDate.setHours(0, 0, 0, 0);
      } else if (filters.dateRange === 'week') {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (filters.dateRange === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1);
      } else if (filters.dateRange === 'quarter') {
        cutoffDate.setMonth(now.getMonth() - 3);
      }
      
      query.createdAt = { $gte: cutoffDate };
    }
    
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { orderId: searchRegex },
        { orderNumber: searchRegex }
      ];
    }
    
    // Count total matching documents for pagination
    const total = await ReturnRequest.countDocuments(query);
    
    // Get paginated results
    const returns = await ReturnRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    // Calculate statistics
    const stats = {
      totalReturns: await ReturnRequest.countDocuments({ tenantId: filters.tenantId || 'default' }),
      pendingReturns: await ReturnRequest.countDocuments({ ...query, status: 'pending' }),
      approvedReturns: await ReturnRequest.countDocuments({ ...query, status: 'approved' }),
      completedReturns: await ReturnRequest.countDocuments({ ...query, status: 'completed' }),
      flaggedReturns: await ReturnRequest.countDocuments({ ...query, status: 'flagged' }),
      rejectedReturns: await ReturnRequest.countDocuments({ ...query, status: 'rejected' })
    };
    
    return {
      returns,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats
    };
  } catch (error) {
    console.error('Error fetching all returns:', error);
    throw error;
  }
}

/**
 * Update a return's status
 * @param {String} id - Return ID
 * @param {String} status - New status
 * @param {String} adminNotes - Admin notes
 * @param {String} updatedBy - User who updated the status
 * @returns {Promise<Object>} - Updated return
 */
export async function updateReturnStatus(id, status, adminNotes, updatedBy = 'admin') {
  await connectToDatabase();
  
  try {
    const returnRecord = await ReturnRequest.findById(id);
    
    if (!returnRecord) {
      throw new Error('Return not found');
    }
    
    // Use the method we defined in the model
    return returnRecord.updateStatus(status, adminNotes, updatedBy);
  } catch (error) {
    console.error('Error updating return status:', error);
    throw error;
  }
}

/**
 * Delete a return request (admin only)
 * @param {String} id - Return ID
 * @param {String} tenantId - Tenant ID
 * @returns {Promise<Boolean>} - Success status
 */
export async function deleteReturn(id, tenantId = 'default') {
  await connectToDatabase();
  
  try {
    const result = await ReturnRequest.deleteOne({ 
      _id: id, 
      tenantId 
    });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting return:', error);
    throw error;
  }
}