import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

// Combine mock data from both approvals and history
import { useFetchApprovals } from './useFetchApprovals';
import { useFetchHistory } from './useFetchHistory';

export function useRequestDetails(id: string) {
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const { approvals } = useFetchApprovals();
  const { history } = useFetchHistory();

  useEffect(() => {
    const fetchRequestDetails = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // In a real app, this would fetch detailed data from an API
        // For the mock, we'll combine our approvals and history data
        
        // Check approvals first (pending requests)
        const pendingRequest = approvals.find(item => item.id === id);
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
        console.error('Error fetching request details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchRequestDetails();
    }
  }, [id, approvals, history]);

  const processRequest = async (action: 'approve' | 'decline', comment: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would send the approval/decline action to an API
      console.log(`Request ${id} ${action}d with comment: ${comment}`);
      
      // Navigate back to approvals screen
      router.replace('/(tabs)/approvals');
    } catch (err) {
      setError(err.message || `Failed to ${action} request`);
      console.error(`Error ${action}ing request:`, err);
    }
  };

  return {
    request,
    isLoading,
    error,
    processRequest,
  };
}