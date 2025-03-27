// src/hooks/useAdminReturns.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdmin } from '@/lib/context/AdminContext';

export function useAdminReturns() {
  const { authFetch, isAuthenticated } = useAdmin();
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    approvedReturns: 0,
    completedReturns: 0,
    flaggedReturns: 0,
    rejectedReturns: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    current: 1
  });
  
  // Add this to prevent duplicate requests
  const isFetchingRef = useRef(false);
  // Add this to track mounted state
  const isMountedRef = useRef(true);
  // Add this to track when we last fetched data
  const lastFetchTimeRef = useRef(0);

  // Fetch returns based on filters
  const fetchReturns = useCallback(async (filterOverrides = {}) => {
    if (!isAuthenticated) return;
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Already fetching returns, ignoring request');
      return;
    }
    
    // Check if we've fetched within the last second (debouncing)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      console.log('Fetched too recently, ignoring request');
      return;
    }
    
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    setLoading(true);
    setError(null);
    
    const currentFilters = { ...filters, ...filterOverrides };
    
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (currentFilters.status !== 'all') queryParams.append('status', currentFilters.status);
      if (currentFilters.dateRange !== 'all') queryParams.append('dateRange', currentFilters.dateRange);
      if (currentFilters.search) queryParams.append('search', currentFilters.search);
      queryParams.append('page', currentFilters.page);
      queryParams.append('limit', currentFilters.limit);
      queryParams.append('includeAll', 'true');
      
      const response = await authFetch(`/api/admin/returns?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch returns');
      }
      
      const data = await response.json();
      
      // Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setReturns(data.returns || []);
        setStats(data.stats || {
          totalReturns: 0,
          pendingReturns: 0,
          approvedReturns: 0,
          completedReturns: 0,
          flaggedReturns: 0,
          rejectedReturns: 0
        });
        setPagination({
          total: data.total || 0,
          totalPages: data.totalPages || 1,
          current: data.page || 1
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching returns:', err);
      if (isMountedRef.current) {
        setError(err.message || 'An error occurred while fetching returns');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, filters, authFetch]);

  // Update filters and fetch data
  const updateFilters = useCallback((newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset to page 1 on filter change
    setFilters(updatedFilters);
    fetchReturns(updatedFilters);
  }, [filters, fetchReturns]);

  // Change page
  const changePage = useCallback((newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    const updatedFilters = { ...filters, page: newPage };
    setFilters(updatedFilters);
    fetchReturns(updatedFilters);
  }, [filters, pagination.totalPages, fetchReturns]);

  // Fetch on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchReturns();
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [isAuthenticated, fetchReturns]);

  return {
    returns,
    stats,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    fetchReturns,
    changePage
  };
}

export function useAdminReturnDetail(id) {
  const { authFetch, isAuthenticated } = useAdmin();
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Add this to prevent duplicate requests
  const isFetchingRef = useRef(false);
  // Add this to track mounted state
  const isMountedRef = useRef(true);

  // Fetch return details
  const fetchReturnDetail = useCallback(async () => {
    if (!isAuthenticated || !id) return;
    
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('Already fetching return detail, ignoring request');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const response = await authFetch(`/api/admin/returns/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch return details');
      }
      
      const data = await response.json();
      
      // Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setReturnData(data);
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching return details:', err);
      if (isMountedRef.current) {
        setError(err.message || 'An error occurred while fetching return details');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, id, authFetch]);

  // Update return status
  const updateReturnStatus = useCallback(async (status, adminNotes = '') => {
    if (!isAuthenticated || !id) return;
    
    setActionLoading(true);
    
    try {
      const response = await authFetch(`/api/admin/returns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update return status');
      }
      
      // Fetch updated data
      await fetchReturnDetail();
      
      return true;
    } catch (err) {
      console.error('Error updating return status:', err);
      if (isMountedRef.current) {
        setError(err.message || 'An error occurred while updating return');
      }
      return false;
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
      }
    }
  }, [isAuthenticated, id, authFetch, fetchReturnDetail]);

  // Approve return
  const approveReturn = async (adminNotes) => {
    return updateReturnStatus('approved', adminNotes);
  };

  // Reject return
  const rejectReturn = async (adminNotes) => {
    return updateReturnStatus('rejected', adminNotes);
  };

  // Complete return
  const completeReturn = async (adminNotes) => {
    return updateReturnStatus('completed', adminNotes);
  };

  // Flag return
  const flagReturn = async (adminNotes) => {
    return updateReturnStatus('flagged', adminNotes);
  };

  // Fetch on component mount
  useEffect(() => {
    if (isAuthenticated && id) {
      fetchReturnDetail();
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [isAuthenticated, id, fetchReturnDetail]);

  return {
    returnData,
    loading,
    error,
    actionLoading,
    fetchReturnDetail,
    approveReturn,
    rejectReturn,
    completeReturn,
    flagReturn
  };
}