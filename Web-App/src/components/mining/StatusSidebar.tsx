'use client';

import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { healthApi, rpcApi, miningApi } from '@/lib/api/backendClient';
import {
  Activity,
  Server,
  Wifi,
  WifiOff,
  Cpu,
  Database,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Zap,
  Shield,
  HardDrive,
} from 'lucide-react';
import { Badge } from '@/components/ui';

interface SystemStatus {
  backend: {
    connected: boolean;
    version: string;
    uptime: number;
    environment: string;
    database: string;
  };
  scheduler: {
    running: boolean;
    processingWallets: number;
    activeWallets: number;
  };
  rpc: {
    current: string;
    latency: number;
    healthy: number;
    total: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
  };
}

export default memo(function StatusSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setError(null);
      const [healthRes, statusRes] = await Promise.all([
        healthApi.check(),
        miningApi.status(),
      ]);

      if (healthRes.success && healthRes.data) {
        const health = healthRes.data;
        setStatus({
          backend: {
            connected: health.status === 'healthy',
            version: health.version || 'unknown',
            uptime: health.uptime || 0,
            environment: health.environment || 'unknown',
            database: (health as any).database || 'unknown',
          },
          scheduler: {
            running: health.scheduler?.running || false,
            processingWallets: health.scheduler?.processingWallets || 0,
            activeWallets: health.scheduler?.activeWallets || 0,
          },
          rpc: {
            current: health.rpc?.current || 'Unknown',
            latency: health.rpc?.currentLatency || -1,
            healthy: health.rpc?.healthy || 0,
            total: health.rpc?.total || 0,
          },
          memory: {
            heapUsed: (health as any).memory?.heapUsed || 0,
            heapTotal: (health as any).memory?.heapTotal || 0,
          },
        });
        setLastUpdate(new Date());
      } else {
        setStatus(prev => prev ? { ...prev, backend: { ...prev.backend, connected: false } } : null);
        setError('Backend unreachable');
      }
    } catch (err) {
      setError('Connection failed');
      setStatus(prev => prev ? { ...prev, backend: { ...prev.backend, connected: false } } : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusColor = (connected: boolean) => 
    connected ? 'text-green-500' : 'text-red-500';

  const getLatencyColor = (ms: number) => {
    if (ms < 0) return 'text-gray-400';
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-50',
          'bg-gradient-to-br from-purple-600 to-pink-600 text-white',
          'p-2 rounded-l-lg shadow-lg hover:shadow-xl transition-all',
          'flex items-center gap-1',
          isOpen && 'translate-x-80'
        )}
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!isOpen && <Activity size={14} />}
      </button>

      {/* Status Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 shadow-2xl z-40',
          'transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
                <Server size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">System Status</h3>
                <p className="text-xs text-gray-500">Real-time monitoring</p>
              </div>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            >
              <RefreshCw size={14} className={cn('text-gray-600', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Status Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <XCircle size={16} className="text-red-500" />
              <span className="text-xs font-semibold text-red-700">{error}</span>
            </div>
          )}

          {/* Backend Status */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-gray-600" />
                <span className="text-xs font-bold text-gray-700">Backend Server</span>
              </div>
              <Badge className={cn(
                'text-xs font-bold',
                status?.backend.connected
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              )}>
                {status?.backend.connected ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="font-semibold text-gray-700">{status?.backend.version || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Environment</span>
                <span className="font-semibold text-gray-700 capitalize">{status?.backend.environment || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Database</span>
                <span className="font-semibold text-gray-700 capitalize">{status?.backend.database || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Uptime</span>
                <span className="font-semibold text-gray-700">{status ? formatUptime(status.backend.uptime) : '-'}</span>
              </div>
            </div>
          </div>

          {/* Scheduler Status */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-gray-600" />
                <span className="text-xs font-bold text-gray-700">Automation</span>
              </div>
              <Badge className={cn(
                'text-xs font-bold',
                status?.scheduler.running
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              )}>
                {status?.scheduler.running ? 'Running' : 'Stopped'}
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Active Wallets</span>
                <span className="font-semibold text-gray-700">{status?.scheduler.activeWallets || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Processing</span>
                <span className="font-semibold text-gray-700">{status?.scheduler.processingWallets || 0}</span>
              </div>
            </div>
          </div>

          {/* RPC Status */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-gray-600" />
                <span className="text-xs font-bold text-gray-700">RPC Connection</span>
              </div>
              <Badge className={cn(
                'text-xs font-bold',
                (status?.rpc.healthy || 0) > 0
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              )}>
                {status?.rpc.healthy || 0}/{status?.rpc.total || 0} Healthy
              </Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Current RPC</span>
                <span className="font-semibold text-gray-700 truncate max-w-[120px]">{status?.rpc.current || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Latency</span>
                <span className={cn('font-semibold', getLatencyColor(status?.rpc.latency || -1))}>
                  {status?.rpc.latency && status.rpc.latency > 0 ? `${status.rpc.latency}ms` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive size={14} className="text-gray-600" />
                <span className="text-xs font-bold text-gray-700">Memory Usage</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Heap Used</span>
                <span className="font-semibold text-gray-700">{formatBytes(status?.memory.heapUsed || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${status?.memory.heapTotal ? (status.memory.heapUsed / status.memory.heapTotal * 100) : 0}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Heap Total</span>
                <span className="font-semibold text-gray-700">{formatBytes(status?.memory.heapTotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock size={12} />
              <span>Last updated</span>
            </div>
            <span className="font-semibold text-gray-700">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : '-'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
});
