import { useState, useEffect } from 'react';

// Mock history data
const mockHistory = [
  {
    id: '101',
    title: 'Server Maintenance Schedule',
    description: 'Request to approve maintenance window for server updates.',
    status: 'approved',
    processed_at: '2025-03-10T15:45:00Z',
    comment: 'Approved as requested. Please ensure customer notifications are sent 24 hours in advance.',
  },
  {
    id: '102',
    title: 'Hiring Freeze Exception',
    description: 'Request to approve critical hire for security engineer position despite company-wide hiring freeze.',
    status: 'approved',
    processed_at: '2025-03-08T11:30:00Z',
    comment: 'Approved given the critical nature of the security position.',
  },
  {
    id: '103',
    title: 'Conference Travel Budget',
    description: 'Request to approve travel expenses for team to attend industry conference.',
    status: 'declined',
    processed_at: '2025-03-05T09:15:00Z',
    comment: 'Declined due to budget constraints. Please consider virtual attendance options.',
  },
  {
    id: '104',
    title: 'Special Customer Discount',
    description: 'Request to approve 20% discount for enterprise customer renewal.',
    status: 'approved',
    processed_at: '2025-03-01T14:22:00Z',
  },
  {
    id: '105',
    title: 'Emergency Production Hotfix',
    description: 'Request to approve out-of-band hotfix deployment to fix critical bug affecting payment processing.',
    status: 'approved',
    processed_at: '2025-02-28T18:05:00Z',
    comment: 'Approved for immediate deployment. Please follow up with root cause analysis.',
  },
  {
    id: '106',
    title: 'External Vendor Access',
    description: 'Request to grant temporary access to development environment for external contractor.',
    status: 'declined',
    processed_at: '2025-02-25T10:40:00Z',
    comment: 'Declined. Please use the sandbox environment for external vendors per security policy.',
  },
];

export function useFetchHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would fetch data from an API
      setHistory(mockHistory);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}