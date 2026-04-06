'use client';

import { useEffect, useRef, useState } from 'react';
import { useMiningStore, WorkflowNode, WorkflowNodeStatus, MiningEvent, MiningWallet } from '@/lib/stores/miningStore';
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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Compact positions for stacked view
const nodePositions: Record<string, NodePosition> = {
  mint_nft: { x: 60, y: 50 },
  create_event: { x: 180, y: 50 },
  drop_1: { x: 300, y: 25 },
  drop_2: { x: 300, y: 75 },
  validate: { x: 420, y: 50 },
  check_reward: { x: 540, y: 50 },
  finish_event: { x: 660, y: 50 },
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

// Main WorkflowCanvas - Shows ALL wallets stacked
export function WorkflowCanvas() {
  const { wallets, isAutomationRunning } = useMiningStore();

  // No wallets - show empty state
  if (wallets.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Wallets Imported</h3>
            <p className="text-sm text-gray-600">
              Import wallets in the Wallet Manager to view their workflows
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Visual Workflows</h2>
          <p className="text-xs text-gray-600 font-semibold">
            Each wallet has its own independent automation workflow
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 w-fit">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isAutomationRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          )} />
          <span className="text-xs font-bold text-gray-700">
            {isAutomationRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Stacked Workflows for each wallet */}
      {wallets.map((wallet, index) => (
        <SingleWalletWorkflow 
          key={wallet.id} 
          wallet={wallet}
          index={index}
        />
      ))}

      {/* Legend - Responsive */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs font-bold text-gray-600 uppercase w-full sm:w-auto">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-700">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-gray-700">Running</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-700">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-700">Failed</span>
        </div>
      </div>
    </div>
  );
}

// Individual wallet workflow component
function SingleWalletWorkflow({ wallet, index }: { wallet: MiningWallet; index: number }) {
  const { walletWorkflows, workflowNodes, events } = useMiningStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Get wallet-specific workflow or use default nodes
  const workflow = walletWorkflows[wallet.id];
  const displayNodes = workflow?.nodes || workflowNodes;

  // Get latest event for this wallet
  const walletEvents = events.filter(e => e.walletId === wallet.id);
  const latestEvent = walletEvents.length > 0 
    ? walletEvents.sort((a, b) => b.startedAt - a.startedAt)[0] 
    : null;

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const width = canvasRef.current.clientWidth;
        const canvasWidth = 750;
        setScale(Math.min(1, width / canvasWidth));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card className="overflow-hidden bg-white border-gray-200 hover:border-gray-300 transition-colors">
      <CardContent className="p-3 sm:p-4">
        {/* Wallet Header with Address on Right - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              wallet.status === 'active' ? 'bg-green-100' :
              wallet.status === 'paused' ? 'bg-yellow-100' :
              'bg-red-100'
            )}>
              <Wallet className={cn(
                'w-4 h-4',
                wallet.status === 'active' ? 'text-green-600' :
                wallet.status === 'paused' ? 'text-yellow-600' :
                'text-red-600'
              )} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Wallet #{index + 1}
              </p>
              <p className={cn(
                'text-xs font-semibold capitalize',
                wallet.status === 'active' ? 'text-green-600' :
                wallet.status === 'paused' ? 'text-yellow-600' :
                'text-red-600'
              )}>
                {wallet.status}
              </p>
            </div>
          </div>

          {/* Wallet Address on Right */}
          <div className="flex items-center gap-2 sm:gap-3 ml-11 sm:ml-0">
            {latestEvent && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                Event #{latestEvent.chainEventId || '...'}
              </span>
            )}
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-fishcake-500/10 to-orange-500/10 border border-fishcake-500/20">
              <span className="text-xs sm:text-sm font-mono font-bold text-gray-900">
                {formatAddress(wallet.address)}
              </span>
            </div>
          </div>
        </div>

        {/* Canvas - Horizontally scrollable on mobile */}
        <div 
          ref={canvasRef}
          className="relative overflow-x-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-2 sm:p-4"
          style={{ minHeight: '140px' }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:16px_16px]" />
          </div>

          {/* SVG Connections */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            width="750"
            height="120"
          >
            <defs>
              <linearGradient id={`activeGradient-${wallet.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>

            {connections.map((conn, idx) => {
              const fromPos = nodePositions[conn.from];
              const toPos = nodePositions[conn.to];
              const fromNode = displayNodes.find(n => n.id === conn.from);
              const toNode = displayNodes.find(n => n.id === conn.to);
              
              const isActive = fromNode?.status === 'completed' || toNode?.status === 'running';
              const isRunning = toNode?.status === 'running';

              const midX = (fromPos.x + toPos.x) / 2 + 30;
              const midY = (fromPos.y + toPos.y) / 2;

              return (
                <g key={idx}>
                  <path
                    d={`M ${fromPos.x + 35} ${fromPos.y + 20} Q ${midX} ${midY} ${toPos.x} ${toPos.y + 20}`}
                    fill="none"
                    stroke={isRunning ? `url(#activeGradient-${wallet.id})` : isActive ? '#f97316' : '#9ca3af'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={isRunning ? '6 4' : 'none'}
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
                  <circle
                    cx={toPos.x}
                    cy={toPos.y + 20}
                    r="3"
                    fill={isActive ? '#f97316' : '#9ca3af'}
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
              width: '720px',
              height: '110px'
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

        {/* Last Updated */}
        {workflow?.lastUpdated && (
          <p className="text-[10px] text-gray-500 mt-2 text-right">
            Last updated: {formatTimestamp(workflow.lastUpdated)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Node component
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
        return {
          txHash: node.data?.txHash,
          timestamp: node.data?.timestamp,
        };
    }
  };

  const txData = getTxData();
  const hasTxData = txData?.txHash || txData?.timestamp;

  // Compact node labels
  const compactLabels: Record<string, string> = {
    mint_nft: 'Mint',
    create_event: 'Create',
    drop_1: 'Drop 1',
    drop_2: 'Drop 2',
    validate: 'Validate',
    check_reward: 'Reward',
    finish_event: 'Finish',
  };

  return (
    <div
      className="absolute flex flex-col items-center transition-all duration-300"
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
        className={cn(
          'relative w-[70px] h-[40px] rounded-lg bg-gradient-to-br border-2 flex items-center justify-center transition-all duration-300 cursor-pointer',
          nodeColors[node.status],
          node.status === 'running' && 'shadow-md shadow-blue-500/30'
        )}
      >
        {node.status === 'running' && (
          <div className="absolute inset-0 rounded-lg bg-blue-500/20 animate-ping" />
        )}
        
        <Icon className={cn(
          'w-4 h-4',
          node.status === 'running' ? 'text-blue-500 animate-spin' :
          node.status === 'completed' ? 'text-green-500' :
          node.status === 'failed' ? 'text-red-500' :
          'text-gray-400'
        )} />

        <div className="absolute -top-1 -right-1">
          <StatusIcon className={cn(
            'w-3 h-3',
            node.status === 'running' ? 'text-blue-500 animate-spin' :
            node.status === 'completed' ? 'text-green-500' :
            node.status === 'failed' ? 'text-red-500' :
            'text-gray-400'
          )} />
        </div>

        {hasTxData && (
          <div className="absolute -bottom-1 -right-1">
            <ExternalLink className="w-2.5 h-2.5 text-fishcake-500" />
          </div>
        )}
      </div>

      {/* Label */}
      <span className={cn(
        'mt-1 text-[10px] font-bold text-center',
        node.status === 'running' ? 'text-blue-700' :
        node.status === 'completed' ? 'text-green-700' :
        node.status === 'failed' ? 'text-red-700' :
        'text-gray-600'
      )}>
        {compactLabels[node.type] || node.label}
      </span>

      {/* Tooltip */}
      {showTooltip && hasTxData && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[240px]">
          <div className="text-xs space-y-2">
            <p className="font-bold text-fishcake-400">{node.label}</p>
            {txData?.txHash && (
              <div>
                <p className="text-gray-400 text-[10px] mb-0.5">Transaction:</p>
                <a 
                  href={getPolygonScanLink(txData.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-fishcake-400 hover:text-fishcake-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-mono text-[10px]">{formatAddress(txData.txHash)}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
            {txData?.timestamp && (
              <div>
                <p className="text-gray-400 text-[10px] mb-0.5">Date:</p>
                <p className="font-mono text-[10px]">{formatTimestamp(txData.timestamp)}</p>
              </div>
            )}
            {node.error && (
              <div>
                <p className="text-red-400 text-[10px] mb-0.5">Error:</p>
                <p className="text-red-300 text-[10px]">{node.error}</p>
              </div>
            )}
          </div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-900" />
        </div>
      )}
    </div>
  );
}
