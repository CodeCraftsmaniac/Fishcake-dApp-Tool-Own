'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge, Skeleton } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useEventManagerContract, useAddressBookStore, EventInfo } from '@/lib/hooks';
import { CONTRACTS, getExplorerUrl } from '@/lib/config';
import { formatNumber, isValidAddress } from '@/lib/utils';
import { Droplets, Plus, Check, Loader2, Users, ExternalLink, Trash2 } from 'lucide-react';

export default function DropsPage() {
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get('eventId');
  
  const { address, isConnected } = useWallet();
  const { getMyEvents, drop, isLoading: isDropping } = useEventManagerContract();
  const { entries: savedAddresses } = useAddressBookStore();

  const [events, setEvents] = useState<EventInfo[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    preselectedEventId ? parseInt(preselectedEventId) : null
  );
  const [dropAddresses, setDropAddresses] = useState<string[]>(['']);
  const [dropHash, setDropHash] = useState<string | null>(null);
  const [isDropped, setIsDropped] = useState(false);

  // Load events
  useEffect(() => {
    if (!isConnected || !address) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const myEvents = await getMyEvents();
        setEvents(myEvents);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();
  }, [isConnected, address, getMyEvents]);

  // Get active events only
  const activeEvents = events.filter((e) => {
    const now = Math.floor(Date.now() / 1000);
    return e.activityStatus !== 2 && e.activityDeadLine > now && e.alreadyDropNumber < e.dropNumber;
  });

  const selectedEvent = events.find((e) => e.activityId === selectedEventId);

  // Handle single drop
  const handleDrop = async (toAddress: string) => {
    if (!selectedEvent || !isValidAddress(toAddress)) return;

    const amountWei = BigInt(selectedEvent.maxDropAmt);
    
    try {
      const result = await drop(selectedEvent.activityId, toAddress, amountWei);
      setDropHash(result.hash);
      setIsDropped(result.success);
    } catch (error) {
      console.error('Drop failed:', error);
    }
  };

  // Add address to list
  const addAddress = () => {
    setDropAddresses([...dropAddresses, '']);
  };

  // Update address in list
  const updateAddress = (index: number, value: string) => {
    const updated = [...dropAddresses];
    updated[index] = value;
    setDropAddresses(updated);
  };

  // Remove address from list
  const removeAddress = (index: number) => {
    if (dropAddresses.length > 1) {
      setDropAddresses(dropAddresses.filter((_, i) => i !== index));
    }
  };

  // Add from address book
  const addFromAddressBook = (addr: string) => {
    const emptyIndex = dropAddresses.findIndex((a) => !a);
    if (emptyIndex >= 0) {
      updateAddress(emptyIndex, addr);
    } else {
      setDropAddresses([...dropAddresses, addr]);
    }
  };

  const validAddresses = dropAddresses.filter((a) => isValidAddress(a));
  const dropsRemaining = selectedEvent ? selectedEvent.dropNumber - selectedEvent.alreadyDropNumber : 0;
  const canDrop = validAddresses.length > 0 && validAddresses.length <= dropsRemaining;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Drop Rewards</h1>
          <p className="text-muted-foreground">
            Send tokens to addresses from your events
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Event Selection & Drop Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  Select Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : activeEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active events available</p>
                    <Link href="/events/create">
                      <Button size="sm" className="mt-2">
                        Create Event
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeEvents.map((event) => (
                      <div
                        key={event.activityId}
                        onClick={() => setSelectedEventId(event.activityId)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedEventId === event.activityId
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={event.tokenSymbol === 'FCC' ? 'fcc' : 'usdt'}>
                              {event.tokenSymbol === 'FCC' ? '🍥' : '💲'} {event.tokenSymbol}
                            </Badge>
                            <span className="font-medium">#{event.activityId}</span>
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {event.businessName}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {event.alreadyDropNumber}/{event.dropNumber} drops
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(parseInt(event.maxDropAmt) / Math.pow(10, event.tokenDecimals), 2)} {event.tokenSymbol} each
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drop Form */}
            {selectedEvent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Drop Addresses</span>
                    <Badge variant="secondary">
                      {dropsRemaining} drops remaining
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Address inputs */}
                  {dropAddresses.map((addr, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={addr}
                        onChange={(e) => updateAddress(index, e.target.value)}
                        placeholder="0x..."
                        className="font-mono"
                        error={addr ? !isValidAddress(addr) : false}
                      />
                      {dropAddresses.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAddress(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Add more button */}
                  {dropAddresses.length < dropsRemaining && (
                    <Button
                      variant="outline"
                      onClick={addAddress}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Address
                    </Button>
                  )}

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valid addresses</span>
                      <span className="font-medium">{validAddresses.length}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Total to drop</span>
                      <span className="font-medium">
                        {formatNumber(
                          validAddresses.length * parseInt(selectedEvent.maxDropAmt) / Math.pow(10, selectedEvent.tokenDecimals),
                          2
                        )} {selectedEvent.tokenSymbol}
                      </span>
                    </div>
                  </div>

                  {/* Drop button */}
                  <Button
                    onClick={() => validAddresses[0] && handleDrop(validAddresses[0])}
                    disabled={!canDrop || isDropping}
                    className="w-full"
                  >
                    {isDropping ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Dropping...
                      </>
                    ) : (
                      <>
                        <Droplets className="h-4 w-4 mr-2" />
                        Drop to {validAddresses.length} address{validAddresses.length !== 1 ? 'es' : ''}
                      </>
                    )}
                  </Button>

                  {isDropped && dropHash && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-500">
                      <Check className="h-4 w-4" />
                      <span>Drop successful!</span>
                      <a
                        href={getExplorerUrl('tx', dropHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto"
                      >
                        <Button variant="ghost" size="sm" className="gap-1 h-7">
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Address Book */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Address Book
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedAddresses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved addresses</p>
                    <Link href="/settings/addresses">
                      <Button size="sm" variant="outline" className="mt-2">
                        Add Addresses
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedAddresses.slice(0, 10).map((entry) => (
                      <div
                        key={entry.address}
                        onClick={() => selectedEvent && addFromAddressBook(entry.address)}
                        className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                      >
                        <p className="font-medium text-sm">{entry.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                        </p>
                      </div>
                    ))}
                    {savedAddresses.length > 10 && (
                      <Link href="/settings/addresses">
                        <Button variant="ghost" size="sm" className="w-full">
                          View all {savedAddresses.length} addresses
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
