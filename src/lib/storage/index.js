  // src/lib/storage/index.js
  import {
    getLocalStorage,
    setLocalStorage,
    removeLocalStorage,
  } from './local';
  
  import {
    getServerStorage,
    setServerStorage,
  } from './server';
  
  // Determine which storage to use
  const useServerStorage = process.env.NEXT_PUBLIC_USE_SERVER_STORAGE === 'true';
  
  // Export a unified API
  export const storage = {
    get: async (key, tenantId = 'default', userId = null, defaultValue = null) => {
      if (useServerStorage) {
        return await getServerStorage(key, tenantId, userId, defaultValue);
      }
      return getLocalStorage(key, defaultValue);
    },
    
    set: async (key, value, tenantId = 'default', userId = null) => {
      if (useServerStorage) {
        return await setServerStorage(key, value, tenantId, userId);
      }
      return setLocalStorage(key, value);
    },
    
    remove: async (key) => {
      if (useServerStorage) {
        return await setServerStorage(key, undefined);
      }
      return removeLocalStorage(key);
    }
  };