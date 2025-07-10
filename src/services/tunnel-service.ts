
'use server';

// This service now simulates a real-world tunnel provider that is managed by the backend.

export interface TunnelStatus {
  id: string; // e.g., 'tunnel_ppp0'
  type: 'Ngrok' | 'Cloudflare';
  status: 'active' | 'inactive' | 'error';
  url: string | null;
  localPort: number; // The local proxy port it's connected to
}

// In-memory store to simulate tunnel states. In a real app, this would be managed by a process manager.
let tunnelData: Record<string, TunnelStatus> = {};

export async function getTunnelStatus(tunnelId: string): Promise<TunnelStatus | null> {
  await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network latency
  return tunnelData[tunnelId] || null;
}

export async function getAllTunnelStatuses(): Promise<TunnelStatus[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return Object.values(tunnelData);
}

/**
 * Starts a tunnel for a specific local port.
 * In a real backend, this would execute `ngrok tcp <localPort>` or a similar command.
 * @param tunnelId A unique identifier for the tunnel, e.g., `tunnel_ppp0`
 * @param localPort The local port the tunnel should expose.
 * @returns A promise resolving to true if successful.
 */
export async function startTunnel(tunnelId: string, localPort: number): Promise<boolean> {
  console.log(`[Service] Simulating start of tunnel ${tunnelId} for port ${localPort}`);
  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate time to establish connection

  // For this simulation, we'll default to Ngrok
  const type = 'Ngrok';
  tunnelData[tunnelId] = {
    id: tunnelId,
    type: type,
    status: 'active',
    url: `tcp://2.tcp.ngrok.io:${Math.floor(10000 + Math.random() * 9000)}`, // Simulate dynamic Ngrok URL
    localPort: localPort,
  };
  return true;
}

/**
 * Stops a tunnel.
 * In a real backend, this would find and kill the corresponding Ngrok process.
 * @param tunnelId The ID of the tunnel to stop.
 * @returns A promise resolving to true if successful.
 */
export async function stopTunnel(tunnelId: string): Promise<boolean> {
  console.log(`[Service] Simulating stop of tunnel ${tunnelId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  if (tunnelData[tunnelId]) {
    delete tunnelData[tunnelId];
    return true;
  }
  // If it doesn't exist, it's already "stopped", so we can return true.
  return true;
}

// NOTE: add, update, and delete are removed as tunnel management is now
// implicitly handled by the start/stop actions on the Proxy Control page.
// Tunnels are ephemeral and tied to a running proxy instance.
