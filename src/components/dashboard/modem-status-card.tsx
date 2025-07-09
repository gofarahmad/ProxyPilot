
'use client';

import type { ModemStatus } from '@/services/network-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, AlertCircle, Power, RefreshCw, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { rotateIp, getModemStatus as fetchModemStatus } from '@/services/network-service';
import { startProxy, stopProxy, restartProxy } from '@/services/proxy-service';
import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ModemStatusCardProps {
  initialModem: ModemStatus;
  onModemUpdate?: (modem: ModemStatus) => void;
}

export function ModemStatusCard({ initialModem, onModemUpdate }: ModemStatusCardProps) {
  const [modem, setModem] = useState<ModemStatus>(initialModem);
  const [isLoading, setIsLoading] = useState(false);
  const [isProxyLoading, setIsProxyLoading] = useState(false);
  const { toast } = useToast();

  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedStatus = await fetchModemStatus(modem.interfaceName);
      setModem(updatedStatus);
      if(onModemUpdate) onModemUpdate(updatedStatus);
    } catch (error) {
      toast({ title: 'Error', description: `Failed to refresh status for ${modem.name}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [modem.interfaceName, modem.name, toast, onModemUpdate]);
  
  useEffect(() => {
    // When initialModem changes (e.g. parent page refreshed), update local state
    setModem(initialModem);
  }, [initialModem]);


  const handleRotateIp = async () => {
    setIsLoading(true);
    try {
      await rotateIp(modem.interfaceName);
      toast({ title: 'IP Rotated', description: `IP for ${modem.name} has been rotated and proxy restarted.` });
      await refreshStatus(); // Refresh full status after rotation
    } catch (error) {
      toast({ title: 'Error Rotating IP', description: String(error), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProxyAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!modem.proxyType) return;
    setIsProxyLoading(true);
    try {
      let success = false;
      if (action === 'start') success = await startProxy(modem.interfaceName);
      else if (action === 'stop') success = await stopProxy(modem.interfaceName);
      else if (action === 'restart') success = await restartProxy(modem.interfaceName);
      
      toast({ title: `Proxy ${action}`, description: `${modem.proxyType} on ${modem.name} ${success ? action + 'ed' : 'failed to ' + action}.` });
      await refreshStatus(); // Refresh to get updated proxy status
    } catch (error) {
       toast({ title: `Error ${action}ing Proxy`, description: String(error), variant: 'destructive' });
    } finally {
      setIsProxyLoading(false);
    }
  };
  

  if (!modem) return <Skeleton className="h-[280px] w-full" />;

  const isConnected = modem.status === 'connected';
  const Icon = isConnected ? Wifi : modem.status === 'disconnected' ? WifiOff : AlertCircle;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{modem.name}</CardTitle>
          <Icon className={cn('h-6 w-6', isConnected ? 'text-green-500' : 'text-red-500')} />
        </div>
        <CardDescription>{modem.interfaceName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={isConnected ? 'default' : 'destructive'} className={cn(isConnected ? 'bg-green-500/20 text-green-700 border-green-500' : 'bg-red-500/20 text-red-700 border-red-500')}>
                {modem.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">IP Address:</span>
              <span className="text-sm">{modem.ipAddress || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Proxy ({modem.proxyType || 'N/A'}):</span>
              {modem.proxyType && (
                <Badge variant={modem.proxyStatus === 'running' ? 'default' : 'secondary'} 
                       className={cn(modem.proxyStatus === 'running' ? 'bg-blue-500/20 text-blue-700 border-blue-500' : 'bg-gray-500/20 text-gray-700 border-gray-500')}>
                  {modem.proxyStatus}
                </Badge>
              )}
            </div>
        </div>
        
        <div className="flex-grow"></div>

        <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleRotateIp} disabled={isLoading || !isConnected} size="sm" variant="outline">
                 {isLoading && !isProxyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                 Rotate IP
              </Button>
              <Button onClick={refreshStatus} disabled={isLoading} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
            {modem.proxyType && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button onClick={() => handleProxyAction('start')} disabled={isProxyLoading || modem.proxyStatus === 'running' || !isConnected} size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-100">
                  {isProxyLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Power className="mr-1 h-4 w-4" />} Start
                </Button>
                <Button onClick={() => handleProxyAction('stop')} disabled={isProxyLoading || modem.proxyStatus === 'stopped'} size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  {isProxyLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-1 h-4 w-4" />} Stop
                </Button>
                <Button onClick={() => handleProxyAction('restart')} disabled={isProxyLoading || !isConnected} size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                  {isProxyLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />} Restart
                </Button>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

    