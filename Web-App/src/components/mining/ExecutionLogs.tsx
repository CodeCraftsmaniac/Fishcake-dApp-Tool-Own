'use client';

import { useMiningStore, ExecutionLog } from '@/lib/stores/miningStore';
import { Card, CardContent, Button } from '@/components/ui';
import { 
  Trash2, 
  Download,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';
import { useState } from 'react';

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'success';

const levelConfig = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  warn: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

export function ExecutionLogs() {
  const { logs, clearLogs } = useMiningStore();
  const [filter, setFilter] = useState<LogLevel>('all');

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const handleExport = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mining-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Execution Logs</h3>
            <p className="text-xs text-gray-700 font-semibold">
              {logs.length} total entries
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-200">
              {(['all', 'success', 'info', 'warn', 'error'] as LogLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors font-bold ${
                    filter === level
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={handleExport} className="border-gray-200 hover:bg-gray-50 font-bold text-xs">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearLogs}
              className="text-red-600 hover:text-red-700 border-gray-200 hover:bg-red-50 font-bold text-xs"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Logs */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h4 className="font-bold mb-2 text-gray-900">No Logs Yet</h4>
            <p className="text-xs text-gray-700 font-semibold">
              Logs will appear here when automation runs
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <LogEntry key={log.id} log={log} formatTime={formatTime} formatDate={formatDate} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LogEntry({ 
  log, 
  formatTime, 
  formatDate 
}: { 
  log: ExecutionLog; 
  formatTime: (t: number) => string;
  formatDate: (t: number) => string;
}) {
  const config = levelConfig[log.level];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} border ${config.border} hover:shadow-sm transition-all`}>
      <Icon className={`w-4 h-4 mt-0.5 ${config.color} flex-shrink-0`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
            {log.action}
          </span>
          {log.walletId && (
            <span className="text-xs text-gray-700 font-mono font-semibold">
              Wallet: {log.walletId.slice(0, 12)}...
            </span>
          )}
        </div>
        <p className="text-xs mt-1 text-gray-800 font-semibold">{log.message}</p>
        {log.txHash && (
          <a
            href={`https://polygonscan.com/tx/${log.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-600 hover:underline font-mono mt-1 block font-bold"
          >
            TX: {log.txHash.slice(0, 20)}...
          </a>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-xs text-gray-700 font-bold">{formatTime(log.timestamp)}</div>
        <div className="text-xs text-gray-600 font-semibold">{formatDate(log.timestamp)}</div>
      </div>
    </div>
  );
}
