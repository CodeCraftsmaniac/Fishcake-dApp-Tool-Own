'use client';

import { useEffect, useRef, useState } from 'react';
import { useMiningStore, WorkflowNode, WorkflowNodeStatus, WalletWorkflow, MiningEvent } from '@/lib/stores/miningStore';
import { Card, CardContent } from '@/components/ui';
import {
  Sparkles, 
  Calendar, 
  Droplets, 
  CheckCircle2, 
  Gift, 
  Flag,
  Loader2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Wallet,
  ChevronDown
} from 'lucide-react';

const nodeIcons: Record<string, React.ElementType> = {
  mint_nft: Sparkles,
  create_event: Calendar,
  drop_1: Droplets,
  drop_2: Droplets,
  validate: CheckCircle2,
  check_reward: Gift,
  finish_event: Flag,
};

const nodeColors: Record<WorkflowNodeStatus, string> = {
  pending: 'from-gray-500/20 to-gray-600/20 border-gray-500/30',
  running: 'from-blue-500/30 to-cyan-500/30 border-blue-400/50 animate-pulse',
  completed: 'from-green-500/30 to-emerald-500/30 border-green-400/50',
  failed: 'from-red-500/30 to-rose-500/30 border-red-400/50',
  skipped: 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30',
};

const statusIcons: Record<WorkflowNodeStatus, React.ElementType> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: ArrowRight,
};

interface NodePosition {
  x: number;
  y: number;
}

const nodePositions: Record<string, NodePosition> = {
  mint_nft: { x: 100, y: 80 },
  create_event: { x: 300, y: 80 },
  drop_1: { x: 500, y: 40 },
  drop_2: { x: 500, y: 120 },
  validate: { x: 700, y: 80 },
  check_reward: { x: 900, y: 80 },
  finish_event: { x: 1100, y: 80 },
};

const connections = [
  { from: 'mint_nft', to: 'create_event' },
  { from: 'create_event', to: 'drop_1' },
  { from: 'create_event', to: 'drop_2' },
  { from: 'drop_1', to: 'validate' },
  { from: 'drop_2', to: 'validate' },
  { from: 'validate', to: 'check_reward' },
  { from: 'check_reward', to: 'finish_event' },
];

// Format address for display
const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format timestamp to UTC
const formatTimestamp = (timestamp: number | undefined) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
};

// Get PolygonScan link
const getPolygonScanLink = (txHash: string) => {
  return `https://polygonscan.com/tx/${txHash}`;
};

interface WorkflowCanvasProps {
  walletId?: string;
}

