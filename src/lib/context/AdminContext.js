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
      
      // For MVP: Check if admin is logged in (use localStorage)
      const adminToken = localStorage.getItem('adminToken');
      const adminUser = localStorage.getItem('adminUser');
      
      if (adminToken) {
        // Simple validation, in a real app you'd verify the token with your API
        try {
          dispatch({ 
            type: actions.SET_AUTHENTICATED, 
            payload: { 
              token: adminToken,
              user: adminUser ? JSON.parse(adminUser) : { name: 'Admin User' }
            } 
          });
        } catch (error) {
          console.error('Error parsing admin user:', error);
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
      // For MVP: Hardcoded credentials
      if (email === 'admin@example.com' && password === 'password123') {
        // Set a simple token in localStorage
        const token = 'demo-admin-token';
        const user = { name: 'Admin User', email };
        
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(user));
        
        dispatch({ 
          type: actions.SET_AUTHENTICATED, 
          payload: { token, user } 
        });
        
        return true;
      } else {
        dispatch({ 
          type: actions.SET_ERROR, 
          payload: 'Invalid credentials' 
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