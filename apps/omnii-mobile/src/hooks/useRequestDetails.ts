import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

// Combine mock data from both tasks and history
import { useFetchTasks } from './useFetchTasks';
import { useFetchHistory } from './useFetchHistory';

export function useRequestDetails(id: string) {
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const { tasks } = useFetchTasks();
  const { history } = useFetchHistory();

  useEffect(() => {
    const fetchRequestDetails = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // In a real app, this would fetch detailed data from an API
        // For the mock, we'll combine our tasks and history data
        
        // Check tasks first (pending requests)
        const pendingRequest = tasks.find(item => item.id === id);
        if (pendingRequest) {
          setRequest({
            ...pendingRequest,
            status: 'pending',
          });
          setError(null);
          setIsLoading(false);
          return;
        }
        
        // Then check history (processed requests)
        const historyRequest = history.find(item => item.id === id);
        if (historyRequest) {
          setRequest(historyRequest);
          setError(null);
          setIsLoading(false);
          return;
        }
        
        // If not found in either, set error
        setError('Request not found');
        setRequest(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch request details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchRequestDetails();
    }
  }, [id, tasks, history]);

  const processRequest = async (action: 'approve' | 'decline', comment: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would send the approval/decline action to an API
      
      // Navigate back to tasks screen
      router.replace('/(tabs)/tasks');
    } catch (err) {
      setError(err.message || `Failed to ${action} request`);
    }
  };

  return {
    request,
    isLoading,
    error,
    processRequest,
  };
}