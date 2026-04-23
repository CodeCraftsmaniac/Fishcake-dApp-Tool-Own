'use client';

import dynamic from 'next/dynamic';

const WorkflowCanvas = dynamic(
  () => import('@/components/mining/WorkflowCanvas').then(mod => ({ default: mod.WorkflowCanvas })),
  { 
    loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent" /></div>,
    ssr: false 
  }
);

export default function MiningWorkflowPage() {
  return <WorkflowCanvas />;
}
