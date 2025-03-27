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
  }
});

const ReturnRequestSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  orderNumber: String,
  customer: {
    name: String,
    email: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'rejected', 'flagged'],
    default: 'pending'
  },
  items: [ReturnItemSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  adminNotes: String,
  fraudRisk: {
    isHighRisk: Boolean,
    riskScore: Number,
    riskFactors: [String]
  },
  tenantId: { type: String, default: 'default' }
});

export default mongoose.models.ReturnRequest || mongoose.model('ReturnRequest', ReturnRequestSchema);