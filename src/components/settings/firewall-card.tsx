
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUfwStatus, manageUfwRule, UfwStatus } from '@/services/system-service';
import { Shield, RefreshCw, PlusCircle, Trash2, Loader2, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export function FirewallCard() {
  const [status, setStatus] = useState<UfwStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isManagingRule, setIsManagingRule] = useState(false);
  const [newRule, setNewRule] = useState('');
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const ufwStatus = await getUfwStatus();
      setStatus(ufwStatus);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Error fetching UFW status", description: errorMessage, variant: "destructive" });
      setStatus({ active: false, rules: [`Error: ${errorMessage}`] });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggleFirewall = async (enable: boolean) => {
    setIsToggling(true);
    try {
      await manageUfwRule(enable ? 'enable' : 'disable', '');
      toast({ title: `Firewall ${enable ? 'Enabled' : 'Disabled'}`, description: 'Status may take a moment to update.' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Error toggling firewall", description: errorMessage, variant: "destructive" });
    } finally {
      setIsToggling(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule) {
      toast({ title: 'Invalid Rule', description: 'Rule cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsManagingRule(true);
    try {
      await manageUfwRule('allow', newRule);
      toast({ title: 'Rule Added', description: `Successfully added rule: allow ${newRule}` });
      setNewRule('');
      await fetchStatus();
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: 'Error Adding Rule', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsManagingRule(false);
    }
  };

  const handleDeleteRule = async (rule: string) => {
    setIsManagingRule(true);
    try {
      // The rule from `ufw show added` might be 'ufw allow 22/tcp'. We just need 'allow 22/tcp'.
      // The backend script is smart enough to handle `delete allow 22/tcp`.
      const ruleToDelete = rule.replace('ufw ', '').trim();
      await manageUfwRule('delete', ruleToDelete);
      toast({ title: 'Rule Deleted', description: `Successfully deleted rule: ${ruleToDelete}` });
      await fetchStatus();
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: 'Error Deleting Rule', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsManagingRule(false);
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center"><Shield className="mr-2 text-primary" />UFW Firewall Management</CardTitle>
            <Button onClick={fetchStatus} disabled={isLoading} variant="ghost" size="icon">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
        <CardDescription>View status and manage rules for Uncomplicated Firewall.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !status ? (
            <div className="flex items-center justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
            <>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="firewall-toggle" className="font-semibold text-base">Firewall Status</Label>
                        <Badge variant={status?.active ? 'default' : 'destructive'} className={status?.active ? 'bg-green-500/20 text-green-700 border-green-500' : ''}>
                           {status?.active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    {isToggling ? <Loader2 className="h-5 w-5 animate-spin"/> :
                        <Switch
                            id="firewall-toggle"
                            checked={status?.active}
                            onCheckedChange={handleToggleFirewall}
                            disabled={isToggling}
                            aria-label="Toggle Firewall"
                        />
                    }
                </div>

                <Separator/>

                <div className="space-y-2">
                    <Label className="text-base font-medium">Add 'allow' Rule</Label>
                    <div className="flex items-center space-x-2">
                        <Input
                            value={newRule}
                            onChange={(e) => setNewRule(e.target.value)}
                            placeholder="e.g., 9002/tcp or 30000:31000/tcp"
                            disabled={isManagingRule}
                        />
                        <Button onClick={handleAddRule} disabled={isManagingRule || !newRule.trim()} size="sm">
                           {isManagingRule ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Add Rule
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-base font-medium">Current Rules</Label>
                    <div className="p-3 bg-muted/50 rounded-lg max-h-60 overflow-y-auto font-mono text-sm space-y-2">
                       {status?.rules && status.rules.length > 0 ? status.rules.map((rule, index) => (
                           <div key={index} className="flex items-center justify-between bg-background p-2 rounded">
                               <span>{rule}</span>
                               <Button onClick={() => handleDeleteRule(rule)} disabled={isManagingRule} variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                   {isManagingRule ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                    <span className="sr-only">Delete rule</span>
                               </Button>
                           </div>
                       )) : (
                           <p className="text-center text-muted-foreground">No user-added rules found or UFW is inactive.</p>
                       )}
                    </div>
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
}
