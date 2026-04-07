// Mining Automation Store - Zustand state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkflowNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStepData {
  txHash?: string;
  timestamp?: number;
  gasUsed?: string;
  blockNumber?: number;
  error?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'mint_nft' | 'create_event' | 'drop_1' | 'drop_2' | 'validate' | 'check_reward' | 'finish_event';
  label: string;
  status: WorkflowNodeStatus;
  data?: WorkflowStepData;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// Wallet-specific workflow state
export interface WalletWorkflow {
  walletId: string;
  walletAddress: string;
  nodes: WorkflowNode[];
  currentEventId: string | null;
  lastUpdated: number;
}

export interface MiningWallet {
  id: string;
  address: string;
  // encryptedKey is NOT stored locally - only the backend stores encrypted keys securely
  status: 'active' | 'paused' | 'error' | 'nft_expired';
  nftType: 'NONE' | 'BASIC' | 'PRO';
  nftExpiry: number | null;
  nftTokenId: number | null;
  failureCount: number;
  lastEventId: string | null;
  nextEventAt: number | null;
  firstMiningDate: number | null; // Track first mining date
  balances: {
    fcc: string;
    usdt: string;
    pol: string;
  };
  // Wallet-specific stats
  stats: {
    totalMined: string;
    miningDays: number;
    totalEvents: number;
    ongoingEvents: number;
    finishedEvents: number;
  };
}

export interface MiningEvent {
  id: string;
  walletId: string;
  chainEventId: number | null;
  status: 'pending' | 'created' | 'dropping' | 'drops_complete' | 'monitoring' | 'mining_complete' | 'finishing' | 'finished' | 'failed' | 'timeout';
  dropsChecklist: '0/2' | '1/2' | '2/2';
  drop1Completed: boolean;
  drop1TxHash: string | null;
  drop1Timestamp: number | null;
  drop2Completed: boolean;
  drop2TxHash: string | null;
  drop2Timestamp: number | null;
  createEventTxHash: string | null;
  createEventTimestamp: number | null;
  finishEventTxHash: string | null;
  finishEventTimestamp: number | null;
  mintNftTxHash: string | null;
  mintNftTimestamp: number | null;
  totalDropped: string | null;
  rewardEligible: boolean;
  rewardReceived: string | null;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

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

export interface ExecutionLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  action: string;
  message: string;
  walletId?: string;
  eventId?: string;
  txHash?: string;
}

export interface MiningStats {
  activeWallets: number;
  totalWallets: number;
  eventsToday: number;
  eventsTotal: number;
  fccDistributed: string;
  miningRewardsCollected: string;
  successRate: number;
}

interface MiningStore {
  // State
  isAutomationRunning: boolean;
  wallets: MiningWallet[];
  events: MiningEvent[];
  currentEvent: MiningEvent | null;
  workflowNodes: WorkflowNode[];
  walletWorkflows: Record<string, WalletWorkflow>; // Wallet-specific workflows
  selectedWorkflowWalletId: string | null; // Currently viewed wallet workflow
  logs: ExecutionLog[];
  config: MiningConfig;
  stats: MiningStats;
  
  // Actions
  startAutomation: () => void;
  stopAutomation: () => void;
  
  // Wallet actions
  addWallet: (wallet: Omit<MiningWallet, 'id'>) => void;
  removeWallet: (id: string) => void;
  updateWallet: (id: string, updates: Partial<MiningWallet>) => void;
  importWallets: (privateKeys: string[], password: string) => Promise<void>;
  
  // Event actions
  createEvent: (walletId: string) => void;
  updateEvent: (id: string, updates: Partial<MiningEvent>) => void;
  
  // Workflow actions
  updateNodeStatus: (nodeId: string, status: WorkflowNodeStatus, data?: WorkflowStepData) => void;
  resetWorkflow: () => void;
  selectWorkflowWallet: (walletId: string | null) => void;
  initWalletWorkflow: (walletId: string) => void;
  updateWalletWorkflowNode: (walletId: string, nodeId: string, status: WorkflowNodeStatus, data?: WorkflowStepData) => void;
  getWalletWorkflow: (walletId: string) => WalletWorkflow | null;
  
  // Config actions
  updateConfig: (updates: Partial<MiningConfig>) => void;
  
