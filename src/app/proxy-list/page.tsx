
'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getAllModemStatuses, ModemStatus } from '@/services/network-service';
import { getProxyConfig, ProxyConfig } from '@/services/proxy-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCopy, KeyRound, ListChecks, AlertTriangle, Info, Copy, NetworkIcon, Binary, User, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DisplayProxy extends ModemStatus {
  config: ProxyConfig | null;
}

interface FormattedProxy {
  id: string;
  name: string;
  interfaceName: string;
  proxyString: string;
  type: '3proxy';
  ipAddress: string;
  port: number;
  username: string;
  password?: string;
}

export default function ProxyListPage() {
  const [formattedProxies, setFormattedProxies] = useState<FormattedProxy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAndFormatProxies = useCallback(async () => {
    setIsLoading(true);
    try {
      const modemStatuses = await getAllModemStatuses();
      const proxiesWithDetails: DisplayProxy[] = await Promise.all(
        modemStatuses.map(async (modem) => {
          const config = await getProxyConfig(modem.interfaceName);
          return { ...modem, config };
        })
      );

      const filteredAndFormatted = proxiesWithDetails
        .filter(p =>
            p.status === 'connected' &&
            p.proxyStatus === 'running' &&
            p.config &&
            p.config.username && p.config.username.trim() !== '' &&
            p.config.password && p.config.password.trim() !== '' &&
            p.ipAddress // Ensure modem's IP address is available as a base
        )
        .map(p => {
          const port = p.config!.port;
          const username = p.config!.username!;
          const password = p.config!.password!;
          // The IP address from the modem status is the single source of truth,
          // as the backend script writes the proxy config using this IP.
          const ip = p.ipAddress!;

          return {
            id: p.id,
            name: p.name,
            interfaceName: p.interfaceName,
            proxyString: `${ip}:${port}:${username}:${password}`,
            type: p.config!.type,
            ipAddress: ip,
            port: port,
            username: username,
            password: password,
          };
        });

      setFormattedProxies(filteredAndFormatted);

    } catch (error) {
      console.error("Failed to fetch or format proxies:", error);
      toast({ title: "Error", description: "Could not load proxy list.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAndFormatProxies();
  }, [fetchAndFormatProxies]);

  const handleCopyToClipboard = (text: string | number | undefined, label: string, proxyName: string) => {
    if (text === undefined || text === null) {
      toast({ title: "Nothing to Copy", description: `${label} is not set for ${proxyName}.`, variant: "destructive" });
      return;
    }
    const textToCopy = String(text);
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast({ title: "Copied to Clipboard", description: `${label} for ${proxyName} copied.` });
      })
      .catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <>
      <PageHeader
        title="Authenticated Proxy List"
        description="List of currently active and authenticated proxies ready for use."
        actions={
          <Button onClick={fetchAndFormatProxies} disabled={isLoading} variant="outline">
            <ListChecks className="mr-2 h-4 w-4" />
            Refresh List
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[220px] w-full rounded-lg" />)}
        </div>
      ) : formattedProxies.length === 0 ? (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-6 w-6 text-blue-500" />
              No Active Proxies Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              There are currently no proxies that are both connected and running with valid credentials.
            </p>
            <p className="text-muted-foreground mt-2">
              To see proxies here, please ensure:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
              <li>A modem is connected and shows a 'connected' status on the "Modem Status" page.</li>
              <li>The proxy server for that modem is 'running' on the "Proxy Control" page.</li>
              <li>The backend has successfully generated credentials for the proxy.</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {formattedProxies.map((proxy) => (
            <Card key={proxy.id} className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">{proxy.name}
                    <Badge variant="outline" className="border-blue-400 text-blue-600">SOCKS5</Badge>
                    <Badge variant="outline" className="border-green-400 text-green-600">HTTP</Badge>
                  </CardTitle>
                  <KeyRound className="h-5 w-5 text-green-500" />
                </div>
                <CardDescription>Interface: {proxy.interfaceName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm font-mono">
                  <code className="truncate" title={proxy.proxyString}>{proxy.proxyString}</code>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <ClipboardCopy className="h-4 w-4" />
                        <span className="sr-only">Copy options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopyToClipboard(proxy.proxyString, "Full String", proxy.name)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Full String
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyToClipboard(proxy.ipAddress, "IP Address", proxy.name)}>
                        <NetworkIcon className="mr-2 h-4 w-4" /> Copy IP
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyToClipboard(proxy.port, "Port", proxy.name)}>
                         <Binary className="mr-2 h-4 w-4" /> Copy Port
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyToClipboard(proxy.username, "Username", proxy.name)}>
                         <User className="mr-2 h-4 w-4" /> Copy Username
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyToClipboard(proxy.password, "Password", proxy.name)}>
                         <Lock className="mr-2 h-4 w-4" /> Copy Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format: IP_Address:Port:Username:Password
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
       <Card className="mt-8 bg-accent/20 border-accent/50">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <AlertTriangle className="mr-2 h-5 w-5 text-accent-foreground/80" /> Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-accent-foreground/90 space-y-1">
            <p>This list shows proxies that are reported as 'connected' and 'running'. Credentials are automatically generated and managed by the backend.</p>
            <p>Usability depends on the correct configuration of your 3proxy service on the host system. Ensure the `backend_controller.py` has permission to write configs.</p>
          </CardContent>
        </Card>
    </>
  );
}
