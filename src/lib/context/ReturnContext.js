// src/lib/context/ReturnContext.js
import { createContext, useContext, useReducer, useEffect } from 'react';
import { getLocalStorage, setLocalStorage } from '../storage/local';

// Initial state
const initialState = {
  order: null,
  itemsToReturn: [],
  returnReasons: {},
  returnOptions: {},
  currentStep: 1,
  loading: false,
  error: null,
  tenantId: 'default', // Will be used for multi-tenant support
};

// Action types
const actions = {
  SET_ORDER: 'SET_ORDER',
  SELECT_ITEMS: 'SELECT_ITEMS',
  SET_RETURN_REASON: 'SET_RETURN_REASON',
  SET_RETURN_OPTION: 'SET_RETURN_OPTION',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  RESET_STATE: 'RESET_STATE',
  SET_TENANT: 'SET_TENANT',
};

// Reducer
function returnReducer(state, action) {
  switch (action.type) {
    case actions.SET_ORDER:
      return { ...state, order: action.payload, error: null };
    case actions.SELECT_ITEMS:
      return { ...state, itemsToReturn: action.payload };
      case actions.SET_RETURN_OPTION: {
        const { itemId, option, details } = action.payload;
        const updatedItems = state.itemsToReturn.map(item => {
          if (item.id.toString() === itemId.toString()) {
            return {
              ...item,
              returnOption: option || 'return', // Ensure a default option
              exchangeDetails: option === 'exchange' ? details : null,
            };
          }
          return item;
        });
        
        return {
          ...state,
          itemsToReturn: updatedItems,
          returnOptions: { ...state.returnOptions, [itemId]: { option: option || 'return', details } },
        };
      }
    case actions.SET_LOADING:
      return { ...state, loading: action.payload };
    case actions.SET_ERROR:
      return { ...state, error: action.payload };
    case actions.SET_CURRENT_STEP:
      return { ...state, currentStep: action.payload };
    case actions.SET_TENANT:
      return { ...state, tenantId: action.payload };
    case actions.RESET_STATE:
      return { ...initialState, tenantId: state.tenantId };
    default:
      return state;
  }
}

// Create context
const ReturnContext = createContext();

// Provider component
export function ReturnProvider({ children }) {
  const [state, dispatch] = useReducer(returnReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = getLocalStorage('returnState');
    if (savedState) {
      Object.entries(savedState).forEach(([key, value]) => {
        if (key in initialState && value !== null) {
          dispatch({ type: `SET_${key.toUpperCase()}`, payload: value });
        }
      });
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    // Don't save loading and error states
    const { loading, error, ...stateToSave } = state;
    setLocalStorage('returnState', stateToSave);
  }, [state]);

  // Action creators
  const setOrder = (order) => dispatch({ type: actions.SET_ORDER, payload: order });
  const selectItems = (items) => dispatch({ type: actions.SELECT_ITEMS, payload: items });
  const setReturnReason = (itemId, reason) => 
    dispatch({ type: actions.SET_RETURN_REASON, payload: { itemId, reason } });
  const setReturnOption = (itemId, option, details = null) => 
    dispatch({ type: actions.SET_RETURN_OPTION, payload: { itemId, option, details } });
  const setLoading = (isLoading) => dispatch({ type: actions.SET_LOADING, payload: isLoading });
  const setError = (error) => dispatch({ type: actions.SET_ERROR, payload: error });
  const setCurrentStep = (step) => dispatch({ type: actions.SET_CURRENT_STEP, payload: step });
  const setTenant = (tenantId) => dispatch({ type: actions.SET_TENANT, payload: tenantId });
  const resetState = () => dispatch({ type: actions.RESET_STATE });

  const value = {
    ...state,
    setOrder,
    selectItems,
    setReturnReason,
    setReturnOption,
    setLoading,
    setError,
    setCurrentStep,
    setTenant,
    resetState,
  };

  return <ReturnContext.Provider value={value}>{children}</ReturnContext.Provider>;
}

// Custom hook to use the context
export function useReturnContext() {
  const context = useContext(ReturnContext);
  if (!context) {
    throw new Error('useReturnContext must be used within a ReturnProvider');
  }
  return context;
}