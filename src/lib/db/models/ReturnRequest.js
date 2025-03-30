// src/lib/db/models/ReturnRequest.js
import mongoose from 'mongoose';

const ReturnItemSchema = new mongoose.Schema({
  id: String,
  title: String,
  variant_title: String,
  price: Number,
  quantity: Number,
  returnOption: { type: String, enum: ['return', 'exchange'], default: 'return' },
  returnReason: {
    reason: String,
    additionalInfo: String
  },
  exchangeDetails: {
    variantId: String,
    originalSize: String,
    newSize: String,
    originalColor: String,
    newColor: String,
    isInStock: Boolean
  },
  refundAmount: Number,
  processedAt: Date,
  trackingInfo: {
    number: String,
    carrier: String,
    url: String
  }
});

const ReturnRequestSchema = new mongoose.Schema({
  // Order information
  orderId: { type: String, required: true, index: true },
  orderNumber: String,
  shopifyOrderId: { type: String, index: true },
  
  // Customer information
  customer: {
    name: String,
    email: { type: String, required: true, index: true },
    phone: String
  },
  
  // Status information
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'rejected', 'flagged'],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String,
    updatedBy: String
  }],
  
  // Return items
  items: [ReturnItemSchema],
  totalRefundAmount: Number,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  processedAt: Date,
  
  // Admin data
  adminNotes: String,
  
  // Shipping & tracking
  returnLabel: {
    url: String,
    generatedAt: Date,
    expiresAt: Date
  },
  trackingNumber: String,
  trackingUrl: String,
  
  // Fraud detection
  fraudRisk: {
    isHighRisk: Boolean,
    riskScore: Number,
    riskFactors: [String],
    details: Object
  },
  
  // Multi-tenant support
  tenantId: { type: String, default: 'default', index: true },
  
  // Metadata
  metadata: { type: Map, of: String }
});

// Create compound indexes for common queries
ReturnRequestSchema.index({ 'customer.email': 1, createdAt: -1 });
ReturnRequestSchema.index({ status: 1, createdAt: -1 });
ReturnRequestSchema.index({ tenantId: 1, status: 1 });

// Automatically update timestamps
ReturnRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add method to change status and record in history
ReturnRequestSchema.methods.updateStatus = function(status, notes, updatedBy) {
  this.status = status;
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    notes: notes || '',
    updatedBy: updatedBy || 'system'
  });
  return this.save();
};

export default mongoose.models.ReturnRequest || mongoose.model('ReturnRequest', ReturnRequestSchema);