  // Log actions
  addLog: (log: Omit<ExecutionLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  
  // Stats
  updateStats: (updates: Partial<MiningStats>) => void;
  updateWalletStats: (walletId: string) => void;
}

const initialWorkflowNodes: WorkflowNode[] = [
  { id: 'mint_nft', type: 'mint_nft', label: 'Mint NFT Pass', status: 'pending' },
  { id: 'create_event', type: 'create_event', label: 'Create Event', status: 'pending' },
  { id: 'drop_1', type: 'drop_1', label: 'Drop #1 (12 FCC)', status: 'pending' },
  { id: 'drop_2', type: 'drop_2', label: 'Drop #2 (12 FCC)', status: 'pending' },
  { id: 'validate', type: 'validate', label: 'Validate (2/2)', status: 'pending' },
  { id: 'check_reward', type: 'check_reward', label: 'Check Reward (6 FCC)', status: 'pending' },
  { id: 'finish_event', type: 'finish_event', label: 'Finish Event', status: 'pending' },
];

// Create fresh workflow nodes for a wallet
const createWalletWorkflowNodes = (): WorkflowNode[] => [
  { id: 'mint_nft', type: 'mint_nft', label: 'Mint NFT Pass', status: 'pending' },
  { id: 'create_event', type: 'create_event', label: 'Create Event', status: 'pending' },
  { id: 'drop_1', type: 'drop_1', label: 'Drop #1 (12 FCC)', status: 'pending' },
  { id: 'drop_2', type: 'drop_2', label: 'Drop #2 (12 FCC)', status: 'pending' },
  { id: 'validate', type: 'validate', label: 'Validate (2/2)', status: 'pending' },
  { id: 'check_reward', type: 'check_reward', label: 'Check Reward (6 FCC)', status: 'pending' },
  { id: 'finish_event', type: 'finish_event', label: 'Finish Event', status: 'pending' },
];

const initialConfig: MiningConfig = {
  recipientAddress1: '',
  recipientAddress2: '',
  fccPerRecipient: '12',
  totalFccPerEvent: '24',
  expectedMiningReward: '6',
  offsetMinutes: 5,
  maxRetries: 3,
  schedulerEnabled: false,
};

const initialStats: MiningStats = {
  activeWallets: 0,
  totalWallets: 0,
  eventsToday: 0,
  eventsTotal: 0,
  fccDistributed: '0',
  miningRewardsCollected: '0',
  successRate: 0,
};

export const useMiningStore = create<MiningStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAutomationRunning: false,
      wallets: [],
      events: [],
      currentEvent: null,
      workflowNodes: initialWorkflowNodes,
      walletWorkflows: {},
      selectedWorkflowWalletId: null,
      logs: [],
      config: initialConfig,
      stats: initialStats,

      // Automation control
      startAutomation: () => {
        set({ isAutomationRunning: true });
        get().addLog({
          level: 'success',
          action: 'AUTOMATION_START',
          message: 'Mining automation started',
        });
      },

      stopAutomation: () => {
        set({ isAutomationRunning: false });
        get().addLog({
          level: 'info',
          action: 'AUTOMATION_STOP',
          message: 'Mining automation stopped',
        });
      },

      // Wallet management
      addWallet: (wallet) => {
        const id = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const walletWithDefaults = {
          ...wallet,
          id,
          stats: wallet.stats || {
            totalMined: '0',
            miningDays: 0,
            totalEvents: 0,
            ongoingEvents: 0,
            finishedEvents: 0,
          },
        };
        
        set((state) => ({
          wallets: [...state.wallets, walletWithDefaults],
          stats: {
            ...state.stats,
            totalWallets: state.stats.totalWallets + 1,
            activeWallets: state.stats.activeWallets + (wallet.status === 'active' ? 1 : 0),
          },
        }));
        
        // Initialize wallet workflow
        get().initWalletWorkflow(id);
        
        get().addLog({
          level: 'success',
          action: 'WALLET_ADD',
          message: `Wallet ${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)} added`,
        });
      },

      removeWallet: (id) => {
        set((state) => {
          const wallet = state.wallets.find((w) => w.id === id);
          const { [id]: removed, ...remainingWorkflows } = state.walletWorkflows;
          return {
            wallets: state.wallets.filter((w) => w.id !== id),
            walletWorkflows: remainingWorkflows,
            selectedWorkflowWalletId: state.selectedWorkflowWalletId === id ? null : state.selectedWorkflowWalletId,
            stats: {
              ...state.stats,
              totalWallets: state.stats.totalWallets - 1,
              activeWallets: state.stats.activeWallets - (wallet?.status === 'active' ? 1 : 0),
            },
          };
        });
      },

      updateWallet: (id, updates) => {
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },

      importWallets: async (privateKeys, password) => {
        // NOTE: Actual wallet import is handled by the backend via walletApi.import()
        // This store action is for local state only - keys are NOT stored in browser
        const { addLog } = get();
        
        for (const key of privateKeys) {
          try {
            // Validate key format
            if (!/^(0x)?[a-fA-F0-9]{64}$/.test(key)) {
              addLog({
                level: 'error',
                action: 'WALLET_IMPORT',
                message: `Invalid private key format`,
              });
              continue;
            }

            // Backend handles encryption and storage securely
            // Frontend only tracks wallet metadata (address, status, balances)
            addLog({
              level: 'info',
              action: 'WALLET_IMPORT',
              message: `Importing wallet...`,
            });
          } catch (error) {
            addLog({
              level: 'error',
              action: 'WALLET_IMPORT',
              message: `Failed to import wallet: ${error}`,
            });
          }
        }
      },

