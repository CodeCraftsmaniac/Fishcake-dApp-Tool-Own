'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, Button, Badge, Progress, Skeleton } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useEventManagerContract } from '@/lib/hooks';
import { formatNumber, formatCountdown } from '@/lib/utils';
import { getFishcakeEventUrl, getExplorerUrl } from '@/lib/config';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Droplets, Clock, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EventDetails {
  activityId: number;
  businessName: string;
  tokenSymbol: 'FCC' | 'USDT';
  tokenDecimals: number;
  dropNumber: number;
  alreadyDropNumber: number;
  maxDropAmt: string;
  activityDeadLine: number;
  activityStatus: number;
  activityContent: string;
  latitudeLongitude: string;
  businessAccount: string;
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id ? parseInt(params.id as string) : undefined;
  const { getEvent } = useEventManagerContract();
  const { isConnected } = useWallet();
  
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  // Load event data
  useEffect(() => {
    if (!eventId) return;

    const loadEvent = async () => {
      setIsLoading(true);
      try {
        const { base, ext } = await getEvent(eventId);
        
        if (Number(base.activityId) === 0) {
          setEvent(null);
          return;
        }

        const tokenAddr = base.tokenContractAddr.toLowerCase();
        const isFCC = tokenAddr.includes('84ebc138');
        
        setEvent({
          activityId: Number(base.activityId),
          businessName: base.businessName,
          tokenSymbol: isFCC ? 'FCC' : 'USDT',
          tokenDecimals: 6,
          dropNumber: Number(base.dropNumber),
          alreadyDropNumber: Number(ext.alreadyDropNumber),
          maxDropAmt: base.maxDropAmt.toString(),
          activityDeadLine: Number(base.activityDeadline),
          activityStatus: Number(ext.activityStatus),
          activityContent: base.activityContent,
          latitudeLongitude: base.latitudeLongitude,
          businessAccount: base.businessAccount,
        });
      } catch (error) {
        console.error('Failed to load event:', error);
        setEvent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [eventId, getEvent]);

  // Parse activity content
  const parseContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return {
        description: parsed.activityContentDescription || '',
        address: parsed.activityContentAddress || '',
        link: parsed.activityContentLink || '',
      };
    } catch {
      return { description: content, address: '', link: '' };
    }
  };

  // Live countdown
  useEffect(() => {
    if (!event) return;

    const now = Math.floor(Date.now() / 1000);
    const isExpired = event.activityDeadLine < now;
    const isFinished = event.activityStatus === 2;

    if (isExpired || isFinished) return;

    const updateCountdown = () => {
      const remaining = event.activityDeadLine - Math.floor(Date.now() / 1000);
      setCountdown(remaining > 0 ? formatCountdown(remaining) : 'Ended');
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
              <p className="text-muted-foreground mb-4">
                Event #{eventId} does not exist
              </p>
              <Link href="/events">
                <Button>Back to Events</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const content = parseContent(event.activityContent);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = event.activityDeadLine < now;
  const isFinished = event.activityStatus === 2;
  const dropProgress = (event.alreadyDropNumber / event.dropNumber) * 100;
  const amountEach = parseInt(event.maxDropAmt) / Math.pow(10, event.tokenDecimals);
  const totalAmount = amountEach * event.dropNumber;
  const droppedAmount = amountEach * event.alreadyDropNumber;

  const getStatus = () => {
    if (isFinished) return { label: 'Finished', variant: 'finished' as const, icon: Check };
    if (isExpired) return { label: 'Expired', variant: 'expired' as const, icon: X };
    return { label: 'Active', variant: 'active' as const, icon: Clock };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/events">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Event #{event.activityId}</h1>
              <Badge variant={event.tokenSymbol === 'FCC' ? 'fcc' : 'usdt'}>
                {event.tokenSymbol === 'FCC' ? '🍥' : '💲'} {event.tokenSymbol}
              </Badge>
              <Badge variant={status.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{event.businessName}</p>
          </div>
          <a
            href={getFishcakeEventUrl(event.activityId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View on Fishcake
            </Button>
          </a>
        </div>

        {/* Main Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Progress Section */}
            <div className="p-4 rounded-xl bg-secondary/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Drop Progress</h3>
                <span className="text-2xl font-bold">
                  {event.alreadyDropNumber}/{event.dropNumber}
                </span>
              </div>
              <Progress
                value={dropProgress}
                className="h-3"
                indicatorColor={event.tokenSymbol === 'FCC' ? 'bg-fishcake-500' : 'bg-green-500'}
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>
                  {formatNumber(droppedAmount, 2)} {event.tokenSymbol} dropped
                </span>
                <span>
                  {formatNumber(totalAmount - droppedAmount, 2)} {event.tokenSymbol} remaining
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Amount Each</p>
                <p className="text-lg font-semibold">
                  {formatNumber(amountEach, 2)} {event.tokenSymbol}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-lg font-semibold">
                  {formatNumber(totalAmount, 2)} {event.tokenSymbol}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Drop Type</p>
                <p className="text-lg font-semibold">EVEN</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">
                  {isFinished || isExpired ? 'Status' : 'Ends in'}
                </p>
                <p className="text-lg font-semibold">
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

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                <p className="text-foreground">
                  {content.description || 'No description provided'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.latitudeLongitude}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Deadline: {new Date(event.activityDeadLine * 1000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Creator */}
            <div className="p-4 rounded-xl bg-secondary/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Creator</p>
                <p className="font-mono text-sm">
                  {event.businessAccount.slice(0, 10)}...{event.businessAccount.slice(-8)}
                </p>
              </div>
              <a
                href={getExplorerUrl('address', event.businessAccount)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm" className="gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Explorer
                </Button>
              </a>
            </div>

            {/* Actions */}
            {!isFinished && !isExpired && (
              <div className="flex gap-3">
                <Link href={`/drops?eventId=${event.activityId}`} className="flex-1">
                  <Button className="w-full gap-2">
                    <Droplets className="h-4 w-4" />
                    Drop to Address
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
