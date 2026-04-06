'use client';

import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import { Calendar, Droplets, TrendingUp, Users } from 'lucide-react';

interface StatsCardProps {
  totalEvents: number;
  totalDrops: number;
  totalFCCDistributed: string;
  totalRecipients: number;
  isLoading?: boolean;
}

export function StatsCard({
  totalEvents,
  totalDrops,
  totalFCCDistributed,
  totalRecipients,
  isLoading,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Total Events',
      value: totalEvents,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Drops',
      value: totalDrops,
      icon: Droplets,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'FCC Distributed',
      value: formatNumber(totalFCCDistributed, 0),
      icon: TrendingUp,
      color: 'text-fishcake-500',
      bgColor: 'bg-fishcake-500/10',
      suffix: ' FCC',
    },
    {
      label: 'Recipients',
      value: totalRecipients,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`p-4 rounded-xl ${stat.bgColor} border border-${stat.color.replace('text-', '')}/20`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}{stat.suffix || ''}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
