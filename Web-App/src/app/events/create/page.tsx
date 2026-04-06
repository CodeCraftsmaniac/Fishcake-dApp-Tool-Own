'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useWalletStore } from '@/lib/stores';
import { useEventManagerContract, useTokenContract } from '@/lib/hooks';
import { CONTRACTS, TOKEN_DECIMALS, DEFAULT_LOCATION } from '@/lib/config';
import { toWei, formatNumber } from '@/lib/utils';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

// Event templates
const templates = [
  {
    id: 'quick',
    name: 'Quick Airdrop',
    description: '12 FCC each, 2 drops = 24 FCC total',
    amount: 12,
    drops: 2,
    icon: '⚡',
  },
  {
    id: 'small',
    name: 'Small Event',
    description: '5 FCC each, 5 drops = 25 FCC total',
    amount: 5,
    drops: 5,
    icon: '🎁',
  },
  {
    id: 'medium',
    name: 'Medium Event',
    description: '10 FCC each, 10 drops = 100 FCC total',
    amount: 10,
    drops: 10,
    icon: '🎉',
  },
  {
    id: 'large',
    name: 'Large Event',
    description: '20 FCC each, 20 drops = 400 FCC total',
    amount: 20,
    drops: 20,
    icon: '🚀',
  },
];

const businessNames = [
  'Fishcake Community Drop',
  'FCC Rewards Program',
  'Community Appreciation',
  'Token Giveaway Event',
  'Loyalty Rewards',
];

export default function CreateEventPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const { balances } = useWalletStore();
  const { createEvent, isLoading: isCreating } = useEventManagerContract();
  const { approve, isLoading: isApproving } = useTokenContract();
  
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [customDrops, setCustomDrops] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  // Calculate values
  const getValues = () => {
    if (isCustom) {
      return {
        amount: parseFloat(customAmount) || 0,
        drops: parseInt(customDrops) || 0,
      };
    }
    const template = templates.find((t) => t.id === selectedTemplate);
    return {
      amount: template?.amount || 0,
      drops: template?.drops || 0,
    };
  };

  const { amount, drops } = getValues();
  const total = amount * drops;
  const hasEnoughBalance = parseFloat(balances.fcc) >= total;

  // Generate random event name if not set
  const getEventName = () => {
    if (businessName) return businessName;
    return businessNames[Math.floor(Math.random() * businessNames.length)];
  };

  // Handle approval
  const handleApprove = async () => {
    try {
      await approve(CONTRACTS.FCC_TOKEN, CONTRACTS.EVENT_MANAGER, total.toString(), TOKEN_DECIMALS.FCC);
      setIsApproved(true);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  // Handle create event
  const handleCreate = async () => {
    const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
    const amountWei = toWei(amount, TOKEN_DECIMALS.FCC);
    const totalWei = toWei(total, TOKEN_DECIMALS.FCC);
    const content = JSON.stringify({
      activityContentDescription: description || 'Fishcake airdrop event',
      activityContentAddress: '',
      activityContentLink: '',
    });

    try {
      await createEvent({
        businessName: getEventName(),
        activityContent: content,
        latitudeLongitude: DEFAULT_LOCATION,
        deadline,
        totalDropAmts: totalWei,
        dropType: 1, // EVEN drop type
        dropNumber: drops,
        minDropAmt: amountWei,
        maxDropAmt: amountWei,
        tokenAddress: CONTRACTS.FCC_TOKEN,
      });
      setIsCreated(true);
    } catch (error) {
      console.error('Event creation failed:', error);
    }
  };

  // Handle success
  if (isCreated) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Event Created!</h2>
              <p className="text-muted-foreground mb-6">
                Your event has been created successfully.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/events">
                  <Button variant="outline">View Events</Button>
                </Link>
                <Link href="/drops">
                  <Button>Start Dropping</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/events">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Event</h1>
            <p className="text-muted-foreground">
              Set up a new airdrop event
            </p>
          </div>
        </div>

        {/* Step 1: Select Template */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Templates */}
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setIsCustom(false);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTemplate === template.id && !isCustom
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold">{template.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Custom option */}
              <div
                onClick={() => setIsCustom(true)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isCustom
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold flex items-center gap-2">
                  <span>✏️</span> Custom Amount
                </h4>
                {isCustom && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-xs text-muted-foreground">FCC per drop</label>
                      <Input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Number of drops</label>
                      <Input
                        type="number"
                        value={customDrops}
                        onChange={(e) => setCustomDrops(e.target.value)}
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              {(selectedTemplate || (isCustom && amount > 0 && drops > 0)) && (
                <div className="p-4 rounded-xl bg-secondary/50">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Required</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-fishcake-500">
                        {formatNumber(total, 2)} FCC
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatNumber(balances.fcc, 2)} FCC
                      </p>
                    </div>
                  </div>
                  {!hasEnoughBalance && (
                    <p className="text-xs text-red-500 mt-2">
                      Insufficient FCC balance
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!hasEnoughBalance || total === 0}
                className="w-full"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details & Confirm */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Event Name (optional)</label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Leave blank for random name"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Description (optional)</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief event description"
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount per drop</span>
                  <span className="font-medium">{formatNumber(amount, 2)} FCC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of drops</span>
                  <span className="font-medium">{drops}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-fishcake-500">
                    {formatNumber(total, 2)} FCC
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                
                {!isApproved ? (
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving || !isConnected}
                    className="flex-1"
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isApproving ? 'Approving...' : 'Approve FCC'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isCreating ? 'Creating...' : 'Create Event'}
                  </Button>
                )}
              </div>

              {isApproved && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  FCC approved successfully
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
