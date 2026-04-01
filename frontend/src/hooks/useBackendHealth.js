import { useEffect, useState } from 'react';
import { checkHealth } from '../utils/api';

export function useBackendHealth() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        await checkHealth();
        if (active) setStatus('online');
      } catch {
        if (active) setStatus('offline');
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
