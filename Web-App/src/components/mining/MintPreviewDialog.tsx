'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Button, 
  Badge, 
  Card, 
  CardContent,
} from '@/components/ui';
import { useMiningStore } from '@/lib/stores/miningStore';
import { 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface MintPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nftType: 'BASIC' | 'PRO';
}

interface PreviewResult {
  address: string;
  canMint: boolean;
  reason?: string;
  usdtBalance: string;
  usdtRequired: string;
  estimatedFccReward: string;
}

export function MintPreviewDialog({ isOpen, onClose, nftType }: MintPreviewDialogProps) {
  const { wallets } = useMiningStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [previews, setPreviews] = useState<PreviewResult[]>([]);
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });
  const [mintResults, setMintResults] = useState<Array<{ address: string; success: boolean; txHash?: string }>>([]);

  const nftCost = nftType === 'PRO' ? '100' : '10';
  const fccReward = nftType === 'PRO' ? '200' : '20';

  // Mock preview - in production would call backend
  const loadPreview = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const results: PreviewResult[] = wallets
      .filter(w => w.nftType === 'NONE')
      .map(w => ({
        address: w.address,
        canMint: parseFloat(w.balances.usdt) >= parseFloat(nftCost),
        reason: parseFloat(w.balances.usdt) < parseFloat(nftCost) 
          ? `Insufficient USDT (need ${nftCost})` 
          : undefined,
        usdtBalance: w.balances.usdt,
        usdtRequired: nftCost,
        estimatedFccReward: fccReward,
      }));

    setPreviews(results);
    setIsLoading(false);
  };

  const executeMint = async () => {
    const eligibleWallets = previews.filter(p => p.canMint);
    if (eligibleWallets.length === 0) return;

    setIsMinting(true);
    setMintProgress({ current: 0, total: eligibleWallets.length });
    setMintResults([]);

    // Simulate minting each wallet
    for (let i = 0; i < eligibleWallets.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        address: eligibleWallets[i].address,
        success: Math.random() > 0.1, // 90% success rate simulation
        txHash: `0x${Math.random().toString(16).slice(2)}...`,
      };
      
      setMintResults(prev => [...prev, result]);
      setMintProgress({ current: i + 1, total: eligibleWallets.length });
    }

    setIsMinting(false);
  };

  const eligibleCount = previews.filter(p => p.canMint).length;
  const totalCost = (eligibleCount * parseFloat(nftCost)).toFixed(2);
  const totalReward = eligibleCount * parseFloat(fccReward);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fishcake-500" />
            Mint {nftType} NFT Pass
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cost Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-fishcake-500">{nftCost}</p>
                  <p className="text-sm text-muted-foreground">USDT per NFT</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">+{fccReward}</p>
                  <p className="text-sm text-muted-foreground">FCC Reward</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">365</p>
                  <p className="text-sm text-muted-foreground">Days Valid</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load Preview Button */}
          {previews.length === 0 && !isLoading && (
            <Button 
              onClick={loadPreview} 
              className="w-full"
              disabled={wallets.filter(w => w.nftType === 'NONE').length === 0}
            >
              {wallets.filter(w => w.nftType === 'NONE').length === 0 
                ? 'No wallets need NFT'
                : `Check ${wallets.filter(w => w.nftType === 'NONE').length} Wallets`
              }
            </Button>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-fishcake-500" />
              <p className="mt-2 text-muted-foreground">Checking wallet eligibility...</p>
            </div>
          )}

          {/* Preview Results */}
          {previews.length > 0 && !isMinting && mintResults.length === 0 && (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previews.map((preview) => (
                  <div 
                    key={preview.address}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      {preview.canMint ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-mono text-sm">
                          {preview.address.slice(0, 8)}...{preview.address.slice(-6)}
                        </p>
                        {preview.reason && (
                          <p className="text-xs text-red-400">{preview.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{preview.usdtBalance} USDT</p>
                      {preview.canMint && (
                        <p className="text-xs text-green-500">+{preview.estimatedFccReward} FCC</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Eligible Wallets</p>
                      <p className="text-lg font-bold">{eligibleCount} / {previews.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-lg font-bold">{totalCost} USDT</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Expected Reward</p>
                      <p className="text-lg font-bold text-green-500">+{totalReward} FCC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warning */}
              {eligibleCount > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Before minting</p>
                    <p className="text-muted-foreground">
                      Ensure all wallets have sufficient POL for gas fees (~0.1 POL per mint)
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={executeMint} 
                  disabled={eligibleCount === 0}
                  className="flex-1"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Mint {eligibleCount} NFTs
                </Button>
              </div>
            </>
          )}

          {/* Minting Progress */}
          {isMinting && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-fishcake-500" />
                <p className="mt-2 font-medium">
                  Minting {mintProgress.current} / {mintProgress.total}
                </p>
                <p className="text-sm text-muted-foreground">
                  Please wait, do not close this window
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-fishcake-500 transition-all duration-500"
                  style={{ width: `${(mintProgress.current / mintProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Mint Results */}
          {mintResults.length > 0 && !isMinting && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="mt-2 font-medium">Minting Complete</p>
                <p className="text-sm text-muted-foreground">
                  {mintResults.filter(r => r.success).length} successful, {mintResults.filter(r => !r.success).length} failed
                </p>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {mintResults.map((result, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-mono text-sm">
                        {result.address.slice(0, 8)}...
                      </span>
                    </div>
                    {result.txHash && (
                      <Badge variant="outline" className="text-xs">
                        {result.txHash}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
