import { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interface for approval data
interface Approval {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  requested_by: string;
  type: string;
  workflow_id: string;
  department: string;
}

// Mock approval data
const mockApprovals: Approval[] = [
  {
    id: '1',
    title: 'Production Database Access Request',
    description: 'Request to grant read-only access to production database for troubleshooting issues.',
    priority: 'high',
    created_at: '2025-03-15T10:30:00Z',
    requested_by: 'Sarah Johnson',
    type: 'Access Request',
    workflow_id: 'WF-1234',
    department: 'Engineering',
  },
  {
    id: '2',
    title: 'Marketing Campaign Budget Increase',
    description: 'Request to increase Q2 marketing campaign budget by 15% to expand reach.',
    priority: 'medium',
    created_at: '2025-03-14T14:45:00Z',
    requested_by: 'Michael Rodriguez',
    type: 'Budget Request',
    workflow_id: 'WF-1235',
    department: 'Marketing',
  },
  {
    id: '3',
    title: 'New Hire Equipment Procurement',
    description: 'Request to approve equipment purchase for new software developer joining next month.',
    priority: 'low',
    created_at: '2025-03-13T09:15:00Z',
    requested_by: 'Emma Chen',
    type: 'Procurement',
    workflow_id: 'WF-1236',
    department: 'Human Resources',
  },
  {
    id: '4',
    title: 'Customer Refund Approval',
    description: 'Request to approve refund for Premium tier customer due to service outage.',
    priority: 'high',
    created_at: '2025-03-12T16:20:00Z',
    requested_by: 'David Kim',
    type: 'Financial',
    workflow_id: 'WF-1237',
    department: 'Customer Support',
  },
  {
    id: '5',
    title: 'Software License Renewal',
    description: 'Request to renew enterprise licenses for design software suite.',
    priority: 'medium',
    created_at: '2025-03-11T11:05:00Z',
    requested_by: 'Alex Johnson',
    type: 'Procurement',
    workflow_id: 'WF-1238',
    department: 'Design',
  },
];

export function useFetchApprovals() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const requestCacheRef = useRef(new Map<string, { data: Approval[]; timestamp: number }>());
  const isRequestInProgressRef = useRef(false);

  const fetchApprovals = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgressRef.current) {
      console.log('🚫 Request already in progress, skipping duplicate call');
      return;
    }

    const cacheKey = 'approvals';
    
    // Check cache first (5 second cache)
    if (requestCacheRef.current.has(cacheKey)) {
      const cached = requestCacheRef.current.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 5000) {
        console.log('📋 Using cached approvals data');
        setApprovals(cached.data);
        setIsLoading(false);
        return;
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    isRequestInProgressRef.current = true;
    setIsLoading(true);
    
    try {
      // Simulate API call with abort signal
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000);
        
        // Handle abort
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Request cancelled'));
        });
      });
      
      // Check if component is still mounted and request wasn't aborted
      if (signal.aborted || !isMountedRef.current) {
        console.log('🚫 Request cancelled or component unmounted');
        return;
      }
      
      // In a real app, this would fetch data from an API
      setApprovals(mockApprovals);
      setError(null);
      
      // Cache the result
      requestCacheRef.current.set(cacheKey, {
        data: mockApprovals,
        timestamp: Date.now()
      });
      
      console.log('✅ Approvals loaded successfully');
    } catch (err) {
      if (!signal.aborted && isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch approvals';
        if (errorMessage !== 'Request cancelled') {
          setError(errorMessage);
          console.error('Error fetching approvals:', err);
        }
      }
    } finally {
      if (!signal.aborted && isMountedRef.current) {
        setIsLoading(false);
      }
      isRequestInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchApprovals();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchApprovals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    approvals,
    isLoading,
    error,
    refetch: fetchApprovals,
  };
}