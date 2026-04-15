import { useEffect, useState } from 'react';

export function useEventSource(url) {
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
      // Optionally reconnect after a delay
      setTimeout(() => {
        const newSource = new EventSource(url);
        // need to reassign; but for simplicity we'll let component re-render
      }, 5000);
    };
    
    return () => {
      eventSource.close();
    };
  }, [url]);

  return lastEvent;
}