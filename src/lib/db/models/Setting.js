// src/lib/db/models/Setting.js
import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  returnWindowDays: { type: Number, default: 30 },
  allowExchanges: { type: Boolean, default: true },
  requirePhotos: { type: Boolean, default: false },
  autoApproveReturns: { type: Boolean, default: true },
  notifyOnReturn: { type: Boolean, default: true },
  returnReasons: [String],
  fraudPrevention: {
    enabled: { type: Boolean, default: true },
    maxReturnsPerCustomer: { type: Number, default: 3 },
    maxReturnValuePercent: { type: Number, default: 80 },
    suspiciousPatterns: {
      frequentReturns: { type: Boolean, default: true },
      highValueReturns: { type: Boolean, default: true },
      noReceiptReturns: { type: Boolean, default: true },
      newAccountReturns: { type: Boolean, default: true },
      addressMismatch: { type: Boolean, default: true }
    },
    autoFlagThreshold: { type: Number, default: 2 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Setting || mongoose.model('Setting', SettingSchema);