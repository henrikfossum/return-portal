// src/lib/context/AdminContext.js
import { createContext, useContext, useReducer, useEffect } from 'react';
import { useRouter } from 'next/router';

// Initial state
const initialState = {
  isAuthenticated: false,
  loading: true,
  error: null,
  user: null,
  token: null,
};

// Action types
const actions = {
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT',
};

// Reducer
function adminReducer(state, action) {
  switch (action.type) {
    case actions.SET_AUTHENTICATED:
      return { 
        ...state, 
        isAuthenticated: true, 
        user: action.payload.user,
        token: action.payload.token,
        error: null 
      };
    case actions.SET_LOADING:
      return { ...state, loading: action.payload };
    case actions.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case actions.LOGOUT:
      return { ...initialState, loading: false, isAuthenticated: false };
    default:
      return state;
  }
}

// Create context
const AdminContext = createContext();

// Provider component
export function AdminProvider({ children }) {
  const [state, dispatch] = useReducer(adminReducer, initialState);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      dispatch({ type: actions.SET_LOADING, payload: true });
      
      // Check if admin is logged in (use localStorage)
      const adminToken = localStorage.getItem('adminToken');
      const adminUser = localStorage.getItem('adminUser');
      
      if (adminToken) {
        try {
          // Verify token with the API
          const response = await fetch('/api/admin/verify-token', {
            headers: {
              'Authorization': `Bearer ${adminToken}`
            }
          });
          
          if (response.ok) {
            // Token is valid
            const userData = await response.json();
            
            dispatch({ 
              type: actions.SET_AUTHENTICATED, 
              payload: { 
                token: adminToken,
                user: userData.user || JSON.parse(adminUser) || { name: 'Admin User' }
              } 
            });
          } else {
            // Token is invalid
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            dispatch({ type: actions.LOGOUT });
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          dispatch({ type: actions.LOGOUT });
        }
      } else {
        dispatch({ type: actions.LOGOUT });
      }
      
      dispatch({ type: actions.SET_LOADING, payload: false });
    };

    checkAuth();
  }, []);

  // Login action
  const login = async (email, password) => {
    dispatch({ type: actions.SET_LOADING, payload: true });
    
    try {
      // Call the API to authenticate
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Save token and user data
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        
        dispatch({ 
          type: actions.SET_AUTHENTICATED, 
          payload: { 
            token: data.token, 
            user: data.user 
          } 
        });
        
        return true;
      } else {
        const errorData = await response.json();
        dispatch({ 
          type: actions.SET_ERROR, 
          payload: errorData.message || 'Invalid credentials' 
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ 
        type: actions.SET_ERROR, 
        payload: 'Login failed. Please try again.' 
      });
      return false;
    } finally {
      dispatch({ type: actions.SET_LOADING, payload: false });
    }
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    dispatch({ type: actions.LOGOUT });
    router.push('/admin/login');
  };

  // API request helper with authentication
  const authFetch = async (url, options = {}) => {
    if (!state.token) {
      throw new Error('Authentication required');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`,
      ...options.headers
    };
    
    return fetch(url, {
      ...options,
      headers
    });
  };

  const value = {
    ...state,
    login,
    logout,
    authFetch
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// Custom hook to use the context
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}