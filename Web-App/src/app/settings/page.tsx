'use client';

import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/ui';
import { useUIStore } from '@/lib/stores';
import { Settings, BookUser, Moon, Sun, Wallet, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();

  const settingsItems = [
    {
      href: '/settings/addresses',
      label: 'Address Book',
      description: 'Manage saved addresses for drops',
      icon: BookUser,
    },
    {
      href: '/wallet',
      label: 'Wallet',
      description: 'Manage connected wallet',
      icon: Wallet,
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your Fishcake experience
          </p>
        </div>

        {/* Theme Toggle */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings Links */}
        <div className="space-y-2">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Info */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-fishcake flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍥</span>
              </div>
              <p className="font-bold text-lg">Fishcake Web App</p>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Polygon Mainnet • Chain ID: 137
              </p>
              <div className="mt-4">
                <a
                  href="https://fishcake.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  fishcake.io
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
