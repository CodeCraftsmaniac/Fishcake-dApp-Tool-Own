'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { useMiningStore } from '@/lib/stores/miningStore';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Hash,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface MiningEventRow {
  id: string;
  walletAddress: string;
  chainEventId: number | null;
  status: string;
  dropsChecklist: string;
  totalDropped: string | null;
  rewardReceived: string | null;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PENDING: { color: 'bg-gray-500', icon: Clock, label: 'Pending' },
  CREATED: { color: 'bg-blue-500', icon: Hash, label: 'Created' },
  DROPPING: { color: 'bg-yellow-500', icon: Clock, label: 'Dropping' },
  DROPS_COMPLETE: { color: 'bg-green-500', icon: CheckCircle2, label: 'Drops Done' },
  MONITORING: { color: 'bg-purple-500', icon: Clock, label: 'Monitoring' },
  MINING_COMPLETE: { color: 'bg-green-600', icon: CheckCircle2, label: 'Mined' },
  FINISHING: { color: 'bg-blue-600', icon: Clock, label: 'Finishing' },
  FINISHED: { color: 'bg-emerald-500', icon: CheckCircle2, label: 'Finished' },
  FAILED: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
  TIMEOUT: { color: 'bg-orange-500', icon: AlertTriangle, label: 'Timeout' },
};

export function EventHistory() {
  const { events } = useMiningStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Convert store events to display format
  const displayEvents: MiningEventRow[] = events.map(e => ({
    id: e.id,
    walletAddress: e.walletId, // In real app, would resolve wallet address
    chainEventId: e.chainEventId,
    status: e.status.toUpperCase().replace(/_/g, '_'),
    dropsChecklist: e.dropsChecklist,
    totalDropped: e.totalDropped,
    rewardReceived: e.rewardReceived,
    startedAt: e.startedAt,
    finishedAt: e.finishedAt,
    error: e.error,
  }));

  const filteredEvents = filter === 'all' 
    ? displayEvents 
    : displayEvents.filter(e => e.status === filter);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Event History</h3>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
          >
            <option value="all">All Events</option>
            <option value="FINISHED">Finished</option>
            <option value="FAILED">Failed</option>
            <option value="MONITORING">Monitoring</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No events yet</p>
            <p className="text-sm">Events will appear here when mining starts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = config.icon;
              const isExpanded = expandedId === event.id;

              return (
                <div
                  key={event.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* Main row */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            #{event.chainEventId || '—'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {dayjs(event.startedAt).fromNow()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {event.dropsChecklist}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.totalDropped ? `${event.totalDropped} FCC` : '—'}
                        </p>
                      </div>
                      
                      {event.rewardReceived && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          +{event.rewardReceived} FCC
                        </Badge>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/30">
                      <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Wallet</p>
                          <p className="font-mono">{event.walletAddress}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Chain Event ID</p>
                          <p className="font-mono">{event.chainEventId || 'Not created yet'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Started</p>
                          <p>{dayjs(event.startedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Finished</p>
                          <p>
                            {event.finishedAt 
                              ? dayjs(event.finishedAt).format('YYYY-MM-DD HH:mm:ss')
                              : 'In progress'
                            }
                          </p>
                        </div>
                        {event.error && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Error</p>
                            <p className="text-red-400">{event.error}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {event.chainEventId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://polygonscan.com/address/0x2CAf752814f244b3778e30c27051cc6B45CB1fc9`, '_blank');
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View on PolygonScan
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
