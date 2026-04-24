'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useMiningStore } from '@/lib/stores/miningStore';
import { useUIStore } from '@/lib/stores';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useMiningSSE() {
  const addLog = useMiningStore((s) => s.addLog);
  const updateWallet = useMiningStore((s) => s.updateWallet);
  const setSchedulerRunning = useMiningStore((s) => s.setSchedulerRunning);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);
  
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_INTERVAL = 3000;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (esRef.current?.readyState === EventSource.OPEN) return;

    try {
      const es = new EventSource(`${API_URL}/api/mining/stream`);
      esRef.current = es;

      es.onopen = () => {
        reconnectAttemptRef.current = 0;
        setConnectionStatus('connected');
      };

      es.addEventListener('connected', () => {
        setConnectionStatus('connected');
      });

      es.addEventListener('log', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          addLog({
            level: (data.level || 'INFO').toLowerCase(),
            message: data.message,
            walletId: data.walletAddress || null,
            eventId: data.eventId || null,
            action: data.action || 'SSE',
            txHash: data.txHash || null,
          });
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setSchedulerRunning(data.isRunning ?? false);
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('wallet_start', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.walletId) {
            updateWallet(data.walletId, { status: 'active' });
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.addEventListener('wallet_complete', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.walletId) {
            updateWallet(data.walletId, { status: 'active' });
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.onerror = () => {
        setConnectionStatus('disconnected');
        es.close();
        esRef.current = null;

        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_INTERVAL);
        }
      };
    } catch {
      setConnectionStatus('error');
    }
  }, [addLog, updateWallet, setSchedulerRunning, setConnectionStatus]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = MAX_RECONNECT_ATTEMPTS + 1; // Prevent auto-reconnect
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, [connect]);

  return { connect, disconnect };
}
