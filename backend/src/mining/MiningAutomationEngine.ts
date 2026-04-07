// Mining Automation Scheduler - Backend Engine
import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// Encryption constants
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha256';
const KEY_LENGTH = 32;

// Types
export interface MiningWallet {
  id: string;
  address: string;
  encryptedKey: string;
  salt: string;
  iv: string;
  authTag: string;
  status: 'active' | 'paused' | 'error' | 'nft_expired';
  nftType: 'NONE' | 'BASIC' | 'PRO';
  nftExpiry: number | null;
  failureCount: number;
  lastEventId: string | null;
  nextEventAt: number | null;
}

export interface MiningEvent {
  id: string;
  walletId: string;
  chainEventId: number | null;
  status: EventStatus;
  dropsChecklist: '0/2' | '1/2' | '2/2';
  drop1Completed: boolean;
  drop1TxHash: string | null;
  drop2Completed: boolean;
  drop2TxHash: string | null;
  totalDropped: string | null;
  rewardEligible: boolean;
  rewardReceived: string | null;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

export type EventStatus = 
  | 'pending' 
  | 'created' 
  | 'dropping' 
  | 'drops_complete' 
  | 'monitoring' 
  | 'mining_complete' 
  | 'finishing' 
  | 'finished' 
  | 'failed' 
  | 'timeout';

export interface MiningConfig {
  recipientAddress1: string;
  recipientAddress2: string;
  fccPerRecipient: string;
  totalFccPerEvent: string;
  expectedMiningReward: string;
  offsetMinutes: number;
  maxRetries: number;
  schedulerEnabled: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  error?: string;
  data?: Record<string, unknown>;
}

// Contract addresses
const CONTRACTS = {
  EVENT_MANAGER: '0x2CAf752814f244b3778e30c27051cc6B45CB1fc9',
  FCC_TOKEN: '0x84eBc138F4Ab844A3050a6059763D269dC9951c6',
  NFT_MANAGER: '0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B',
};

// ABIs (minimal for mining)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const EVENT_MANAGER_ABI = [
  'function activityAdd(string _businessName, string _activityContent, string _latitudeLongitude, address _tokenContractAddr, uint256 _totalDropAmts, uint256 _dropType, uint256 _dropNumber, uint256 _minDropAmt, uint256 _maxDropAmt, uint256 _activityDeadline)',
  'function drop(uint256 _activityId, address _to, uint256 _dropAmt)',
  'function activityFinish(uint256 _activityId)',
  'function activityIdAcc() view returns (uint256)',
];

const NFT_MANAGER_ABI = [
  'function getMerchantNFT(address) view returns (uint256, uint8, uint256, uint256, bool)',
  'function mintMerchantNFT(uint8 _nftType, string _name, string _description, string _businessAddress, string _website, string _socialMedia)',
];

/**
 * Mining Automation Engine
 * Handles the complete automation lifecycle for FCC mining
 */
