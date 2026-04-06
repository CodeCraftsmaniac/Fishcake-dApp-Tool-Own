'use client';

import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { Zap, Calendar, Droplets, ArrowLeftRight, Sparkles, BookUser } from 'lucide-react';

const quickActions = [
  {
    href: '/events/create?quick=true',
    label: 'Quick Airdrop',
    description: 'Create event & drop instantly',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
  },
  {
    href: '/events/create',
    label: 'Create Event',
    description: 'Set up a new drop event',
    icon: Calendar,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
  },
  {
    href: '/drops',
    label: 'Drop Rewards',
    description: 'Send tokens to addresses',
    icon: Droplets,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
  },
  {
    href: '/swap',
    label: 'Buy/Sell FCC',
    description: 'Swap FCC ↔ USDT',
    icon: ArrowLeftRight,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
  },
  {
    href: '/nft',
    label: 'Mint NFT Pass',
    description: 'Get Basic or Pro pass',
    icon: Sparkles,
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
  },
  {
    href: '/settings/addresses',
    label: 'Address Book',
    description: 'Manage saved addresses',
    icon: BookUser,
    color: 'from-slate-500 to-zinc-500',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-500',
  },
];

export function QuickActionsCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <div className="group p-4 rounded-xl border border-border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
                  <div className={`h-10 w-10 rounded-lg ${action.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 ${action.textColor}`} />
                  </div>
                  <h4 className="font-medium text-sm">{action.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
