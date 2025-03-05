// src/hooks/useAdminReturns.js
import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/lib/context/AdminContext';

export function useAdminReturns() {
  const { authFetch, isAuthenticated } = useAdmin();
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    completedReturns: 0,
    flaggedReturns: 0
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

  // Fetch returns based on filters
  const fetchReturns = useCallback(async (filterOverrides = {}) => {
    if (!isAuthenticated) return;
    
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
      
      const response = await authFetch(`/api/admin/returns?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch returns');
      }
      
      const data = await response.json();
      
      setReturns(data.returns);
      setStats(data.stats);
      setPagination({
        total: data.total,
        totalPages: data.totalPages,
        current: data.page
      });
      
      return data;
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError(err.message || 'An error occurred while fetching returns');
    } finally {
      setLoading(false);
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

  // Fetch return details
  const fetchReturnDetail = useCallback(async () => {
    if (!isAuthenticated || !id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authFetch(`/api/admin/returns/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch return details');
      }
      
      const data = await response.json();
      setReturnData(data);
      
      return data;
    } catch (err) {
      console.error('Error fetching return details:', err);
      setError(err.message || 'An error occurred while fetching return details');
    } finally {
      setLoading(false);
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
      setError(err.message || 'An error occurred while updating return');
      return false;
    } finally {
      setActionLoading(false);
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