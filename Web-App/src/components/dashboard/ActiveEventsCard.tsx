'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Progress, Skeleton } from '@/components/ui';
import { formatNumber, formatCountdown } from '@/lib/utils';
import { getFishcakeEventUrl } from '@/lib/config';
import { Calendar, ExternalLink, Droplets } from 'lucide-react';

interface Event {
  activityId: number;
  businessName: string;
  tokenSymbol: 'FCC' | 'USDT';
  dropNumber: number;
  alreadyDropNumber: number;
  activityDeadLine: number;
  activityStatus: number;
  maxDropAmt: string;
  tokenDecimals: number;
}

interface ActiveEventsCardProps {
  events: Event[];
  isLoading?: boolean;
}

// Single shared time ticker - updates all countdowns at once
function useSharedTime() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return now;
}

function EventRow({ event, now }: { event: Event; now: number }) {
  const isExpired = event.activityDeadLine < now;
  const isFinished = event.activityStatus === 2;
  const dropProgress = (event.alreadyDropNumber / event.dropNumber) * 100;

  const countdown = useMemo(() => {
    if (isExpired || isFinished) return '';
    const remaining = event.activityDeadLine - now;
    return remaining > 0 ? formatCountdown(remaining) : 'Ended';
  }, [event.activityDeadLine, now, isExpired, isFinished]);

  const getStatusBadge = () => {
    if (isFinished) return <Badge variant="finished">FINISHED</Badge>;
    if (isExpired) return <Badge variant="expired">EXPIRED</Badge>;
    return <Badge variant="active">ACTIVE</Badge>;
  };

  return (
    <div className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">#{event.activityId}</span>
              <Badge variant={event.tokenSymbol === 'FCC' ? 'fcc' : 'usdt'}>
                {event.tokenSymbol === 'FCC' ? '🍥' : '💲'} {event.tokenSymbol}
              </Badge>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {event.businessName}
            </p>
          </div>
        </div>

        <div className="text-right">
          {!isFinished && !isExpired ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Ends in</span>
              <span className="font-mono text-foreground">{countdown}</span>
            </div>
          ) : (
            <span className={isFinished ? 'text-red-500' : 'text-yellow-500'}>
              {isFinished ? 'Completed' : 'Ended'}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Drops: {event.alreadyDropNumber}/{event.dropNumber}</span>
          <span>{dropProgress.toFixed(0)}%</span>
        </div>
        <Progress 
          value={dropProgress} 
          className="h-2"
          indicatorColor={event.tokenSymbol === 'FCC' ? 'bg-fishcake-500' : 'bg-green-500'}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Link href={`/events/${event.activityId}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
        {!isFinished && !isExpired && (
          <Link href={`/drops?eventId=${event.activityId}`} className="flex-1">
            <Button size="sm" className="w-full gap-1">
              <Droplets className="h-4 w-4" />
              Drop
            </Button>
          </Link>
        )}
        <a 
          href={getFishcakeEventUrl(event.activityId)} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}

export function ActiveEventsCard({ events, isLoading }: ActiveEventsCardProps) {
  // Single shared timer for all events
  const now = useSharedTime();
  
  const activeEvents = useMemo(() => {
    return events.filter(e => e.activityStatus !== 2 && e.activityDeadLine > now);
  }, [events, now]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Active Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Active Events
          {activeEvents.length > 0 && (
            <Badge variant="secondary">{activeEvents.length}</Badge>
          )}
        </CardTitle>
        <Link href="/events">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No events yet</p>
            <Link href="/events/create">
              <Button variant="outline" size="sm" className="mt-3">
                Create Event
              </Button>
            </Link>
          </div>
        ) : (
          events.slice(0, 5).map((event) => (
            <EventRow key={event.activityId} event={event} now={now} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
