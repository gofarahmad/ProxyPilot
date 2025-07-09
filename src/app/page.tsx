

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Wifi, Network, RotateCcw, Zap, BarChart3, ShieldAlert, ListChecks, Smartphone, Settings } from 'lucide-react';
import Link from 'next/link';

const overviewCards = [
  { title: 'Dashboard', description: 'Tinjauan umum sistem Anda.', icon: LayoutDashboard, href: '/', color: 'text-indigo-500' },
  { title: 'Proxy List', description: 'Lihat proxy yang aktif dan dapat digunakan.', icon: ListChecks, href: '/proxy-list', color: 'text-teal-500' },
  { title: 'Modem Status', description: 'Monitor koneksi & IP modem.', icon: Wifi, href: '/modems', color: 'text-blue-500' },
  { title: 'Proxy Control', description: 'Kelola server 3proxy & tunnels.', icon: Network, href: '/proxies', color: 'text-green-500' },
  { title: 'Modem Control', description: 'Kirim SMS dan perintah USSD.', icon: Smartphone, href: '/modem-control', color: 'text-cyan-500' },
  { title: 'IP Rotation', description: 'Otomatiskan penggantian IP.', icon: RotateCcw, href: '/ip-rotation', color: 'text-orange-500' },
  { title: 'Auto Proxy Rebind', description: 'Deteksi IP & rebind dengan AI.', icon: Zap, href: '/auto-rebind', color: 'text-yellow-500' },
  { title: 'System Logs', description: 'Lihat log aktivitas dan error.', icon: BarChart3, href: '/logs', color: 'text-gray-500' },
  { title: 'Security Alerts', description: 'Periksa potensi ancaman.', icon: ShieldAlert, href: '/security', color: 'text-red-500' },
  { title: 'Settings', description: 'Konfigurasi sistem & firewall.', icon: Settings, href: '/settings', color: 'text-slate-500' },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Welcome to Proxy Pilot. Manage your network services efficiently."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.title} className="group">
              <Card className="transition-all duration-200 ease-in-out hover:shadow-lg hover:border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-semibold">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-6 w-6 ${card.color} group-hover:scale-110 transition-transform`} />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
    

    
