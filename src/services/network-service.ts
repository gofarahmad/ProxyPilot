
'use server';

import { PythonShell } from 'python-shell';
import path from 'path';

// This helper function runs the Python script and returns the parsed JSON output.
async function runPythonScript(args: string[]): Promise<any> {
  const options = {
    mode: 'json' as const,
    pythonPath: 'python3', // Assumes python3 is in the system's PATH
    scriptPath: path.join(process.cwd(), 'src', 'services'),
    args: args,
  };

  try {
    const results = await PythonShell.run('backend_controller.py', options);
    // python-shell returns an array of results, we expect one JSON object.
    const result = results[0];
    if (!result.success) {
      // If the script itself reported an error, throw it.
      throw new Error(result.error || 'The Python script reported an execution error.');
    }
    return result.data;
  } catch (error) {
    console.error('PythonShell Error:', error);
    // Rethrow the error to be caught by the calling function.
    // This makes sure that errors from the script are propagated to the UI.
    if (error instanceof Error) {
        throw new Error(`Backend script failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while executing the backend script.');
  }
}


// This function is used by the AI flow
export async function getCurrentIpAddress(interfaceName: string): Promise<string> {
  console.log(`[Service] getCurrentIpAddress called for ${interfaceName}`);
  const allStatuses = await getAllModemStatuses();
  const modem = allStatuses.find(m => m.interfaceName === interfaceName);
  // In a real scenario, you'd want to handle the case where the modem is not found
  // or has no IP address. For AI, providing a fallback is reasonable.
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

/**
 * Rotates the IP for a given interface by reconnecting the modem.
 * This now also handles restarting the associated proxy service.
 * @param interfaceName The network interface of the modem (e.g., 'ppp0').
 * @returns The new IP address assigned to the modem.
 */
export async function rotateIp(interfaceName: string): Promise<string> {
    const result = await runPythonScript(['rotate_ip', interfaceName]);
    // The python script now returns the new IP in the result object
    return result.newIp;
}