export function WorkflowCanvas({ walletId }: WorkflowCanvasProps) {
  const { 
    wallets, 
    walletWorkflows, 
    workflowNodes, 
    isAutomationRunning, 
    currentEvent,
    events,
    selectedWorkflowWalletId,
    selectWorkflowWallet 
  } = useMiningStore();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Use provided walletId or selected wallet
  const activeWalletId = walletId || selectedWorkflowWalletId;
  const activeWallet = wallets.find(w => w.id === activeWalletId);
  
  // Get wallet-specific workflow or fallback to shared
  const workflow = activeWalletId ? walletWorkflows[activeWalletId] : null;
  const displayNodes = workflow?.nodes || workflowNodes;
  
  // Get latest event for this wallet
  const walletEvents = events.filter(e => e.walletId === activeWalletId);
  const latestEvent = walletEvents.length > 0 
    ? walletEvents.sort((a, b) => b.startedAt - a.startedAt)[0] 
    : null;

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const width = canvasRef.current.clientWidth;
        const canvasWidth = 1250;
        setScale(Math.min(1, width / canvasWidth));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowWalletDropdown(false);
    if (showWalletDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showWalletDropdown]);

  return (
    <Card className="overflow-hidden bg-white border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Visual Workflow</h3>
            <p className="text-xs text-gray-700 font-semibold">
              Real-time automation execution status
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Current Event Info */}
            {latestEvent && (
              <div className="text-xs font-semibold">
                <span className="text-gray-700">Event: </span>
                <span className="font-mono text-orange-600 font-bold">
                  #{latestEvent.chainEventId || 'Creating...'}
                </span>
              </div>
            )}
            
            {/* Wallet Selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWalletDropdown(!showWalletDropdown);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-fishcake-500/10 to-orange-500/10 border border-fishcake-500/30 hover:border-fishcake-500/50 transition-colors"
              >
                <Wallet className="w-4 h-4 text-fishcake-600" />
                <span className="text-sm font-bold text-gray-900">
                  {activeWallet ? formatAddress(activeWallet.address) : 'Select Wallet'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              {/* Dropdown */}
              {showWalletDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Wallet</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {wallets.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">No wallets imported</p>
                    ) : (
                      wallets.map((wallet) => (
                        <button
                          key={wallet.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectWorkflowWallet(wallet.id);
                            setShowWalletDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                            wallet.id === activeWalletId ? 'bg-fishcake-50 border-l-2 border-fishcake-500' : ''
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            wallet.status === 'active' ? 'bg-green-500' :
                            wallet.status === 'paused' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-mono font-bold text-gray-900">
                              {formatAddress(wallet.address)}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{wallet.status}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          className="relative overflow-x-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-8"
          style={{ minHeight: '280px' }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:20px_20px]" />
          </div>

          {/* No wallet selected message */}
          {!activeWalletId && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="text-center">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-bold">Select a wallet to view workflow</p>
                <p className="text-sm text-gray-500">Each wallet has its own independent workflow</p>
              </div>
            </div>
          )}

          {/* SVG Connections */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            width="1250"
            height="260"
          >
            <defs>
              {/* Gradient for active connections */}
              <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              
              {/* Animated dash for running */}
              <pattern id="flowingDash" patternUnits="userSpaceOnUse" width="20" height="4">
                <rect width="10" height="4" fill="url(#activeGradient)">
                  <animate 
                    attributeName="x" 
                    from="-20" 
                    to="0" 
                    dur="0.5s" 
                    repeatCount="indefinite" 
                  />
                </rect>
              </pattern>
            </defs>

            {connections.map((conn, idx) => {
              const fromPos = nodePositions[conn.from];
              const toPos = nodePositions[conn.to];
              const fromNode = displayNodes.find(n => n.id === conn.from);
              const toNode = displayNodes.find(n => n.id === conn.to);
              
              const isActive = fromNode?.status === 'completed' || toNode?.status === 'running';
              const isRunning = toNode?.status === 'running';

              // Calculate control points for curved line
              const midX = (fromPos.x + toPos.x) / 2 + 50;
              const midY = (fromPos.y + toPos.y) / 2;

              return (
                <g key={idx}>
                  {/* Shadow */}
                  <path
                    d={`M ${fromPos.x + 50} ${fromPos.y + 30} Q ${midX} ${midY} ${toPos.x} ${toPos.y + 30}`}
                    fill="none"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Main line */}
                  <path
                    d={`M ${fromPos.x + 50} ${fromPos.y + 30} Q ${midX} ${midY} ${toPos.x} ${toPos.y + 30}`}
                    fill="none"
                    stroke={isRunning ? 'url(#flowingDash)' : isActive ? 'url(#activeGradient)' : '#4b5563'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={isRunning ? '10 10' : 'none'}
                  >
                    {isRunning && (
                      <animate 
                        attributeName="stroke-dashoffset" 
                        from="20" 
                        to="0" 
                        dur="0.5s" 
                        repeatCount="indefinite" 
                      />
                    )}
                  </path>
                  {/* Arrow head */}
                  <circle
                    cx={toPos.x}
                    cy={toPos.y + 30}
                    r="4"
                    fill={isActive ? '#f97316' : '#4b5563'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          <div 
            className="relative"
            style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left',
              width: '1200px',
              height: '240px'
            }}
          >
            {displayNodes.map((node) => (
              <WorkflowNodeComponent
                key={node.id}
                node={node}
                position={nodePositions[node.id]}
                latestEvent={latestEvent}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-6 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-700">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-gray-700">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-700">Failed</span>
            </div>
          </div>
          
          {/* Last updated */}
          {workflow?.lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {formatTimestamp(workflow.lastUpdated)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowNodeComponent({ 
  node, 
  position,
  latestEvent 
}: { 
  node: WorkflowNode; 
  position: NodePosition;
  latestEvent: MiningEvent | null;
}) {
  const Icon = nodeIcons[node.type] || Calendar;
  const StatusIcon = statusIcons[node.status];
  const [showTooltip, setShowTooltip] = useState(false);

  // Get transaction data from the latest event based on node type
  const getTxData = () => {
    if (!latestEvent) return null;
    
    switch (node.type) {
      case 'mint_nft':
        return {
          txHash: latestEvent.mintNftTxHash,
          timestamp: latestEvent.mintNftTimestamp,
        };
      case 'create_event':
        return {
          txHash: latestEvent.createEventTxHash,
          timestamp: latestEvent.createEventTimestamp,
        };
      case 'drop_1':
        return {
          txHash: latestEvent.drop1TxHash,
          timestamp: latestEvent.drop1Timestamp,
        };
      case 'drop_2':
        return {
          txHash: latestEvent.drop2TxHash,
          timestamp: latestEvent.drop2Timestamp,
        };
      case 'finish_event':
        return {
          txHash: latestEvent.finishEventTxHash,
          timestamp: latestEvent.finishEventTimestamp,
        };
      default:
        // For validate and check_reward, use node data
        return {
          txHash: node.data?.txHash,
          timestamp: node.data?.timestamp,
        };
    }
  };

  const txData = getTxData();
  const hasTxData = txData?.txHash || txData?.timestamp;

  return (
    <div
      className={`absolute flex flex-col items-center transition-all duration-300`}
      style={{ 
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 0)'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Node Box */}
      <div
        className={`relative w-[100px] h-[60px] rounded-xl bg-gradient-to-br ${nodeColors[node.status]} border-2 flex items-center justify-center transition-all duration-300 ${
          node.status === 'running' ? 'shadow-lg shadow-blue-500/30' : ''
        } cursor-pointer`}
      >
        {/* Glow effect for running */}
        {node.status === 'running' && (
          <div className="absolute inset-0 rounded-xl bg-blue-500/20 animate-ping" />
        )}
        
        {/* Icon */}
        <div className="relative z-10 flex flex-col items-center gap-1">
          <Icon className={`w-6 h-6 ${
            node.status === 'running' ? 'text-blue-400 animate-spin' :
            node.status === 'completed' ? 'text-green-400' :
            node.status === 'failed' ? 'text-red-400' :
            'text-gray-400'
          }`} />
        </div>

        {/* Status indicator */}
        <div className="absolute -top-1 -right-1">
          <StatusIcon className={`w-4 h-4 ${
            node.status === 'running' ? 'text-blue-400 animate-spin' :
            node.status === 'completed' ? 'text-green-400' :
            node.status === 'failed' ? 'text-red-400' :
            'text-gray-500'
          }`} />
        </div>
        
        {/* Transaction indicator */}
        {hasTxData && (
          <div className="absolute -bottom-1 -right-1">
            <ExternalLink className="w-3 h-3 text-fishcake-500" />
          </div>
        )}
      </div>

      {/* Label */}
      <span className={`mt-2 text-xs font-bold text-center max-w-[120px] ${
        node.status === 'running' ? 'text-blue-700' :
        node.status === 'completed' ? 'text-green-700' :
        node.status === 'failed' ? 'text-red-700' :
        'text-gray-700'
      }`}>
        {node.label}
      </span>

      {/* Duration or timestamp */}
      {node.completedAt && node.startedAt && (
        <span className="text-[10px] text-gray-700 font-bold">
          {((node.completedAt - node.startedAt) / 1000).toFixed(1)}s
        </span>
      )}

      {/* Tooltip with transaction details */}
      {showTooltip && hasTxData && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[280px]">
          <div className="text-xs space-y-2">
            {txData?.txHash && (
              <div>
                <p className="text-gray-400 font-bold mb-1">Transaction:</p>
                <a 
                  href={getPolygonScanLink(txData.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-fishcake-400 hover:text-fishcake-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-mono">{formatAddress(txData.txHash)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {txData?.timestamp && (
              <div>
                <p className="text-gray-400 font-bold mb-1">Date:</p>
                <p className="font-mono">{formatTimestamp(txData.timestamp)}</p>
              </div>
            )}
            {node.data?.gasUsed && (
              <div>
                <p className="text-gray-400 font-bold mb-1">Gas Used:</p>
                <p className="font-mono">{node.data.gasUsed}</p>
              </div>
            )}
            {node.error && (
              <div>
                <p className="text-red-400 font-bold mb-1">Error:</p>
                <p className="text-red-300">{node.error}</p>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-gray-900" />
        </div>
      )}
    </div>
  );
}