      // Event management
      createEvent: (walletId) => {
        const id = `event_${Date.now()}`;
        const event: MiningEvent = {
          id,
          walletId,
          chainEventId: null,
          status: 'pending',
          dropsChecklist: '0/2',
          drop1Completed: false,
          drop1TxHash: null,
          drop1Timestamp: null,
          drop2Completed: false,
          drop2TxHash: null,
          drop2Timestamp: null,
          createEventTxHash: null,
          createEventTimestamp: null,
          finishEventTxHash: null,
          finishEventTimestamp: null,
          mintNftTxHash: null,
          mintNftTimestamp: null,
          totalDropped: null,
          rewardEligible: false,
          rewardReceived: null,
          startedAt: Date.now(),
          finishedAt: null,
          error: null,
        };
        set((state) => ({
          events: [...state.events, event],
          currentEvent: event,
        }));
        
        // Update wallet workflow
        const wallet = get().wallets.find(w => w.id === walletId);
        if (wallet) {
          set((state) => ({
            walletWorkflows: {
              ...state.walletWorkflows,
              [walletId]: {
                ...state.walletWorkflows[walletId],
                currentEventId: id,
                lastUpdated: Date.now(),
              },
            },
          }));
        }
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          currentEvent: state.currentEvent?.id === id ? { ...state.currentEvent, ...updates } : state.currentEvent,
        }));
        
        // Also update wallet stats if event status changed
        const event = get().events.find(e => e.id === id);
        if (event && updates.status) {
          get().updateWalletStats(event.walletId);
        }
      },

      // Workflow management
      updateNodeStatus: (nodeId, status, data) => {
        set((state) => ({
          workflowNodes: state.workflowNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  status,
                  data: data || node.data,
                  startedAt: status === 'running' ? Date.now() : node.startedAt,
                  completedAt: ['completed', 'failed'].includes(status) ? Date.now() : node.completedAt,
                }
              : node
          ),
        }));
      },

      resetWorkflow: () => {
        set({ workflowNodes: createWalletWorkflowNodes(), currentEvent: null });
      },
      
      // Wallet-specific workflow management
      selectWorkflowWallet: (walletId) => {
        set({ selectedWorkflowWalletId: walletId });
      },
      
      initWalletWorkflow: (walletId) => {
        const wallet = get().wallets.find(w => w.id === walletId);
        if (!wallet) return;
        
        set((state) => ({
          walletWorkflows: {
            ...state.walletWorkflows,
            [walletId]: {
              walletId,
              walletAddress: wallet.address,
              nodes: createWalletWorkflowNodes(),
              currentEventId: null,
              lastUpdated: Date.now(),
            },
          },
        }));
      },
      
      updateWalletWorkflowNode: (walletId, nodeId, status, data) => {
        set((state) => {
          const workflow = state.walletWorkflows[walletId];
          if (!workflow) return state;
          
          return {
            walletWorkflows: {
              ...state.walletWorkflows,
              [walletId]: {
                ...workflow,
                lastUpdated: Date.now(),
                nodes: workflow.nodes.map((node) =>
                  node.id === nodeId
                    ? {
                        ...node,
                        status,
                        data: { ...node.data, ...data },
                        startedAt: status === 'running' ? Date.now() : node.startedAt,
                        completedAt: ['completed', 'failed'].includes(status) ? Date.now() : node.completedAt,
                      }
                    : node
                ),
              },
            },
          };
        });
      },
      
      getWalletWorkflow: (walletId) => {
        return get().walletWorkflows[walletId] || null;
      },

      // Config management
      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
        get().addLog({
          level: 'info',
          action: 'CONFIG_UPDATE',
          message: 'Configuration updated',
        });
      },

      // Logging
      addLog: (log) => {
        const fullLog: ExecutionLog = {
          ...log,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          logs: [fullLog, ...state.logs].slice(0, 1000), // Keep last 1000 logs
        }));
      },

      clearLogs: () => {
        set({ logs: [] });
      },

      // Stats
      updateStats: (updates) => {
        set((state) => ({
          stats: { ...state.stats, ...updates },
        }));
      },
      
      // Update wallet-specific stats
      updateWalletStats: (walletId) => {
        const state = get();
        const walletEvents = state.events.filter(e => e.walletId === walletId);
        
        const finishedEvents = walletEvents.filter(e => e.status === 'finished').length;
        const ongoingEvents = walletEvents.filter(e => !['finished', 'failed', 'timeout'].includes(e.status)).length;
        const totalMined = walletEvents
          .filter(e => e.rewardReceived)
          .reduce((sum, e) => sum + parseFloat(e.rewardReceived || '0'), 0);
        
        // Calculate mining days (unique days with finished events)
        const miningDays = new Set(
          walletEvents
            .filter(e => e.status === 'finished' && e.finishedAt)
            .map(e => new Date(e.finishedAt!).toDateString())
        ).size;
        
        set((prevState) => ({
          wallets: prevState.wallets.map((w) =>
            w.id === walletId
              ? {
                  ...w,
                  stats: {
                    totalMined: totalMined.toString(),
                    miningDays,
                    totalEvents: walletEvents.length,
                    ongoingEvents,
                    finishedEvents,
                  },
                }
              : w
          ),
        }));
      },
    }),
    {
      name: 'fishcake-mining-storage',
      partialize: (state) => ({
        wallets: state.wallets,
        walletWorkflows: state.walletWorkflows,
        events: state.events,
        config: state.config,
        stats: state.stats,
      }),
    }
  )
);
