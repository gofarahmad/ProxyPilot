
'use client';

import { PageHeader } from '@/components/page-header';
import { FirewallCard } from '@/components/settings/firewall-card';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="System Settings"
        description="Manage global system configurations and security settings."
      />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <FirewallCard />
        {/* Other settings cards can be added here in the future */}
      </div>
    </>
  );
}
