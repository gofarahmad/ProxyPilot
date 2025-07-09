
'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Play, StopCircle, RefreshCw, Loader2, ServerCrash, ShieldQuestion, Waypoints, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { ModemStatus } from '@/services/network-service';
import { getAllModemStatuses } from '@/services/network-service';
import { startProxy, stopProxy, restartProxy, getProxyConfig } from '@/services/proxy-service';
import { startTunnel, stopTunnel, getTunnelStatus, TunnelStatus } from '@/services/tunnel-service';

interface ProxyInstance extends ModemStatus {
  proxyLoading: boolean;
  tunnelLoading: boolean;
  port?: number;
  tunnel?: TunnelStatus | null;
}

export default function ProxyControlPage() {
  const [proxies, setProxies] = useState<ProxyInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProxiesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const modemData = await getAllModemStatuses();
      
      const proxiesWithDetails = await Promise.all(
        modemData.map(async (m) => {
          const config = await getProxyConfig(m.interfaceName);
          const tunnelId = `tunnel_${m.interfaceName}`;
          const tunnel = await getTunnelStatus(tunnelId);
          return { 
            ...m, 
            proxyLoading: false, 
            tunnelLoading: false,
            port: config?.port,
            tunnel: tunnel 
          };
        })
      );
      
      setProxies(proxiesWithDetails);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast({ title: 'Error fetching proxies', description: errorMessage, variant: 'destructive' });
      setError("Could not load proxy data. Please ensure the backend service and ModemManager are running correctly.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProxiesData();
  }, [fetchProxiesData]);

  const handleProxyAction = async (interfaceName: string, action: 'start' | 'stop' | 'restart') => {
    setProxies(prev => prev.map(p => p.interfaceName === interfaceName ? { ...p, proxyLoading: true } : p));
    
    try {
      let success = false;
      if (action === 'start') success = await startProxy(interfaceName);
      else if (action === 'stop') success = await stopProxy(interfaceName);
      else success = await restartProxy(interfaceName);

      toast({
        title: `Proxy ${action} ${success ? 'Succeeded' : 'Failed'}`,
        description: `3proxy on ${interfaceName} ${success ? 'was ' + action + 'ed.' : 'failed to ' + action + '.'}`,
        variant: success ? 'default' : 'destructive',
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a moment for service to update
      await fetchProxiesData();

    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: `Error ${action}ing proxy`, description: errorMessage, variant: 'destructive' });
      setProxies(prev => prev.map(p => p.interfaceName === interfaceName ? { ...p, proxyLoading: false } : p));
    }
  };

  const handleTunnelAction = async (proxy: ProxyInstance, action: 'start' | 'stop') => {
      if (!proxy.port) {
          toast({ title: "Cannot Start Tunnel", description: "Proxy port is not configured.", variant: "destructive" });
          return;
      }
      setProxies(prev => prev.map(p => p.interfaceName === proxy.interfaceName ? { ...p, tunnelLoading: true } : p));
      
      const tunnelId = `tunnel_${proxy.interfaceName}`;
      try {
          if (action === 'start') {
              await startTunnel(tunnelId, proxy.port);
          } else {
              await stopTunnel(tunnelId);
          }
          toast({
              title: `Tunnel ${action} Succeeded`,
              description: `Tunnel for proxy on ${proxy.interfaceName} has been ${action}ed.`
          });
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for tunnel state to update
          await fetchProxiesData();
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
          toast({ title: `Error ${action}ing tunnel`, description: errorMessage, variant: "destructive" });
          setProxies(prev => prev.map(p => p.interfaceName === proxy.interfaceName ? { ...p, tunnelLoading: false } : p));
      }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[340px] w-full rounded-lg" />)}
        </div>
      );
    }

    if(error) {
       return (
         <div className="text-center py-10 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <p className="text-xl text-destructive/90 font-semibold">Could not load proxies</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{error}</p>
          </div>
       );
    }
    
    if (proxies.length === 0) {
      return (
         <div className="text-center py-10">
            <ShieldQuestion className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No proxy instances found.</p>
            <p className="text-sm text-muted-foreground mt-2">Ensure modems are connected to see them here.</p>
          </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proxies.map((proxy) => (
          <Card key={proxy.interfaceName} className="shadow-md flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">3proxy on {proxy.name}</CardTitle>
                <Network className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>IF: {proxy.interfaceName} | IP: {proxy.ipAddress || 'N/A'} | Port: {proxy.port || 'N/A'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Proxy Status:</span>
                  <Badge variant={proxy.proxyStatus === 'running' ? 'default' : (proxy.proxyStatus === 'stopped' ? 'secondary' : 'destructive')}
                    className={`
                      ${proxy.proxyStatus === 'running' ? 'bg-green-500/20 text-green-700 border-green-500' : ''}
                      ${proxy.proxyStatus === 'stopped' ? 'bg-gray-500/20 text-gray-700 border-gray-500' : ''}
                      ${proxy.proxyStatus === 'error' ? 'bg-red-500/20 text-red-700 border-red-500' : ''}
                    `}
                  >
                    {proxy.proxyStatus === 'error' ? <ServerCrash className="inline mr-1 h-4 w-4" /> : null}
                    {proxy.proxyStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium">Tunnel Status:</span>
                  <Badge variant={proxy.tunnel?.status === 'active' ? 'default' : 'secondary'}
                      className={`
                      ${proxy.tunnel?.status === 'active' ? 'bg-purple-500/20 text-purple-700 border-purple-500' : 'bg-gray-500/20 text-gray-700 border-gray-500'}
                    `}
                  >
                    <Waypoints className="inline mr-1 h-4 w-4" />
                    {proxy.tunnel?.status || 'inactive'}
                  </Badge>
                </div>
                {proxy.tunnel?.url && (
                   <p className="text-xs text-muted-foreground truncate pt-1">
                    URL: <span className="font-mono text-foreground">{proxy.tunnel.url}</span>
                   </p>
                )}
              </div>
              
              <div className="space-y-2 pt-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={() => handleProxyAction(proxy.interfaceName, 'start')} 
                    disabled={proxy.proxyLoading || proxy.proxyStatus === 'running' || proxy.status !== 'connected'}
                    size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-100"
                    title={proxy.status !== 'connected' ? 'Modem not connected' : ''}
                  >
                    {proxy.proxyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start
                  </Button>
                  <Button 
                    onClick={() => handleProxyAction(proxy.interfaceName, 'stop')} 
                    disabled={proxy.proxyLoading || proxy.proxyStatus === 'stopped'}
                    size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    {proxy.proxyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />} Stop
                  </Button>
                  <Button 
                    onClick={() => handleProxyAction(proxy.interfaceName, 'restart')} 
                    disabled={proxy.proxyLoading || proxy.status !== 'connected'}
                    size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    title={proxy.status !== 'connected' ? 'Modem not connected' : ''}
                  >
                   {proxy.proxyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Restart
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button 
                    onClick={() => handleTunnelAction(proxy, 'start')} 
                    disabled={proxy.tunnelLoading || proxy.tunnel?.status === 'active' || proxy.proxyStatus !== 'running'}
                    size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"
                    title={proxy.proxyStatus !== 'running' ? 'Proxy must be running to start tunnel' : ''}
                  >
                    {proxy.tunnelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start Tunnel
                  </Button>
                  <Button 
                    onClick={() => handleTunnelAction(proxy, 'stop')} 
                    disabled={proxy.tunnelLoading || proxy.tunnel?.status !== 'active'}
                    size="sm" variant="destructive"
                  >
                   {proxy.tunnelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />} Stop Tunnel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Proxy Control"
        description="Start, stop, and manage your 3proxy servers and their internet tunnels."
        actions={
          <Button onClick={fetchProxiesData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        }
      />
      {renderContent()}
    </>
  );
}

    