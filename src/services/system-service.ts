
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
      throw new Error(result.error || 'The Python script reported an execution error.');
    }
    return result.data; // Return the 'data' part of the result
  } catch (error) {
    console.error('PythonShell Error:', error);
    if (error instanceof Error) {
        throw new Error(`Backend script failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while executing the backend script.');
  }
}

export interface UfwStatus {
    active: boolean;
    rules: string[];
}

export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
}

/**
 * Gets the status of the UFW firewall, including whether it's active and the list of rules.
 * @returns A promise that resolves to the UFW status object.
 */
export async function getUfwStatus(): Promise<UfwStatus> {
    return await runPythonScript(['get_ufw_status']);
}

/**
 * Manages UFW firewall. Can be used to enable/disable the firewall or add/delete rules.
 * @param action The action to perform: 'enable', 'disable', 'allow', 'delete'.
 * @param rule The rule to manage (e.g., '9002/tcp' or 'allow 22/tcp'). Required for 'allow' and 'delete'.
 * @returns A promise that resolves to true if the action was successful.
 */
export async function manageUfwRule(action: 'enable' | 'disable' | 'allow' | 'delete', rule: string): Promise<boolean> {
    const command = action === 'delete' ? rule : `${action} ${rule}`.trim();
    await runPythonScript(['manage_ufw_rule', action, rule]);
    return true;
}

/**
 * Fetches the latest system logs from the backend.
 * @returns A promise that resolves to an array of log entries.
 */
export async function getSystemLogs(): Promise<LogEntry[]> {
    return await runPythonScript(['get_logs']);
}
