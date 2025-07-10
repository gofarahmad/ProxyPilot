
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TunnelTable } from '@/components/settings/tunnel-table';
import { Waypoints } from 'lucide-react';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage global application settings and view tunnel configurations."
      />
      <div className="grid gap-6">
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                <Waypoints className="mr-2 h-6 w-6 text-primary"/>
                Active Tunnels
            </CardTitle>
            <CardDescription>
              View all currently active Ngrok or Cloudflare tunnels. Tunnels can be started or stopped from the "Proxy Control" page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TunnelTable />
          </CardContent>
        </Card>
        {/* Future settings cards can be added here */}
      </div>
    </>
  );
}
