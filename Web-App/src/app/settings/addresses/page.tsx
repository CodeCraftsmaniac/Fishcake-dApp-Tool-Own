'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui';
import { useAddressBookStore } from '@/lib/stores';
import { isValidAddress, formatAddress, copyToClipboard } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Copy, Check, Users, Edit2, X } from 'lucide-react';

export default function AddressBookPage() {
  const { entries, addEntry, removeEntry, updateEntry } = useAddressBookStore();
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Handle add
  const handleAdd = () => {
    if (!isValidAddress(newAddress)) return;
    
    const existingEntry = entries.find(
      (e) => e.address.toLowerCase() === newAddress.toLowerCase()
    );
    if (existingEntry) return;

    addEntry({
      address: newAddress,
      label: newLabel || `Address ${entries.length + 1}`,
      addedAt: Date.now(),
    });

    setNewAddress('');
    setNewLabel('');
    setShowAddForm(false);
  };

  // Handle copy
  const handleCopy = async (address: string) => {
    await copyToClipboard(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Handle edit
  const startEdit = (address: string, label: string) => {
    setEditingAddress(address);
    setEditLabel(label);
  };

  const saveEdit = () => {
    if (editingAddress && editLabel) {
      updateEntry(editingAddress, editLabel);
    }
    setEditingAddress(null);
    setEditLabel('');
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Address Book</h1>
            <p className="text-muted-foreground">
              Manage your saved addresses for drops
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Address</label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                  error={newAddress ? !isValidAddress(newAddress) : false}
                />
                {newAddress && !isValidAddress(newAddress) && (
                  <p className="text-xs text-red-500 mt-1">Invalid address format</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Label (optional)</label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., My Wallet, Friend's Address"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAdd}
                  disabled={!isValidAddress(newAddress)}
                  className="flex-1"
                >
                  Add Address
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAddress('');
                    setNewLabel('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Saved Addresses
              </CardTitle>
              <Badge variant="secondary">{entries.length} addresses</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No saved addresses</p>
                <p className="text-sm">Add addresses to quickly use them for drops</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.address}
                    className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    {editingAddress === entry.address ? (
                      // Edit mode
                      <div className="flex items-center gap-2">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingAddress(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{entry.label}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {formatAddress(entry.address, 10)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(entry.address)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedAddress === entry.address ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(entry.address, entry.label)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry(entry.address)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Add Common Addresses */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Add</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Paste multiple addresses (one per line) to add them quickly:
            </p>
            <textarea
              className="w-full h-32 p-3 rounded-lg bg-secondary border border-border font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0x1234...
0x5678...
0x9abc..."
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const textarea = document.querySelector('textarea');
                if (!textarea) return;
                
                const lines = textarea.value.split('\n').filter((l) => l.trim());
                let added = 0;
                
                for (const line of lines) {
                  const address = line.trim();
                  if (isValidAddress(address)) {
                    const exists = entries.some(
                      (e) => e.address.toLowerCase() === address.toLowerCase()
                    );
                    if (!exists) {
                      addEntry({
                        address,
                        label: `Address ${entries.length + added + 1}`,
                        addedAt: Date.now(),
                      });
                      added++;
                    }
                  }
                }
                
                if (added > 0) {
                  textarea.value = '';
                }
              }}
            >
              Import Addresses
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
