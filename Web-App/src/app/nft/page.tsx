'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useWalletStore } from '@/lib/stores';
import { useNFTManagerContract, useTokenContract } from '@/lib/hooks';
import { CONTRACTS, TOKEN_DECIMALS, NFT_COSTS } from '@/lib/config';
import { formatNumber, formatCountdown } from '@/lib/utils';
import { Sparkles, Shield, Star, Loader2, Check } from 'lucide-react';

const nftTemplates = {
  basic: [
    { name: 'Community Merchant', description: 'Supporting the Fishcake community' },
    { name: 'Token Distributor', description: 'Active FCC distribution partner' },
    { name: 'Airdrop Host', description: 'Hosting community airdrops' },
    { name: 'Local Business', description: 'Local business supporting crypto adoption' },
    { name: 'Digital Creator', description: 'Digital content creator in web3' },
  ],
  pro: [
    { name: 'Premium Merchant', description: 'Premium Fishcake partner', address: 'Polygon Network', website: 'https://fishcake.io', social: '@fishcake' },
    { name: 'Enterprise Partner', description: 'Enterprise-level partnership', address: 'Global', website: 'https://example.com', social: '@enterprise' },
    { name: 'Verified Business', description: 'Verified business account', address: 'Web3 Native', website: 'https://business.io', social: '@verified' },
  ],
};

export default function NFTPage() {
  const { address, isConnected } = useWallet();
  const { balances, nftPass } = useWalletStore();
  const { mintNFT, getNFTStatus, isLoading: isMinting } = useNFTManagerContract();
  const { approve, isLoading: isApproving } = useTokenContract();
  
  const [nftType, setNftType] = useState<'basic' | 'pro'>('basic');
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [isMinted, setIsMinted] = useState(false);

  // Live countdown for existing NFT
  useEffect(() => {
    if (!nftPass.expiresAt) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = nftPass.expiresAt! - now;
      setCountdown(remaining > 0 ? formatCountdown(remaining) : 'Expired');
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nftPass.expiresAt]);

  const cost = nftType === 'basic' ? NFT_COSTS.BASIC : NFT_COSTS.PRO;
  const hasEnoughBalance = parseFloat(balances.usdt) >= cost;
  const template = nftType === 'basic' 
    ? nftTemplates.basic[selectedTemplate]
    : nftTemplates.pro[selectedTemplate];

  // Handle approve
  const handleApprove = async () => {
    try {
      await approve(CONTRACTS.USDT_TOKEN, CONTRACTS.NFT_MANAGER, cost.toString(), TOKEN_DECIMALS.USDT);
      setIsApproved(true);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  // Handle mint
  const handleMint = async () => {
    const proTemplate = template as typeof nftTemplates.pro[0];
    
    try {
      await mintNFT({
        name: template.name,
        description: template.description,
        imgUrl: '',
        nftAddress: nftType === 'pro' ? proTemplate.address : '',
        website: nftType === 'pro' ? proTemplate.website : '',
        social: nftType === 'pro' ? proTemplate.social : template.description,
        nftType: nftType === 'pro' ? 1 : 2, // 1 = Pro, 2 = Basic
      });
      setIsMinted(true);
    } catch (error) {
      console.error('Mint failed:', error);
    }
  };

  // Success state
  if (isMinted) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <div className="h-20 w-20 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">NFT Pass Minted!</h2>
              <p className="text-muted-foreground mb-6">
                You now have a {nftType.toUpperCase()} Merchant Pass
              </p>
              <Badge variant={nftType === 'pro' ? 'pro' : 'basic'} className="text-lg px-4 py-2">
                {nftType.toUpperCase()} Pass - 1 Year Validity
              </Badge>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Already has NFT
  if (nftPass.type !== 'none') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">NFT Pass</h1>
            <p className="text-muted-foreground">
              Your merchant pass status
            </p>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className={`h-24 w-24 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                nftPass.type === 'pro' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}>
                {nftPass.type === 'pro' ? (
                  <Star className="h-12 w-12 text-white" />
                ) : (
                  <Shield className="h-12 w-12 text-white" />
                )}
              </div>

              <Badge 
                variant={nftPass.type === 'pro' ? 'pro' : 'basic'} 
                className="text-xl px-6 py-2 mb-4"
              >
                {nftPass.type.toUpperCase()} Pass
              </Badge>

              <div className="mt-6 p-4 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">Validity</p>
                <p className="text-lg font-semibold">
                  {nftPass.isValid ? (
                    <span className="text-green-500">Active - {countdown} remaining</span>
                  ) : (
                    <span className="text-red-500">Expired</span>
                  )}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Create Events</p>
                  <p className="font-medium text-green-500">✓ Enabled</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Mining Rewards</p>
                  <p className="font-medium text-green-500">✓ Active</p>
                </div>
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
        <div className="text-center">
          <h1 className="text-3xl font-bold">Mint NFT Pass</h1>
          <p className="text-muted-foreground">
            Get your merchant pass to create events and earn rewards
          </p>
        </div>

        {/* Pass Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              nftType === 'basic' ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'
            }`}
            onClick={() => {
              setNftType('basic');
              setSelectedTemplate(0);
              setIsApproved(false);
            }}
          >
            <CardContent className="p-6 text-center">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-lg">Basic Pass</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Essential features for getting started
              </p>
              <Badge variant="usdt" className="text-lg">
                💲 {NFT_COSTS.BASIC} USDT
              </Badge>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              nftType === 'pro' ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'
            }`}
            onClick={() => {
              setNftType('pro');
              setSelectedTemplate(0);
              setIsApproved(false);
            }}
          >
            <CardContent className="p-6 text-center">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-lg">Pro Pass</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Full features with business profile
              </p>
              <Badge variant="pro" className="text-lg">
                💲 {NFT_COSTS.PRO} USDT
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Profile Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(nftType === 'basic' ? nftTemplates.basic : nftTemplates.pro).map((t, i) => (
              <div
                key={i}
                onClick={() => setSelectedTemplate(i)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedTemplate === i
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <h4 className="font-medium">{t.name}</h4>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mint Button */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cost</span>
              <div className="text-right">
                <span className="text-xl font-bold">{cost} USDT</span>
                <p className="text-xs text-muted-foreground">
                  Balance: {formatNumber(balances.usdt, 2)} USDT
                </p>
              </div>
            </div>

            {!hasEnoughBalance && (
              <p className="text-sm text-red-500">Insufficient USDT balance</p>
            )}

            {!isApproved ? (
              <Button
                onClick={handleApprove}
                disabled={!hasEnoughBalance || isApproving || !isConnected}
                className="w-full h-12"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  'Approve USDT'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleMint}
                disabled={!hasEnoughBalance || isMinting}
                variant="gradient"
                className="w-full h-12"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Mint {nftType.toUpperCase()} Pass
                  </>
                )}
              </Button>
            )}

            {isApproved && (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <Check className="h-4 w-4" />
                USDT approved
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
