// src/lib/tenant/hooks.js
import { useEffect, useState } from 'react';
import { getTenantConfig, getTenantTheme, getTenantSettings } from './service';

export function useTenant(tenantId = 'default') {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTenant() {
      try {
        setLoading(true);
        const config = await getTenantConfig(tenantId);
        setTenant(config);
        setError(null);
      } catch (err) {
        console.error('Error loading tenant:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTenant();
  }, [tenantId]);

  return { tenant, loading, error };
}

export function useTenantTheme(tenantId = 'default') {
  const [theme, setTheme] = useState({
    primaryColor: '#4f46e5', // Default color if theme not loaded yet
    secondaryColor: '#f59e0b',
    accentColor: '#10b981',
    fontFamily: 'Inter, system-ui, sans-serif',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTheme() {
      try {
        setLoading(true);
        const themeConfig = await getTenantTheme(tenantId);
        if (themeConfig) {
          setTheme(themeConfig);
        }
        setError(null);
      } catch (err) {
        console.error('Error loading tenant theme:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTheme();
  }, [tenantId]);

  return { theme, loading, error };
}

export function useTenantSettings(tenantId = 'default') {
  const [settings, setSettings] = useState({
    returnWindowDays: 100,
    allowExchanges: true,
    requirePhotos: false,
    autoApproveReturns: true,
    notifyOnReturn: true,
    returnReasons: [
      'Doesn\'t fit',
      'Changed my mind',
      'Product damaged',
      'Incorrect item received',
      'Quality not as expected',
      'Other'
    ],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const settingsConfig = await getTenantSettings(tenantId);
        if (settingsConfig) {
          setSettings(settingsConfig);
        }
        setError(null);
      } catch (err) {
        console.error('Error loading tenant settings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [tenantId]);

  return { settings, loading, error };
}