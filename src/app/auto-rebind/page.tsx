import { PageHeader } from '@/components/page-header';
import { AutoRebindCard } from '@/components/dashboard/auto-rebind-card';

export default function AutoRebindPage() {
  return (
    <>
      <PageHeader
        title="Auto Proxy Rebind"
        description="Utilize AI to automatically detect IP changes on modem interfaces (e.g., ppp0) and rebind proxy servers (TinyProxy, Dante) to the new IP addresses."
      />
      <div className="max-w-md mx-auto">
        <AutoRebindCard />
      </div>
      <div className="mt-8 p-4 bg-accent/20 border border-accent/50 rounded-lg text-sm">
        <h3 className="font-semibold text-lg mb-2">How it works:</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>The system periodically (or on demand) checks the current IP address of specified modem interfaces.</li>
          <li>If an IP address change is detected, the AI flow attempts to rebind the relevant proxy services to the new IP.</li>
          <li>This helps ensure continuous proxy availability even with dynamic IP assignments from ISPs.</li>
          <li>The AI flow leverages tools to get current IPs and trigger proxy rebinding actions.</li>
        </ul>
      </div>
    </>
  );
}
