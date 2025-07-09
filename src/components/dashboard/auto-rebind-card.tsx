'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { autoProxyRebind, AutoProxyRebindOutput } from '@/ai/flows/auto-proxy-rebind';
import { useToast } from '@/hooks/use-toast';

export function AutoRebindCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AutoProxyRebindOutput | null>(null);
  const { toast } = useToast();

  const handleAutoRebind = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      // The input to autoProxyRebind is an empty object as per its schema
      const response = await autoProxyRebind({});
      setResult(response);
      toast({
        title: response.success ? 'Auto Rebind Successful' : 'Auto Rebind Failed',
        description: response.message || (response.success ? 'Proxy rebind completed.' : 'Could not rebind proxy.'),
        variant: response.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error("Auto rebind error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setResult({ success: false, message: `Client-side error: ${errorMessage}` });
      toast({
        title: 'Error Triggering Rebind',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Auto Proxy Rebind</CardTitle>
          <Zap className="h-6 w-6 text-yellow-500" />
        </div>
        <CardDescription>
          Automatically detect IP changes and rebind proxies using AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAutoRebind} disabled={isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Trigger Auto Rebind
        </Button>
        {result && (
          <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'} flex items-start`}>
            {result.success ? <CheckCircle2 className="h-5 w-5 mr-2 shrink-0" /> : <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />}
            <div>
                <p className="font-semibold">{result.success ? 'Success!' : 'Failed!'}</p>
                <p>{result.message || (result.success ? 'Proxy successfully reconfigured.' : 'Rebind process encountered an issue.')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
