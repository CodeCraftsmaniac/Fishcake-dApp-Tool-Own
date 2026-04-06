'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, Button, Badge, Input, Skeleton } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useEventManagerContract, EventInfo } from '@/lib/hooks';
import { formatNumber, formatCountdown } from '@/lib/utils';
import { getFishcakeEventUrl } from '@/lib/config';
import { Calendar, Plus, Search, ExternalLink, Droplets } from 'lucide-react';

function EventCard({ event }: { event: EventInfo }) {
  const [countdown, setCountdown] = useState('');
  const now = Math.floor(Date.now() / 1000);
  const isExpired = event.activityDeadLine < now;
  const isFinished = event.activityStatus === 2;
  const dropProgress = (event.alreadyDropNumber / event.dropNumber) * 100;

  useEffect(() => {
    if (isExpired || isFinished) return;

    const updateCountdown = () => {
      const remaining = event.activityDeadLine - Math.floor(Date.now() / 1000);
      setCountdown(remaining > 0 ? formatCountdown(remaining) : 'Ended');
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event.activityDeadLine, isExpired, isFinished]);

  const getStatus = () => {
    if (isFinished) return { label: 'Finished', variant: 'finished' as const };
    if (isExpired) return { label: 'Expired', variant: 'expired' as const };
    return { label: 'Active', variant: 'active' as const };
  };

  const status = getStatus();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">#{event.activityId}</span>
                <Badge variant={event.tokenSymbol === 'FCC' ? 'fcc' : 'usdt'}>
                  {event.tokenSymbol === 'FCC' ? '🍥' : '💲'} {event.tokenSymbol}
                </Badge>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {event.businessName}
              </p>
            </div>
          </div>

          <a
            href={getFishcakeEventUrl(event.activityId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Drops</p>
            <p className="font-semibold">
              {event.alreadyDropNumber}/{event.dropNumber}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">Amount Each</p>
            <p className="font-semibold">
              {formatNumber(parseInt(event.maxDropAmt) / Math.pow(10, event.tokenDecimals), 2)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground">
              {isFinished || isExpired ? 'Status' : 'Ends in'}
            </p>
            <p className="font-semibold">
              {isFinished ? (
                <span className="text-red-500">Completed</span>
              ) : isExpired ? (
                <span className="text-yellow-500">Ended</span>
              ) : (
                <span className="text-green-500">{countdown}</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{dropProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                event.tokenSymbol === 'FCC' ? 'bg-fishcake-500' : 'bg-green-500'
              }`}
              style={{ width: `${dropProgress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/events/${event.activityId}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          {!isFinished && !isExpired && (
            <Link href={`/drops?eventId=${event.activityId}`} className="flex-1">
              <Button className="w-full gap-2">
                <Droplets className="h-4 w-4" />
                Drop
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventsPage() {
  const { address, isConnected } = useWallet();
  const { getMyEvents } = useEventManagerContract();
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isConnected || !address) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const myEvents = await getMyEvents();
        setEvents(myEvents);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [isConnected, address, getMyEvents]);

  const filteredEvents = events.filter((event) => {
    const now = Math.floor(Date.now() / 1000);
    const isActive = event.activityStatus !== 2 && event.activityDeadLine > now;
    const isFinished = event.activityStatus === 2;

    if (filter === 'active' && !isActive) return false;
    if (filter === 'finished' && !isFinished) return false;

    if (search) {
      const searchLower = search.toLowerCase();
      return (
        event.activityId.toString().includes(searchLower) ||
        event.businessName.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Events</h1>
            <p className="text-muted-foreground">
              Manage your airdrop events
            </p>
          </div>
          <Link href="/events/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by ID or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'finished'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? 'Try a different search term'
                  : 'Create your first event to get started'}
              </p>
              <Link href="/events/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <EventCard key={event.activityId} event={event} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
