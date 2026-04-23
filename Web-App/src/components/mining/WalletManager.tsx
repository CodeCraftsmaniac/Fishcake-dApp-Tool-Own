'use client';

import { useState, useRef, useCallback } from 'react';
import { useMiningStore, MiningWallet } from '@/lib/stores/miningStore';
import { walletApi } from '@/lib/api/backendClient';
import { Card, CardContent, Button, Input, Badge } from '@/components/ui';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Wallet, 
  Pause, 
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Loader2,
  Download,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { ethers } from 'ethers';
import { cn } from '@/lib/utils';

interface ImportStatus {
  address: string;
  step: 'validating' | 'importing' | 'fetching_balances' | 'completed' | 'failed';
  message: string;
  error?: string;
}

export function WalletManager() {
  const { wallets, addWallet, removeWallet, updateWallet, addLog } = useMiningStore();
  const [showImport, setShowImport] = useState(false);
  const [privateKeysInput, setPrivateKeysInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch balances via backend API
  const fetchBalances = async (address: string) => {
    const result = await walletApi.balances(address);
    if (result.success && result.data) {
      return result.data;
    }
    return { pol: '0', fcc: '0', usdt: '0' };
  };

  // Update import status
  const updateImportStatus = (address: string, status: Partial<ImportStatus>) => {
    setImportStatuses(prev => 
      prev.map(s => s.address === address ? { ...s, ...status } : s)
    );
  };

  // Handle import
  const handleImport = async () => {
    if (!privateKeysInput.trim() || !password) {
      addLog({
        level: 'error',
        action: 'WALLET_IMPORT',
        message: 'Please provide private keys and password',
      });
      return;
    }

    setIsImporting(true);
    
    // Parse private keys (one per line or comma-separated)
    const keys = privateKeysInput
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Initialize import statuses
    const initialStatuses: ImportStatus[] = [];

    for (const key of keys) {
      try {
        const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
        const tempWallet = new ethers.Wallet(cleanKey);
        initialStatuses.push({
          address: tempWallet.address,
          step: 'validating',
          message: 'Validating private key...',
        });
      } catch {
        initialStatuses.push({
          address: key.slice(0, 10) + '...',
          step: 'failed',
          message: 'Invalid private key format',
          error: 'Invalid key',
        });
      }
    }
    setImportStatuses(initialStatuses);

    // Process each key
    for (const key of keys) {
      try {
        const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
        const wallet = new ethers.Wallet(cleanKey);
        
        // Check if already exists in local store
        if (wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
          updateImportStatus(wallet.address, {
            step: 'failed',
            message: 'Wallet already exists',
            error: 'Duplicate wallet',
          });
          continue;
        }

        // First, import to backend (this is the source of truth for automation)
        updateImportStatus(wallet.address, {
          step: 'fetching_balances',
          message: 'Importing to backend...',
        });

        try {
          const backendResult = await walletApi.import([cleanKey], password);
          if (!backendResult.success) {
            throw new Error(backendResult.error || 'Backend import failed');
          }
          const walletResult = backendResult.data?.results?.[0];
          if (walletResult && !walletResult.success) {
            throw new Error(walletResult.error || 'Import failed');
          }
        } catch (backendError) {
          console.error('Backend import error:', backendError);
          // Continue with local import even if backend fails
          addLog({
            level: 'warn',
            action: 'WALLET_IMPORT',
            message: `Backend sync failed for ${wallet.address.slice(0, 8)}...: ${(backendError as Error).message}`,
          });
        }

        // Fetch balances
        updateImportStatus(wallet.address, {
          step: 'fetching_balances',
          message: 'Fetching balances...',
        });

        const balances = await fetchBalances(wallet.address);

        // Add wallet to local store (without encrypted key - backend is source of truth)
        addWallet({
          address: wallet.address,
          status: 'active',
          nftType: 'NONE',
          nftExpiry: null,
          nftTokenId: null,
          firstMiningDate: null,
          failureCount: 0,
          lastEventId: null,
          nextEventAt: null,
          balances,
          stats: {
            totalMined: '0',
            miningDays: 0,
            totalEvents: 0,
            ongoingEvents: 0,
            finishedEvents: 0,
          },
        });

        updateImportStatus(wallet.address, {
          step: 'completed',
          message: 'Import complete!',
        });

        addLog({
          level: 'success',
          action: 'WALLET_IMPORT',
          message: `Wallet ${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)} imported successfully`,
        });

        // Store passphrase in session for automation
        sessionStorage.setItem('mining_passphrase', password);

        // Small delay between imports
        await new Promise(r => setTimeout(r, 500));

      } catch (error) {
        addLog({
          level: 'error',
          action: 'WALLET_IMPORT',
          message: `Failed to import: ${(error as Error).message}`,
        });
      }
    }

    setIsImporting(false);
    
    // Clear form after 2 seconds if all completed
    setTimeout(() => {
      const allComplete = importStatuses.every(s => s.step === 'completed' || s.step === 'failed');
      if (allComplete) {
        setPrivateKeysInput('');
        setPassword('');
        setImportStatuses([]);
        setShowImport(false);
      }
    }, 2000);
  };

  // Handle CSV import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/[\r\n]+/).filter(l => l.trim());
    
    // Extract private keys from CSV (assuming column header might be "privateKey" or first column)
    const keys: string[] = [];
    for (const line of lines) {
      const cells = line.split(',').map(c => c.trim().replace(/"/g, ''));
      for (const cell of cells) {
        if (/^(0x)?[a-fA-F0-9]{64}$/.test(cell)) {
          keys.push(cell);
        }
      }
    }

    if (keys.length > 0) {
      setPrivateKeysInput(keys.join('\n'));
      addLog({
        level: 'info',
        action: 'CSV_IMPORT',
        message: `Found ${keys.length} private keys in CSV`,
      });
    } else {
      addLog({
        level: 'error',
        action: 'CSV_IMPORT',
        message: 'No valid private keys found in CSV file',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Refresh all balances
  const handleRefreshAllBalances = async () => {
    for (const wallet of wallets) {
      try {
        const balances = await fetchBalances(wallet.address);
        
        updateWallet(wallet.id, {
          balances,
        });
      } catch (error) {
        console.error(`Failed to refresh ${wallet.address}:`, error);
      }
    }

    addLog({
      level: 'success',
      action: 'BALANCE_REFRESH',
      message: `Refreshed balances for ${wallets.length} wallets`,
    });
  };

  // Handle toggle status
  const handleToggleStatus = (wallet: MiningWallet) => {
    const newStatus = wallet.status === 'active' ? 'paused' : 'active';
    updateWallet(wallet.id, { status: newStatus });
    addLog({
      level: 'info',
      action: 'WALLET_STATUS',
      message: `Wallet ${wallet.address.slice(0, 8)}... ${newStatus}`,
      walletId: wallet.id,
    });
  };

  // Copy address
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Format expiry
  const formatExpiry = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate countdown
  const getCountdown = (timestamp: number | null) => {
    if (!timestamp) return null;
    const now = Date.now();
    const diff = timestamp - now;
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const statusConfig = {
    active: { color: 'bg-green-500', textColor: 'text-green-600', label: 'Active', icon: CheckCircle2 },
    paused: { color: 'bg-yellow-500', textColor: 'text-yellow-600', label: 'Paused', icon: Pause },
    error: { color: 'bg-red-500', textColor: 'text-red-600', label: 'Error', icon: AlertCircle },
    nft_expired: { color: 'bg-orange-500', textColor: 'text-orange-600', label: 'NFT Expired', icon: Clock },
  };

  return (
    <div className="space-y-4">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">Mining Wallets</h3>
          <p className="text-xs text-gray-600 font-semibold">
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex gap-2">
          {wallets.length > 0 && (
            <Button 
              size="sm"
              onClick={handleRefreshAllBalances}
              className="h-8 text-xs bg-gray-900 text-white hover:bg-gray-800 border-2 border-gray-700 font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Refresh All</span>
            </Button>
          )}
          <Button 
            onClick={() => setShowImport(!showImport)}
            size="sm"
            className="h-8 text-xs bg-gradient-to-r from-fishcake-500 to-purple-500 hover:from-fishcake-600 hover:to-purple-600"
          >
            <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Import Wallets</span>
            <span className="sm:hidden">Import</span>
          </Button>
        </div>
      </div>

      {/* Import Form */}
      {showImport && (
        <Card className="border-fishcake-500/30 bg-white shadow-lg">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                <Upload className="w-4 h-4 text-fishcake-500" />
                Import Private Keys
              </h4>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCSVImport}
                  className="hidden"
                />
                <Button 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs bg-gray-900 text-white hover:bg-gray-800 border-2 border-gray-700 font-bold"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  Import CSV
                </Button>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-wider">
                Private Keys (one per line)
              </label>
              <textarea
                value={privateKeysInput}
                onChange={(e) => setPrivateKeysInput(e.target.value)}
                className="w-full h-28 px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 font-mono text-xs text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-fishcake-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="0x... (enter private keys, one per line)"
                disabled={isImporting}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-wider">
                Encryption Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to encrypt keys"
                  className="pr-10 text-sm h-9 bg-gray-50 border-gray-300 text-gray-900"
                  disabled={isImporting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                Keys are encrypted with AES-256-GCM before storage
              </p>
            </div>

            {/* Import Status */}
            {importStatuses.length > 0 && (
              <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Import Progress</p>
                {importStatuses.map((status, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    {status.step === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : status.step === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                    )}
                    <span className="font-mono truncate flex-1 text-gray-700">
                      {status.address.slice(0, 10)}...{status.address.slice(-6)}
                    </span>
                    <span className={cn(
                      'font-medium',
                      status.step === 'completed' ? 'text-green-600' :
                      status.step === 'failed' ? 'text-red-600' :
                      'text-blue-600'
                    )}>
                      {status.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !privateKeysInput.trim() || !password}
                className="flex-1 h-9 text-sm"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Wallets
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  setShowImport(false);
                  setImportStatuses([]);
                }}
                className="h-9 text-sm bg-gray-900 text-white hover:bg-gray-800 border-2 border-gray-700 font-bold"
                disabled={isImporting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallets Table */}
      {wallets.length === 0 && !showImport ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-10 text-center">
            <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h4 className="font-bold text-gray-900 mb-2">No Wallets Added</h4>
            <p className="text-sm text-gray-600 mb-4">
              Import wallets to start automated mining
            </p>
            <Button 
              onClick={() => setShowImport(true)}
              className="gap-2 bg-gray-900 text-white hover:bg-gray-800 border-2 border-gray-700 h-10 px-6 font-bold"
            >
              <Plus className="w-4 h-4" />
              Import Your First Wallet
            </Button>
          </CardContent>
        </Card>
      ) : wallets.length > 0 ? (
        <Card className="bg-white border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Wallet</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">POL</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">USDT</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">FCC</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Pass</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Expiry</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Countdown</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wallets.map((wallet, index) => {
                  const status = statusConfig[wallet.status];
                  const countdown = getCountdown(wallet.nftExpiry);
                  const isExpired = wallet.nftExpiry && wallet.nftExpiry < Date.now();

                  return (
                    <tr 
                      key={wallet.id} 
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', status.color)} />
                          <span className="font-mono text-xs text-gray-900">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </span>
                          <button
                            onClick={() => copyAddress(wallet.address)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedAddress === wallet.address ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                        {parseFloat(wallet.balances.pol).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                        {parseFloat(wallet.balances.usdt).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-fishcake-600 font-bold">
                        {parseFloat(wallet.balances.fcc).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={
                          wallet.nftType === 'PRO' ? 'pro' :
                          wallet.nftType === 'BASIC' ? 'basic' : 'secondary'
                        } className="text-[10px]">
                          {wallet.nftType === 'NONE' ? 'None' : wallet.nftType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">
                        {formatExpiry(wallet.nftExpiry)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {countdown && (
                          <span className={cn(
                            'text-xs font-bold',
                            isExpired ? 'text-red-600' : 'text-green-600'
                          )}>
                            {countdown}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('text-xs font-bold capitalize', status.textColor)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(wallet)}
                            className="h-7 w-7 p-0"
                          >
                            {wallet.status === 'active' ? (
                              <Pause className="w-3.5 h-3.5 text-yellow-600" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWallet(wallet.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
