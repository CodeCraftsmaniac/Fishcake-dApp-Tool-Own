'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface SSEMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

interface UseSSEOptions {
  url: string;
  onMessage?: (message: SSEMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useSSE(options: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualClose = useRef(false);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

    try {
      isManualClose.current = false;
      const es = new EventSource(options.url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setReconnectAttempt(0);
        options.onConnect?.();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEMessage;
          options.onMessage?.(data);
        } catch {
          options.onMessage?.({ type: 'raw', data: event.data });
        }
      };

      es.onerror = (error) => {
        setIsConnected(false);
        options.onError?.(error);
        es.close();

        if (!isManualClose.current) {
          const maxAttempts = options.maxReconnectAttempts ?? 10;
          if (reconnectAttempt < maxAttempts) {
            setReconnectAttempt((prev) => prev + 1);
            reconnectTimeoutRef.current = setTimeout(
              () => connect(),
              options.reconnectInterval ?? 3000
            );
          }
        }
      };
    } catch (err) {
      options.onError?.(err as Event);
    }
  }, [options, reconnectAttempt]);

  const disconnect = useCallback(() => {
    isManualClose.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setReconnectAttempt(0);
    options.onDisconnect?.();
  }, [options]);

  useEffect(() => {
    connect();
    return () => {
      isManualClose.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { isConnected, reconnectAttempt, connect, disconnect };
}
