'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

// Simple global state for notifications
let notifications: Notification[] = [];
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach(listener => listener());
}

export function addNotification(notification: Omit<Notification, 'id'>) {
  const id = `notification_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  notifications = [...notifications, { ...notification, id }];
  notify();

  // Auto-remove after duration
  const duration = notification.duration ?? 5000;
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }
}

export function removeNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  notify();
}

// Convenience functions
export function notifySuccess(title: string, message?: string) {
  addNotification({ type: 'success', title, message });
}

export function notifyError(title: string, message?: string) {
  addNotification({ type: 'error', title, message, duration: 8000 });
}

export function notifyWarning(title: string, message?: string) {
  addNotification({ type: 'warning', title, message });
}

export function notifyInfo(title: string, message?: string) {
  addNotification({ type: 'info', title, message });
}

function useNotifications(): Notification[] {
  const [, setUpdate] = useState(0);

  useEffect(() => {
    const listener = () => setUpdate(u => u + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return notifications;
}

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR_MAP: Record<NotificationType, string> = {
  success: 'bg-green-500/10 border-green-500/30 text-green-500',
  error: 'bg-red-500/10 border-red-500/30 text-red-500',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
};

export function NotificationContainer() {
  const notifs = useNotifications();

  if (notifs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifs.map((notification) => {
        const Icon = ICON_MAP[notification.type];
        const colorClass = COLOR_MAP[notification.type];

        return (
          <div
            key={notification.id}
            className={`
              flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
              animate-in slide-in-from-right-full duration-300
              ${colorClass}
            `}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{notification.title}</p>
              {notification.message && (
                <p className="text-sm opacity-80 mt-0.5">{notification.message}</p>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Hook for components to use
export function useNotify() {
  return {
    success: notifySuccess,
    error: notifyError,
    warning: notifyWarning,
    info: notifyInfo,
  };
}
