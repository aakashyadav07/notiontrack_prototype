import { useEffect, useState, useCallback } from 'react';
import type { JobStatus } from '../types/timetable';

interface UseSeatAllocationJobPollingOptions {
  jobId: string | null;
  interval?: number;
  onComplete?: (result: JobStatus) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export function useSeatAllocationJobPolling({
  jobId,
  interval = 2000,
  onComplete,
  onError,
  enabled = true,
}: UseSeatAllocationJobPollingOptions) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/seat-allocation/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }
      
      const data = await response.json();
      const status = data.data as JobStatus;
      setJobStatus(status);
      
      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        setIsPolling(false);
        if (onComplete) onComplete(status);
      }
    } catch (err) {
      if (onError) onError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [jobId, onComplete, onError]);

  useEffect(() => {
    if (!jobId || !enabled) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    fetchJobStatus();

    const timer = setInterval(fetchJobStatus, interval);
    return () => {
      clearInterval(timer);
      setIsPolling(false);
    };
  }, [jobId, enabled, interval, fetchJobStatus]);

  return { jobStatus, isPolling, refetch: fetchJobStatus };
}