export class MiningAutomationEngine extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private provider: ethers.JsonRpcProvider;
  private config: MiningConfig;
  private wallets: Map<string, MiningWallet> = new Map();
  private events: Map<string, MiningEvent> = new Map();
  private currentWorkflow: WorkflowStep[] = [];
  private passphrase: string = '';

  constructor(rpcUrl: string = 'https://polygon-rpc.com') {
    super();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.config = {
      recipientAddress1: '',
      recipientAddress2: '',
      fccPerRecipient: '12',
      totalFccPerEvent: '24',
      expectedMiningReward: '6',
      offsetMinutes: 5,
      maxRetries: 3,
      schedulerEnabled: false,
    };
  }

  /**
   * Start the automation scheduler
   */
  start(): void {
    if (this.isRunning) {
      this.emit('log', { level: 'warn', message: 'Scheduler already running' });
      return;
    }

    this.isRunning = true;
    this.config.schedulerEnabled = true;
    this.emit('started');
    this.emit('log', { level: 'success', action: 'SCHEDULER_START', message: 'Mining automation started' });

    // Run every minute
    this.intervalId = setInterval(() => this.tick(), 60000);
    
    // Initial tick
    this.tick();
  }

  /**
   * Stop the automation scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.config.schedulerEnabled = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.emit('stopped');
    this.emit('log', { level: 'info', action: 'SCHEDULER_STOP', message: 'Mining automation stopped' });
  }

  /**
   * Main scheduler tick - runs every minute
   */
  private async tick(): Promise<void> {
    if (!this.isRunning) return;

    const readyWallets = this.getReadyWallets();
    
    for (const wallet of readyWallets) {
      try {
        await this.processWallet(wallet);
      } catch (error) {
        this.handleWalletError(wallet, error as Error);
      }
    }
  }

  /**
   * Get wallets ready for new mining event
   */
  private getReadyWallets(): MiningWallet[] {
    const now = Date.now();
    const ready: MiningWallet[] = [];

    for (const wallet of this.wallets.values()) {
      if (wallet.status !== 'active') continue;
      if (wallet.nftType === 'NONE') continue;
      if (wallet.nftExpiry && wallet.nftExpiry < now) continue;

      // Check if ready for next event
      if (!wallet.lastEventId) {
        ready.push(wallet);
        continue;
      }

      const lastEvent = this.events.get(wallet.lastEventId);
      if (!lastEvent) {
        ready.push(wallet);
        continue;
      }

      // Must be finished and past offset time
      if (lastEvent.status === 'finished' && lastEvent.finishedAt) {
        const nextTime = lastEvent.finishedAt + (this.config.offsetMinutes * 60 * 1000);
        const minInterval = lastEvent.startedAt + (23 * 60 * 60 * 1000); // 23 hours min
        
        if (now >= nextTime && now >= minInterval) {
          ready.push(wallet);
        }
      }
    }

    return ready.slice(0, 3); // Max 3 concurrent
  }

  /**
   * Process a single wallet through the mining workflow
   */
  private async processWallet(wallet: MiningWallet): Promise<void> {
    this.emit('log', { 
      level: 'info', 
      action: 'WALLET_PROCESS', 
      message: `Processing wallet ${wallet.address.slice(0, 8)}...`,
      walletId: wallet.id 
    });

    // Initialize workflow steps
    this.currentWorkflow = [
      { id: 'mint_nft', name: 'Mint NFT Pass', status: 'pending' },
      { id: 'create_event', name: 'Create Event', status: 'pending' },
      { id: 'drop_1', name: 'Drop #1 (12 FCC)', status: 'pending' },
      { id: 'drop_2', name: 'Drop #2 (12 FCC)', status: 'pending' },
      { id: 'validate', name: 'Validate (2/2)', status: 'pending' },
      { id: 'check_reward', name: 'Check Reward', status: 'pending' },
      { id: 'finish_event', name: 'Finish Event', status: 'pending' },
    ];

    const signer = this.decryptWallet(wallet);

    // Step 1: Check/Mint NFT
    if (wallet.nftType === 'NONE') {
      await this.executeStep('mint_nft', () => this.mintNFT(signer, wallet));
    } else {
      this.updateStep('mint_nft', 'skipped');
    }

    // Step 2: Create Event
    const eventId = await this.executeStep('create_event', () => 
      this.createEvent(signer, wallet)
    );

    // Step 3: Drop #1
    await this.executeStep('drop_1', () => 
      this.executeDrop(signer, eventId, this.config.recipientAddress1, 1)
    );

    // Step 4: Drop #2
    await this.executeStep('drop_2', () => 
      this.executeDrop(signer, eventId, this.config.recipientAddress2, 2)
    );

    // Step 5: Validate
    await this.executeStep('validate', async () => {
      const event = this.events.get(eventId);
      if (!event?.drop1Completed || !event?.drop2Completed) {
        throw new Error('Drops not complete');
      }
      return { checklist: '2/2', total: '24' };
    });

    // Step 6: Check Mining Reward
    const reward = await this.executeStep('check_reward', () => 
      this.monitorMiningReward(wallet.address, eventId)
    );

    // Step 7: Finish Event
    await this.executeStep('finish_event', () => 
      this.finishEvent(signer, eventId)
    );

    // Update wallet for next cycle
    const event = this.events.get(eventId);
    wallet.lastEventId = eventId;
    wallet.nextEventAt = (event?.finishedAt || Date.now()) + (this.config.offsetMinutes * 60 * 1000);
    this.wallets.set(wallet.id, wallet);

    this.emit('log', {
      level: 'success',
      action: 'WALLET_COMPLETE',
      message: `Mining cycle completed for ${wallet.address.slice(0, 8)}...`,
      walletId: wallet.id,
    });
  }

  /**
   * Execute a workflow step with logging
   */
  private async executeStep<T>(
    stepId: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    this.updateStep(stepId, 'running');
    this.emit('step', { id: stepId, status: 'running' });

    try {
      const result = await fn();
      this.updateStep(stepId, 'completed', { result });
      this.emit('step', { id: stepId, status: 'completed', data: result });
      return result;
    } catch (error) {
      this.updateStep(stepId, 'failed', { error: (error as Error).message });
      this.emit('step', { id: stepId, status: 'failed', error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Update workflow step status
   */
  private updateStep(
    stepId: string, 
    status: WorkflowStep['status'], 
    data?: Record<string, unknown>
  ): void {
    const step = this.currentWorkflow.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (status === 'running') step.startedAt = Date.now();
      if (['completed', 'failed'].includes(status)) step.completedAt = Date.now();
      if (data) step.data = data;
    }
    this.emit('workflow', this.currentWorkflow);
  }

  /**
   * Derive encryption key from passphrase using PBKDF2
   */
  private deriveKey(passphrase: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      passphrase,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      PBKDF2_DIGEST
    );
  }

  /**
   * Decrypt wallet private key using AES-256-GCM
   */
  private decryptWallet(wallet: MiningWallet): ethers.Wallet {
    if (!this.passphrase) {
      throw new Error('Passphrase not set');
    }

    // Parse hex strings back to buffers
    const salt = Buffer.from(wallet.salt, 'hex');
    const iv = Buffer.from(wallet.iv, 'hex');
    const authTag = Buffer.from(wallet.authTag, 'hex');
    
    // Derive key from passphrase
    const key = this.deriveKey(this.passphrase, salt);
    
    // Create decipher with AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(wallet.encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Ensure 0x prefix for ethers
    const privateKey = decrypted.startsWith('0x') ? decrypted : `0x${decrypted}`;
    
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Set the passphrase for wallet decryption
   */
  setPassphrase(passphrase: string): void {
    this.passphrase = passphrase;
  }

  /**
   * Mint NFT Pass
   */
  private async mintNFT(signer: ethers.Wallet, wallet: MiningWallet): Promise<void> {
    this.emit('log', {
      level: 'info',
      action: 'NFT_MINT',
      message: 'Minting NFT pass...',
      walletId: wallet.id,
    });

    const nftManager = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, signer);
    
    // Mint Basic NFT (type 2)
    const tx = await nftManager.mintMerchantNFT(
      2, // Basic
      'Mining Wallet',
      'Automated mining wallet',
      '',
      '',
      ''
    );

    const receipt = await tx.wait();

    wallet.nftType = 'BASIC';
    wallet.nftExpiry = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
    this.wallets.set(wallet.id, wallet);

    this.emit('log', {
      level: 'success',
      action: 'NFT_MINT',
      message: 'NFT pass minted successfully',
      walletId: wallet.id,
      txHash: receipt.hash,
    });
  }

  /**
   * Create mining event on-chain
   */
  private async createEvent(signer: ethers.Wallet, wallet: MiningWallet): Promise<string> {
    const eventManager = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);
    const fcc = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, signer);

    // Approve FCC
    const approvalTx = await fcc.approve(
      CONTRACTS.EVENT_MANAGER,
      ethers.parseUnits(this.config.totalFccPerEvent, 6)
    );
    await approvalTx.wait();

    // Create event
    const tx = await eventManager.activityAdd(
      'Mining Event',
      JSON.stringify({ type: 'mining', automated: true }),
      '0,0',
      CONTRACTS.FCC_TOKEN,
      ethers.parseUnits(this.config.totalFccPerEvent, 6),
      1, // Fixed drop
      2, // 2 recipients
      ethers.parseUnits(this.config.fccPerRecipient, 6),
      ethers.parseUnits(this.config.fccPerRecipient, 6),
      Math.floor(Date.now() / 1000) + 86400 // 24h deadline
    );

    const receipt = await tx.wait();

    // Get event ID from activityIdAcc
    const chainEventId = Number(await eventManager.activityIdAcc());

    // Create local event record
    const eventId = `event_${Date.now()}`;
    const event: MiningEvent = {
      id: eventId,
      walletId: wallet.id,
      chainEventId,
      status: 'created',
      dropsChecklist: '0/2',
      drop1Completed: false,
      drop1TxHash: null,
      drop2Completed: false,
      drop2TxHash: null,
      totalDropped: null,
      rewardEligible: false,
      rewardReceived: null,
      startedAt: Date.now(),
      finishedAt: null,
      error: null,
    };

    this.events.set(eventId, event);

    this.emit('log', {
      level: 'success',
      action: 'EVENT_CREATE',
      message: `Event #${chainEventId} created`,
      walletId: wallet.id,
      eventId,
      txHash: receipt.hash,
    });

    return eventId;
  }

  /**
   * Execute a drop to recipient
   */
  private async executeDrop(
    signer: ethers.Wallet,
    eventId: string,
    recipient: string,
    dropNumber: 1 | 2
  ): Promise<void> {
    const event = this.events.get(eventId);
    if (!event?.chainEventId) throw new Error('Event not found');

    const eventManager = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);

    const tx = await eventManager.drop(
      event.chainEventId,
      recipient,
      ethers.parseUnits(this.config.fccPerRecipient, 6)
    );

    const receipt = await tx.wait();

    // Update event
    if (dropNumber === 1) {
      event.drop1Completed = true;
      event.drop1TxHash = receipt.hash;
      event.dropsChecklist = '1/2';
    } else {
      event.drop2Completed = true;
      event.drop2TxHash = receipt.hash;
      event.dropsChecklist = '2/2';
      event.status = 'drops_complete';
      event.totalDropped = this.config.totalFccPerEvent;
    }

    this.events.set(eventId, event);

    this.emit('log', {
      level: 'success',
      action: `DROP_${dropNumber}`,
      message: `Drop ${dropNumber}/2 completed: ${this.config.fccPerRecipient} FCC to ${recipient.slice(0, 8)}...`,
      eventId,
      txHash: receipt.hash,
    });

    // Small delay between drops
    await this.delay(2000);
  }

  /**
   * Monitor for mining reward
   */
  private async monitorMiningReward(
    walletAddress: string,
    eventId: string
  ): Promise<{ received: boolean; amount: string }> {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Event not found');

    event.status = 'monitoring';
    this.events.set(eventId, event);

    const fcc = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, this.provider);
    const startBalance = await fcc.balanceOf(walletAddress);
    const targetReward = ethers.parseUnits(this.config.expectedMiningReward, 6);

    this.emit('log', {
      level: 'info',
      action: 'REWARD_MONITOR',
      message: 'Monitoring for mining reward...',
      eventId,
    });

    // Poll every 30 seconds for up to 1 hour
    for (let i = 0; i < 120; i++) {
      await this.delay(30000);

      const currentBalance = await fcc.balanceOf(walletAddress);
      const received = currentBalance - startBalance;

      if (received >= targetReward) {
        const amount = ethers.formatUnits(received, 6);
        
        event.rewardEligible = true;
        event.rewardReceived = amount;
        event.status = 'mining_complete';
        this.events.set(eventId, event);

        this.emit('log', {
          level: 'success',
          action: 'REWARD_RECEIVED',
          message: `Mining reward received: ${amount} FCC`,
          eventId,
        });

        return { received: true, amount };
      }
    }

    // Timeout
    event.status = 'timeout';
    this.events.set(eventId, event);

    this.emit('log', {
      level: 'warn',
      action: 'REWARD_TIMEOUT',
      message: 'Timeout waiting for mining reward',
      eventId,
    });

    return { received: false, amount: '0' };
  }

  /**
   * Finish event on-chain
   */
  private async finishEvent(signer: ethers.Wallet, eventId: string): Promise<void> {
    const event = this.events.get(eventId);
    if (!event?.chainEventId) throw new Error('Event not found');

    event.status = 'finishing';
    this.events.set(eventId, event);

    const eventManager = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);

    const tx = await eventManager.activityFinish(event.chainEventId);
    const receipt = await tx.wait();

    event.status = 'finished';
    event.finishedAt = Date.now();
    this.events.set(eventId, event);

    this.emit('log', {
      level: 'success',
      action: 'EVENT_FINISH',
      message: `Event #${event.chainEventId} finished`,
      eventId,
      txHash: receipt.hash,
    });
  }

  /**
   * Handle wallet processing error
   */
  private handleWalletError(wallet: MiningWallet, error: Error): void {
    wallet.failureCount += 1;
    wallet.status = wallet.failureCount >= this.config.maxRetries ? 'error' : 'active';
    this.wallets.set(wallet.id, wallet);

    this.emit('log', {
      level: 'error',
      action: 'WALLET_ERROR',
      message: `Error processing wallet: ${error.message}`,
      walletId: wallet.id,
    });

    if (wallet.status === 'error') {
      this.emit('log', {
        level: 'warn',
        action: 'WALLET_PAUSED',
        message: `Wallet paused after ${this.config.maxRetries} failures`,
        walletId: wallet.id,
      });
    }
  }

  /**
   * Add a wallet to the automation
   */
  addWallet(wallet: MiningWallet): void {
    this.wallets.set(wallet.id, wallet);
    this.emit('wallet_added', wallet);
  }

  /**
   * Remove a wallet from automation
   */
  removeWallet(walletId: string): void {
    this.wallets.delete(walletId);
    this.emit('wallet_removed', walletId);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MiningConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config_updated', this.config);
  }

  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    walletsCount: number;
    eventsCount: number;
    config: MiningConfig;
  } {
    return {
      isRunning: this.isRunning,
      walletsCount: this.wallets.size,
      eventsCount: this.events.size,
      config: this.config,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const miningEngine = new MiningAutomationEngine();
