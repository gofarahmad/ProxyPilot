
'use server';

import { PythonShell } from 'python-shell';
import path from 'path';
import { ProxyConfig } from './proxy-service';

async function runPythonScript(args: string[]): Promise<any> {
  const options = {
    mode: 'text' as const,
    pythonPath: 'python3', 
    scriptPath: path.join(process.cwd(), 'src', 'services'),
    args: args,
  };

  try {
    const results = await PythonShell.run('backend_controller.py', options);
    const result = JSON.parse(results[0]);
    if (!result.success) {
      throw new Error(result.error || 'The Python script reported an unknown execution error.');
    }
    return result.data;
  } catch (error) {
    console.error('PythonShell Error:', error);
    if (error instanceof Error) {
        throw new Error(`Backend script failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while executing the backend script.');
  }
}

export async function getCurrentIpAddress(interfaceName: string): Promise<string> {
  console.log(`[Service] getCurrentIpAddress called for ${interfaceName}`);
  const allStatuses = await getAllModemStatuses();
  const modem = allStatuses.find(m => m.interfaceName === interfaceName);
  return modem?.ipAddress || '127.0.0.1'; // Default fallback
}

export interface ModemStatus {
  id: string;
  name: string;
  interfaceName: string;
  status: 'connected' | 'disconnected' | 'error';
  ipAddress: string | null;
  proxyType: '3proxy';
  proxyStatus: 'running' | 'stopped' | 'error';
  source: 'ip_addr' | 'mmcli_enhanced';
  bandwidth: {
    totalRx: string | null;
    totalTx: string | null;
    error?: string;
  }
}


export async function getModemStatus(interfaceName: string): Promise<ModemStatus> {
  const statuses = await getAllModemStatuses();
  const singleStatus = statuses.find(s => s.interfaceName === interfaceName);
  if (!singleStatus) {
    throw new Error(`Modem with interface ${interfaceName} not found.`);
  }
  return singleStatus;
}

export async function getAllModemStatuses(): Promise<ModemStatus[]> {
    return await runPythonScript(['get_all_modem_statuses']);
}

export async function rotateIp(interfaceName: string): Promise<string> {
    const result = await runPythonScript(['rotate_ip', interfaceName]);
    return result.newIp;
}

export async function updateProxyConfig(interfaceName: string, config: Partial<Pick<ProxyConfig, 'customName'>>): Promise<boolean> {
    await runPythonScript(['update_proxy_config', interfaceName, JSON.stringify(config)]);
    return true;
}
