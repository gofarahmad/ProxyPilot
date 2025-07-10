
'use server';

import { PythonShell } from 'python-shell';
import path from 'path';

// This helper function runs the Python script and returns the parsed JSON output.
async function runPythonScript(args: string[]): Promise<any> {
  const options = {
    mode: 'text' as const,
    pythonPath: 'python3', // Assumes python3 is in the system's PATH
    scriptPath: path.join(process.cwd(), 'src', 'services'),
    args: args,
  };

  try {
    const results = await PythonShell.run('backend_controller.py', options);
    const result = JSON.parse(results[0]);
    if (!result.success) {
      throw new Error(result.error || 'The Python script reported an unkown execution error.');
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
    bindIp?: string;
    type: '3proxy';
    username?: string;
    password?: string;
}

export async function getProxyConfig(interfaceName: string): Promise<ProxyConfig | null> {
    const allConfigs = await runPythonScript(['get_all_configs']);
    return allConfigs[interfaceName] || null;
}

export async function updateProxyConfig(interfaceName: string, config: Partial<Omit<ProxyConfig, 'type'>>): Promise<boolean> {
    await runPythonScript(['update_config', interfaceName, JSON.stringify(config)]);
    return true;
}
