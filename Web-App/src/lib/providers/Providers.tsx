'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useUIStore } from '@/lib/stores';
import { POLYGON_RPC } from '@/lib/config/constants';

// Create query client with minimal config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Wallet context types
interface WalletState {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  provider: ethers.JsonRpcProvider | null;
  signer: ethers.Wallet | null;
}

interface WalletContextType extends WalletState {
  connect: (privateKey: string, passphrase: string) => Promise<boolean>;
  disconnect: () => void;
  isUnlocked: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Secure encryption for browser (Web Crypto API)
async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPrivateKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt.buffer as ArrayBuffer);
  
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(privateKey)
  );
  
  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return btoa(Array.from(combined).map(b => String.fromCharCode(b)).join(''));
}

async function decryptPrivateKey(encryptedData: string, passphrase: string): Promise<string> {
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  
  const key = await deriveKey(passphrase, salt.buffer as ArrayBuffer);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

// Storage keys
const STORAGE_KEY = 'fishcake_wallet';
const SESSION_KEY = 'fishcake_session';

function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isLoading: true,
    provider: null,
    signer: null,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Initialize provider on mount
  useEffect(() => {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    
    // Check for existing session
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const { address, pk } = JSON.parse(session);
        const signer = new ethers.Wallet(pk, provider);
        setState({
          address,
          isConnected: true,
          isLoading: false,
          provider,
          signer,
        });
        setIsUnlocked(true);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        setState(s => ({ ...s, isLoading: false, provider }));
      }
    } else {
      setState(s => ({ ...s, isLoading: false, provider }));
    }
  }, []);

  const connect = async (privateKey: string, passphrase: string): Promise<boolean> => {
    try {
      // Validate private key
      const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
      const signer = new ethers.Wallet(cleanKey, provider);
      const address = await signer.getAddress();

      // Encrypt and store
      const encrypted = await encryptPrivateKey(cleanKey, passphrase);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ encrypted, address }));
      
      // Store session (cleared on tab close)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ address, pk: cleanKey }));

      setState({
        address,
        isConnected: true,
        isLoading: false,
        provider,
        signer,
      });
      setIsUnlocked(true);

      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  };

  const disconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setState({
      address: null,
      isConnected: false,
      isLoading: false,
      provider: state.provider,
      signer: null,
    });
    setIsUnlocked(false);
  };

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, isUnlocked }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        {children}
      </WalletProvider>
    </QueryClientProvider>
  );
}
