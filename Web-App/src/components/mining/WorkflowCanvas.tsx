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
  AlertCircle,
  Activity
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
  pending: 'from-white to-gray-100 border-gray-300 shadow-sm',
  running: 'from-blue-500 via-blue-600 to-cyan-500 border-blue-400 shadow-xl shadow-blue-500/40 animate-pulse',
  completed: 'from-green-500 via-emerald-500 to-green-600 border-green-400 shadow-lg shadow-green-500/30',
  failed: 'from-red-500 via-rose-500 to-red-600 border-red-400 shadow-lg shadow-red-500/30',
  skipped: 'from-yellow-400 to-amber-500 border-yellow-400 shadow-md',
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

// Positions will be calculated dynamically based on container width
const nodePositions: Record<string, NodePosition> = {
  mint_nft: { x: 0, y: 70 },
  create_event: { x: 0, y: 70 },
  drop_1: { x: 0, y: 35 },
  drop_2: { x: 0, y: 105 },
  validate: { x: 0, y: 70 },
  check_reward: { x: 0, y: 70 },
  finish_event: { x: 0, y: 70 },
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

  // No wallets - show empty state matching overview style
  if (wallets.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">No Wallets Imported</h3>
            <p className="text-sm text-gray-700 font-semibold">
              Import wallets in the Wallet Manager to view their automated workflows and start mining
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header matching overview style */}
      <Card className={cn(
        'border overflow-hidden relative',
        isAutomationRunning 
          ? 'border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50' 
          : 'border-yellow-200 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-50'
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center relative flex-shrink-0',
                isAutomationRunning ? 'bg-green-100' : 'bg-yellow-100'
              )}>
                {isAutomationRunning ? (
                  <>
                    <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                    <div className="absolute inset-0 rounded-lg bg-green-200/50 animate-ping" />
                  </>
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  Visual Workflows
                </h2>
                <p className="text-xs text-gray-600 font-medium">
                  Each wallet has its own independent automation workflow with real-time transaction tracking
                </p>
              </div>
            </div>
            
            {/* Clean Legend */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-lg bg-white border border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Legend:</span>
              
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span className="text-xs font-medium text-gray-700">Pending</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-blue-700">Running</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-700">Done</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700">Failed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stacked Workflows for each wallet */}
      {wallets.map((wallet, index) => (
        <SingleWalletWorkflow 
          key={wallet.id} 
          wallet={wallet}
          index={index}
        />
      ))}
    </div>
  );
}

// Individual wallet workflow component
function SingleWalletWorkflow({ wallet, index }: { wallet: MiningWallet; index: number }) {
  const { walletWorkflows, workflowNodes, events } = useMiningStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

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
        setCanvasWidth(width);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate positions dynamically based on container width
  const getNodePositions = (width: number): Record<string, NodePosition> => {
    const padding = 64; // p-8 = 32px each side
    const availableWidth = width - padding;
    const nodeWidth = 110; // width of each node
    
    // Calculate spacing: 6 nodes on main line, need 5 gaps between them
    // Account for half node width on each end
    const usableWidth = availableWidth - nodeWidth; // Reserve space for node widths
    const gap = usableWidth / 5; // 5 gaps between 6 positions
    
    return {
      mint_nft: { x: nodeWidth / 2, y: 70 },
      create_event: { x: nodeWidth / 2 + gap * 1, y: 70 },
      drop_1: { x: nodeWidth / 2 + gap * 2, y: 10 },
      drop_2: { x: nodeWidth / 2 + gap * 2, y: 130 },
      validate: { x: nodeWidth / 2 + gap * 3, y: 70 },
      check_reward: { x: nodeWidth / 2 + gap * 4, y: 70 },
      finish_event: { x: nodeWidth / 2 + gap * 5, y: 70 },
    };
  };

  const nodePositions = getNodePositions(canvasWidth || 800);

  return (
    <Card className="overflow-hidden bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 shadow-md">
      <CardContent className="p-5">
        {/* Premium Wallet Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative shadow-lg transition-all duration-300',
              wallet.status === 'active' 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30' 
                : wallet.status === 'paused' 
                ? 'bg-gradient-to-br from-amber-500 to-yellow-600 shadow-amber-500/30' 
                : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/30'
            )}>
              <Wallet className="w-5 h-5 text-white drop-shadow" />
              {wallet.status === 'active' && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-lg" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                  Wallet #{index + 1}
                </p>
                {workflow?.lastUpdated && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-gray-400" />
                      <p className="text-[10px] text-gray-400 font-medium">
                        {formatTimestamp(workflow.lastUpdated)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {wallet.status === 'active' && (
                  <div className="px-2.5 py-0.5 rounded-full bg-green-100 border border-green-200">
                    <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Active</span>
                  </div>
                )}
                {wallet.status === 'paused' && (
                  <div className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Paused</span>
                  </div>
                )}
                {wallet.status !== 'active' && wallet.status !== 'paused' && (
                  <div className="px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide capitalize">{wallet.status}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Premium Wallet Address */}
          <div className="flex items-center gap-3 ml-14 sm:ml-0">
            {latestEvent && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                  Event #{latestEvent.chainEventId || '...'}
                </span>
              </div>
            )}
            <a 
              href={`https://polygonscan.com/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl blur-sm opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="relative px-4 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <span className="text-sm font-mono font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  {wallet.address}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-purple-600 group-hover:text-violet-600 transition-colors flex-shrink-0" />
              </div>
            </a>
          </div>
        </div>

        {/* Premium Canvas */}
        <div 
          ref={canvasRef}
          className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50/40 rounded-2xl border-2 border-gray-200 p-8 shadow-inner overflow-hidden"
          style={{ minHeight: '240px' }}
        >
          {/* Premium Grid Background */}
          <div className="absolute inset-0 opacity-[0.08]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000010_1px,transparent_1px),linear-gradient(to_bottom,#00000010_1px,transparent_1px)] bg-[size:32px_32px]" />
          </div>
          
          {/* Ambient gradient overlays */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-fishcake-400/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-400/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl" />

          {canvasWidth > 0 && (
            <>
              {/* SVG Connections */}
              <svg 
                className="absolute top-0 left-8 pointer-events-none"
                width={canvasWidth - 64}
                height="200"
              >
            <defs>
              <linearGradient id={`activeGradient-${wallet.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id={`completedGradient-${wallet.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id={`glow-${wallet.id}`}>
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Arrow markers */}
              <marker
                id={`arrow-inactive-${wallet.id}`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L0,8 L8,4 z" fill="#cbd5e1" />
              </marker>
              <marker
                id={`arrow-active-${wallet.id}`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L0,8 L8,4 z" fill="#10b981" />
              </marker>
              <marker
                id={`arrow-running-${wallet.id}`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L0,8 L8,4 z" fill="#3b82f6" />
              </marker>
            </defs>

            {connections.map((conn, idx) => {
              const fromPos = nodePositions[conn.from];
              const toPos = nodePositions[conn.to];
              const fromNode = displayNodes.find(n => n.id === conn.from);
              const toNode = displayNodes.find(n => n.id === conn.to);
              
              const isActive = fromNode?.status === 'completed' || toNode?.status === 'running';
              const isRunning = toNode?.status === 'running';
              const isCompleted = fromNode?.status === 'completed' && toNode?.status === 'completed';

              // Node dimensions
              const nodeHeight = 60;
              const nodeWidth = 110;
              
              // Calculate actual center positions (fromPos is already centered due to transform: translate(-50%, 0))
              // So we just need to add half the node dimensions
              const startX = fromPos.x + (nodeWidth / 2);
              const startY = fromPos.y + (nodeHeight / 2);
              const endX = toPos.x - (nodeWidth / 2);
              const endY = toPos.y + (nodeHeight / 2);
              
              const dx = endX - startX;
              const dy = endY - startY;
              
              // Control points for smooth S-curve
              const cp1X = startX + dx * 0.5;
              const cp1Y = startY;
              const cp2X = startX + dx * 0.5;
              const cp2Y = endY;

              const markerEnd = isRunning 
                ? `url(#arrow-running-${wallet.id})` 
                : isActive 
                ? `url(#arrow-active-${wallet.id})` 
                : `url(#arrow-inactive-${wallet.id})`;

              const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

              return (
                <g key={idx}>
                  {/* Glow effect for active connections */}
                  {isActive && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isRunning ? '#3b82f6' : '#10b981'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      opacity="0.2"
                      filter={`url(#glow-${wallet.id})`}
                    />
                  )}
                  
                  {/* Main connection path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      isRunning ? `url(#activeGradient-${wallet.id})` : 
                      isCompleted ? `url(#completedGradient-${wallet.id})` :
                      isActive ? '#10b981' : 
                      '#d1d5db'
                    }
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isRunning ? '8 4' : 'none'}
                    opacity={isActive ? '0.9' : '0.5'}
                    markerEnd={markerEnd}
                  >
                    {isRunning && (
                      <animate 
                        attributeName="stroke-dashoffset" 
                        from="24" 
                        to="0" 
                        dur="0.6s" 
                        repeatCount="indefinite" 
                      />
                    )}
                  </path>
                  
                  {/* Animated particle for running state */}
                  {isRunning && (
                    <circle r="3.5" fill="#3b82f6" opacity="0.9">
                      <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

              {/* Nodes */}
              <div className="relative" style={{ height: '190px' }}>
                {displayNodes.map((node) => (
                  <WorkflowNodeComponent
                    key={node.id}
                    node={node}
                    position={nodePositions[node.id]}
                    latestEvent={latestEvent}
                  />
                ))}
              </div>
            </>
          )}
        </div>
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
      className="absolute flex flex-col items-center transition-all duration-300 group"
      style={{ 
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 0)'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Premium Node Box */}
      <div
        className={cn(
          'relative w-[110px] h-[60px] rounded-2xl bg-gradient-to-br border-2 flex items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-sm',
          nodeColors[node.status],
          'hover:scale-110 hover:shadow-2xl'
        )}
      >
        {/* Animated background for running state */}
        {node.status === 'running' && (
          <>
            <div className="absolute inset-0 rounded-2xl bg-blue-400/30 animate-ping" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-cyan-400/20 animate-pulse" />
          </>
        )}
        
        {/* Glow effect for completed/running */}
        {(node.status === 'running' || node.status === 'completed') && (
          <div className={cn(
            "absolute inset-0 rounded-2xl blur-lg -z-10 opacity-60",
            node.status === 'running' ? 'bg-blue-500/50 animate-pulse' :
            'bg-green-500/40'
          )} />
        )}
        
        {/* Main Icon */}
        <Icon className={cn(
          'w-7 h-7 relative z-10 transition-all duration-300 drop-shadow-md',
          node.status === 'running' ? 'text-white' :
          node.status === 'completed' ? 'text-white' :
          node.status === 'failed' ? 'text-white' :
          'text-gray-600'
        )} />

        {/* Status Badge */}
        <div className={cn(
          "absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full flex items-center justify-center border-3 border-white shadow-lg",
          node.status === 'running' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
          node.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600' :
          node.status === 'failed' ? 'bg-gradient-to-br from-red-500 to-red-600' :
          'bg-gradient-to-br from-gray-400 to-gray-500'
        )}>
          <StatusIcon className={cn(
            'w-4 h-4 text-white drop-shadow',
            node.status === 'running' && 'animate-spin'
          )} />
        </div>

        {/* Transaction Indicator */}
        {hasTxData && (
          <div className="absolute -bottom-2.5 -right-2.5 w-7 h-7 rounded-full bg-gradient-to-br from-fishcake-500 via-orange-500 to-orange-600 flex items-center justify-center border-3 border-white shadow-lg group-hover:scale-125 transition-transform">
            <ExternalLink className="w-3.5 h-3.5 text-white drop-shadow" />
          </div>
        )}
      </div>

      {/* Premium Label */}
      <span className={cn(
        'mt-3 text-xs font-bold text-center px-2.5 py-1 rounded-lg transition-all duration-300',
        node.status === 'running' ? 'text-blue-700 bg-blue-50 border border-blue-200' :
        node.status === 'completed' ? 'text-green-700 bg-green-50 border border-green-200' :
        node.status === 'failed' ? 'text-red-700 bg-red-50 border border-red-200' :
        'text-gray-600 bg-white border border-gray-200'
      )}>
        {compactLabels[node.type] || node.label}
      </span>

      {/* Premium Tooltip */}
      {showTooltip && hasTxData && (
        <div className="absolute top-full mt-5 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative bg-white rounded-xl shadow-2xl p-4 min-w-[300px] border-2 border-gray-200">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fishcake-500 via-orange-500 to-pink-500 rounded-t-xl" />
            
            <div className="text-xs space-y-3 mt-1">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
                  node.status === 'running' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                  node.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                  'bg-gradient-to-br from-red-500 to-red-600'
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 mb-0.5">
                    {node.label}
                  </p>
                  <p className={cn(
                    "text-xs font-semibold capitalize",
                    node.status === 'running' ? 'text-blue-600' :
                    node.status === 'completed' ? 'text-green-600' :
                    'text-red-600'
                  )}>
                    {node.status}
                  </p>
                </div>
              </div>
              
              {txData?.txHash && (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-600 text-[10px] mb-2 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3" />
                    Transaction Hash
                  </p>
                  <a 
                    href={getPolygonScanLink(txData.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-fishcake-600 hover:text-fishcake-700 transition-colors group/link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-mono text-xs font-bold">{formatAddress(txData.txHash)}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              )}
              
              {txData?.timestamp && (
                <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-600 text-[10px] mb-2 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Timestamp
                  </p>
                  <p className="font-mono text-xs text-gray-900 font-semibold">{formatTimestamp(txData.timestamp)}</p>
                </div>
              )}
              
              {node.error && (
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-3 border-2 border-red-200">
                  <p className="text-red-600 text-[10px] mb-2 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Error Details
                  </p>
                  <p className="text-red-700 text-xs leading-relaxed font-semibold">{node.error}</p>
                </div>
              )}
            </div>
            
            {/* Arrow pointer */}
            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
              <div className="w-5 h-5 bg-white rotate-45 border-l-2 border-t-2 border-gray-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
