
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
    const result = results[0];
    if (!result.success) {
      throw new Error(result.error || 'The Python script reported an execution error.');
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


// This function is used by the AI flow
export async function rebindProxy(interfaceName: string, newIp: string): Promise<boolean> {
  // In a real scenario, this would involve reconfiguring 3proxy with the new IP
  // and then restarting it. The Python script should be updated to handle this.
  // For now, a simple restart is performed.
  console.log(`[Service] Rebinding proxy on ${interfaceName} to ${newIp}. Restarting service.`);
  await restartProxy(interfaceName);
  return true;
}

export async function startProxy(interfaceName: string): Promise<boolean> {
  await runPythonScript(['start', interfaceName]);
  return true;
}

export async function stopProxy(interfaceName: string): Promise<boolean> {
  await runPythonScript(['stop', interfaceName]);
  return true;
}

export async function restartProxy(interfaceName: string): Promise<boolean> {
  await runPythonScript(['restart', interfaceName]);
  return true;
}

export interface ProxyConfig {
    port: number;
    bindIp?: string; // Bind IP can be managed by the backend script
    type: '3proxy';
    username?: string;
    password?: string;
}

// Configuration is now fully managed by the Python script via a JSON file.

export async function getProxyConfig(interfaceName: string): Promise<ProxyConfig | null> {
    const allConfigs = await runPythonScript(['get_all_configs']);
    return allConfigs[interfaceName] || null;
}

/**
 * Updates a part of the proxy configuration.
 * Note: This is now mainly used for non-auto-generated fields like data limits.
 * The core config (port, user, pass) is handled automatically by the backend.
 */
export async function updateProxyConfig(interfaceName: string, config: Partial<Omit<ProxyConfig, 'type'>>): Promise<boolean> {
    await runPythonScript(['update_config', interfaceName, JSON.stringify(config)]);
    return true;
}
