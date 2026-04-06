'use client';

import { useState } from 'react';
import { Card, CardContent, Button, Input, Badge } from '@/components/ui';
import { useMiningStore } from '@/lib/stores/miningStore';
import { 
  Settings2, 
  Save, 
  RefreshCw, 
  Info,
  Wallet,
  Coins,
  Clock,
  Zap,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function MiningSettingsPage() {
  const { config, updateConfig } = useMiningStore();
  
  const [recipient1, setRecipient1] = useState(config.recipientAddress1 || '');
  const [recipient2, setRecipient2] = useState(config.recipientAddress2 || '');
  const [fccPerDrop, setFccPerDrop] = useState(config.fccPerRecipient || '12');
  const [offsetMinutes, setOffsetMinutes] = useState(config.offsetMinutes?.toString() || '5');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    updateConfig({
      recipientAddress1: recipient1,
      recipientAddress2: recipient2,
      fccPerRecipient: fccPerDrop,
      offsetMinutes: parseInt(offsetMinutes),
      totalFccPerEvent: (parseFloat(fccPerDrop) * 2).toString(),
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const handleReset = () => {
    setRecipient1(config.recipientAddress1 || '');
    setRecipient2(config.recipientAddress2 || '');
    setFccPerDrop(config.fccPerRecipient || '12');
    setOffsetMinutes(config.offsetMinutes?.toString() || '5');
  };

  const totalPerEvent = parseFloat(fccPerDrop) * 2;
  const rewardPerEvent = totalPerEvent * 0.25;

  return (
    <div className="space-y-6">
      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Drop Recipients Card */}
          <Card className="border-2 border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 tracking-tight">Drop Recipients</h3>
                    <p className="text-xs text-gray-600 font-semibold mt-0.5">Configure wallet addresses for FCC distribution</p>
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs">
                  2 Required
                </Badge>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">1</span>
                    Primary Recipient Address
                  </label>
                  <Input
                    value={recipient1}
                    onChange={(e) => setRecipient1(e.target.value)}
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                    className="font-mono text-xs h-11 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">2</span>
                    Secondary Recipient Address
                  </label>
                  <Input
                    value={recipient2}
                    onChange={(e) => setRecipient2(e.target.value)}
                    placeholder="0x8ba1f109551bD432803012645Ac136ddd64DBA72"
                    className="font-mono text-xs h-11 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Drop Configuration Card */}
          <Card className="border-2 border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 tracking-tight">Drop Configuration</h3>
                  <p className="text-xs text-gray-600 font-semibold mt-0.5">Set amount and timing parameters</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-orange-600" />
                    FCC Amount per Recipient
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={fccPerDrop}
                      onChange={(e) => setFccPerDrop(e.target.value)}
                      placeholder="12"
                      min="1"
                      className="text-sm h-11 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all pr-12 font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">FCC</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <ArrowRight className="w-3 h-3 text-orange-600" />
                    <p className="text-xs text-orange-800 font-bold">
                      Total: <span className="text-orange-600">{totalPerEvent} FCC</span> per event
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Cycle Offset
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={offsetMinutes}
                      onChange={(e) => setOffsetMinutes(e.target.value)}
                      placeholder="5"
                      min="0"
                      max="60"
                      className="text-sm h-11 bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all pr-16 font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">minutes</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <Info className="w-3 h-3 text-purple-600" />
                    <p className="text-xs text-purple-800 font-bold">
                      Delay before next cycle
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          
          {/* Combined Info Card */}
          <Card className="border-2 border-gray-200 bg-white shadow-sm h-full flex flex-col">
            <CardContent className="p-6 space-y-6 flex-1 flex flex-col">
              
              {/* Reward Calculator */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 tracking-tight">Reward Preview</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                    <p className="text-xs text-gray-600 font-bold mb-1">Total Drop Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{totalPerEvent} <span className="text-sm text-gray-600">FCC</span></p>
                  </div>
                  
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px w-8 bg-gradient-to-r from-transparent to-purple-300"></div>
                      <span className="text-xs font-bold text-purple-600">25% Reward</span>
                      <div className="h-px w-8 bg-gradient-to-l from-transparent to-purple-300"></div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 border-2 border-green-400 shadow-lg">
                    <p className="text-xs text-green-100 font-bold mb-1">Mining Reward</p>
                    <p className="text-2xl font-bold text-white">+{rewardPerEvent.toFixed(2)} <span className="text-sm text-green-100">FCC</span></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 font-semibold leading-relaxed">
                      Earn 25% of your total drops as mining rewards automatically
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-bold text-sm text-gray-900 tracking-tight">Important Notes</h4>
                </div>
                
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-gray-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 flex-shrink-0 mt-1.5"></span>
                    <span>Valid Polygon addresses required</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 flex-shrink-0 mt-1.5"></span>
                    <span>Sufficient FCC balance needed</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 flex-shrink-0 mt-1.5"></span>
                    <span>Changes apply to next cycle</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-gray-700 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 flex-shrink-0 mt-1.5"></span>
                    <span>Minimum: 12 FCC per recipient</span>
                  </li>
                </ul>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className="flex justify-end gap-3 pt-2">
        <Button 
          onClick={handleReset} 
          variant="outline"
          className="px-6 h-11 text-sm border-2 border-gray-200 hover:bg-gray-50 font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-8 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 h-11 text-sm text-white font-bold shadow-lg shadow-purple-200 hover:shadow-xl transition-all"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
