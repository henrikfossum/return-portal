// src/lib/db/models/ThemeConfig.js
import mongoose from 'mongoose';

const ThemeConfigSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  primaryColor: { type: String, default: '#4f46e5' },
  secondaryColor: { type: String, default: '#f59e0b' },
  accentColor: { type: String, default: '#10b981' },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#111827' },
  secondaryTextColor: { type: String, default: '#6b7280' },
  borderColor: { type: String, default: '#e5e7eb' },
  fontFamily: { type: String, default: 'Inter, system-ui, sans-serif' },
  headingFontFamily: { type: String, default: 'Inter, system-ui, sans-serif' },
  fontSize: { type: String, default: '16px' },
  logo: String,
  logoWidth: { type: String, default: '120px' },
  logoHeight: { type: String, default: 'auto' },
  favicon: String,
  customCSS: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.ThemeConfig || mongoose.model('ThemeConfig', ThemeConfigSchema);