import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, ShieldCheck, ShieldX, Terminal } from 'lucide-react';

export default function SecurityPage() {
  const alerts = [
    { id: 1, type: 'warning', title: 'Unusual Login Attempt', description: 'An unusual login attempt was detected from IP 123.45.67.89 on SOCKS5 proxy (ppp1).', timestamp: new Date(Date.now() - 1000 * 60 * 30).toLocaleString() },
    { id: 2, type: 'info', title: 'Firewall Rule Updated', description: 'Firewall rule to block port 22 externally was successfully applied.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toLocaleString() },
    { id: 3, type: 'error', title: 'Potential Brute-force Attack', description: 'Multiple failed connection attempts on TinyProxy (ppp0). Source IP temporarily blocked.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toLocaleString() },
  ];

  return (
    <>
      <PageHeader
        title="Security Center"
        description="Monitor security alerts, manage firewall rules, and review access controls."
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-red-500" />
              Active Security Alerts
            </CardTitle>
            <CardDescription>
              Review and address any potential security issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
                <ShieldCheck className="h-12 w-12 text-green-500 mb-3" />
                <p className="text-lg font-medium">No active alerts.</p>
                <p className="text-sm text-muted-foreground">Your system seems secure at the moment.</p>
              </div>
            ) : (
              alerts.map(alert => (
                <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : (alert.type === 'warning' ? 'default' : 'default')} 
                       className={alert.type === 'warning' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-700 [&>svg]:text-yellow-500' : ''}>
                  {alert.type === 'error' ? <ShieldX className="h-4 w-4" /> : alert.type === 'warning' ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
                  <AlertDescription>
                    {alert.description} <br />
                    <span className="text-xs text-muted-foreground">({alert.timestamp})</span>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p> Regularly update your system and proxy server software.</p>
            <p> Use strong, unique passwords for any authenticated services.</p>
            <p> Configure firewall rules to restrict access only to necessary IPs and ports.</p>
            <p> Monitor logs for suspicious activity.</p>
            <p> Ensure tunnels (Ngrok/Cloudflare) are secured, e.g., with authentication if possible.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
