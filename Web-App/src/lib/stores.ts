import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Wallet state
interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balances: {
    fcc: string;
    usdt: string;
    pol: string;
  };
  nftPass: {
    type: 'none' | 'basic' | 'pro';
    expiresAt: number | null;
    isValid: boolean;
  };
  setConnected: (isConnected: boolean) => void;
  setAddress: (address: string | null) => void;
  setChainId: (chainId: number | null) => void;
  setBalances: (balances: Partial<WalletState['balances']>) => void;
  setNFTPass: (nftPass: WalletState['nftPass']) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  isConnected: false,
  address: null,
  chainId: null,
  balances: {
    fcc: '0',
    usdt: '0',
    pol: '0',
  },
  nftPass: {
    type: 'none',
    expiresAt: null,
    isValid: false,
  },
  setConnected: (isConnected) => set({ isConnected }),
  setAddress: (address) => set({ address }),
  setChainId: (chainId) => set({ chainId }),
  setBalances: (balances) => set((state) => ({
    balances: { ...state.balances, ...balances },
  })),
  setNFTPass: (nftPass) => set({ nftPass }),
  reset: () => set({
    isConnected: false,
    address: null,
    chainId: null,
    balances: { fcc: '0', usdt: '0', pol: '0' },
    nftPass: { type: 'none', expiresAt: null, isValid: false },
  }),
}));

// Event state
interface Event {
  activityId: number;
  businessName: string;
  tokenSymbol: 'FCC' | 'USDT';
  dropNumber: number;
  alreadyDropNumber: number;
  activityDeadLine: number;
  activityStatus: number;
  tokenContractAddr: string;
}

interface EventState {
  myEvents: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  setMyEvents: (events: Event[]) => void;
  setSelectedEvent: (event: Event | null) => void;
  setLoading: (isLoading: boolean) => void;
  updateEvent: (eventId: number, updates: Partial<Event>) => void;
}

export const useEventStore = create<EventState>()((set) => ({
  myEvents: [],
  selectedEvent: null,
  isLoading: false,
  setMyEvents: (myEvents) => set({ myEvents }),
  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
  setLoading: (isLoading) => set({ isLoading }),
  updateEvent: (eventId, updates) => set((state) => ({
    myEvents: state.myEvents.map((e) =>
      e.activityId === eventId ? { ...e, ...updates } : e
    ),
  })),
}));

// Address book state (persisted)
interface AddressEntry {
  address: string;
  label: string;
  addedAt: number;
}

interface AddressBookState {
  entries: AddressEntry[];
  addEntry: (entry: AddressEntry) => void;
  removeEntry: (address: string) => void;
  updateEntry: (address: string, label: string) => void;
  clearAll: () => void;
}

export const useAddressBookStore = create<AddressBookState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => set((state) => ({
        entries: [...state.entries, entry],
      })),
      removeEntry: (address) => set((state) => ({
        entries: state.entries.filter((e) => e.address.toLowerCase() !== address.toLowerCase()),
      })),
      updateEntry: (address, label) => set((state) => ({
        entries: state.entries.map((e) =>
          e.address.toLowerCase() === address.toLowerCase() ? { ...e, label } : e
        ),
      })),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'fishcake-address-book',
    }
  )
);

// UI state
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  gasPrice: number | null;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGasPrice: (price: number | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      gasPrice: null,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setGasPrice: (gasPrice) => set({ gasPrice }),
    }),
    {
      name: 'fishcake-ui',
    }
  )
);

// Transaction state
interface Transaction {
  hash: string;
  type: 'create-event' | 'drop' | 'batch-drop' | 'finish' | 'buy-fcc' | 'sell-fcc' | 'mint-nft' | 'approve';
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  details?: Record<string, unknown>;
}

interface TransactionState {
  transactions: Transaction[];
  pendingTx: Transaction | null;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (hash: string, status: Transaction['status']) => void;
  setPendingTx: (tx: Transaction | null) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions: [],
  pendingTx: null,
  addTransaction: (tx) => set((state) => ({
    transactions: [tx, ...state.transactions].slice(0, 50), // Keep last 50
  })),
  updateTransaction: (hash, status) => set((state) => ({
    transactions: state.transactions.map((t) =>
      t.hash === hash ? { ...t, status } : t
    ),
  })),
  setPendingTx: (pendingTx) => set({ pendingTx }),
  clearTransactions: () => set({ transactions: [] }),
}));
