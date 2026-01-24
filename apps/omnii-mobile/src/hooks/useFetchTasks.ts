import { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript interface for approval data
interface Task {
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
const mockTasks: Task[] = [
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

export function useFetchTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const requestCacheRef = useRef(new Map<string, { data: Task[]; timestamp: number }>());
  const isRequestInProgressRef = useRef(false);

  const fetchTasks = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgressRef.current) {
      return;
    }

    const cacheKey = 'tasks';
    
    // Check cache first (5 second cache)
    if (requestCacheRef.current.has(cacheKey)) {
      const cached = requestCacheRef.current.get(cacheKey)!;
      if (Date.now() - cached.timestamp < 5000) {
        setTasks(cached.data);
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
        return;
      }
      
      // In a real app, this would fetch data from an API
      setTasks(mockTasks);
      setError(null);
      
      // Cache the result
      requestCacheRef.current.set(cacheKey, {
        data: mockTasks,
        timestamp: Date.now()
      });
      
    } catch (err) {
      if (!signal.aborted && isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
        if (errorMessage !== 'Request cancelled') {
          setError(errorMessage);
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
    fetchTasks();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTasks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}