'use client';

import { useEffect, useRef, useState } from 'react';
import { useMiningStore, WorkflowNode, WorkflowNodeStatus } from '@/lib/stores/miningStore';
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
  ArrowRight
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

export function WorkflowCanvas() {
  const { workflowNodes, isAutomationRunning, currentEvent } = useMiningStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Visual Workflow</h3>
            <p className="text-sm text-muted-foreground">
              Real-time automation execution status
            </p>
          </div>
          {currentEvent && (
            <div className="text-sm">
              <span className="text-muted-foreground">Current Event: </span>
              <span className="font-mono text-fishcake-400">
                #{currentEvent.chainEventId || 'Creating...'}
              </span>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          className="relative overflow-x-auto bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-xl border border-border p-8"
          style={{ minHeight: '220px' }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:20px_20px]" />
          </div>

          {/* SVG Connections */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            width="1250"
            height="200"
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
              const fromNode = workflowNodes.find(n => n.id === conn.from);
              const toNode = workflowNodes.find(n => n.id === conn.to);
              
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
              height: '180px'
            }}
          >
            {workflowNodes.map((node) => (
              <WorkflowNodeComponent
                key={node.id}
                node={node}
                position={nodePositions[node.id]}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-muted-foreground">Running</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Failed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowNodeComponent({ 
  node, 
  position 
}: { 
  node: WorkflowNode; 
  position: NodePosition;
}) {
  const Icon = nodeIcons[node.type] || Calendar;
  const StatusIcon = statusIcons[node.status];

  return (
    <div
      className={`absolute flex flex-col items-center transition-all duration-300`}
      style={{ 
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 0)'
      }}
    >
      {/* Node Box */}
      <div
        className={`relative w-[100px] h-[60px] rounded-xl bg-gradient-to-br ${nodeColors[node.status]} border-2 flex items-center justify-center transition-all duration-300 ${
          node.status === 'running' ? 'shadow-lg shadow-blue-500/30' : ''
        }`}
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
      </div>

      {/* Label */}
      <span className={`mt-2 text-xs font-medium text-center max-w-[120px] ${
        node.status === 'running' ? 'text-blue-400' :
        node.status === 'completed' ? 'text-green-400' :
        node.status === 'failed' ? 'text-red-400' :
        'text-muted-foreground'
      }`}>
        {node.label}
      </span>

      {/* Duration */}
      {node.completedAt && node.startedAt && (
        <span className="text-[10px] text-muted-foreground">
          {((node.completedAt - node.startedAt) / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}
