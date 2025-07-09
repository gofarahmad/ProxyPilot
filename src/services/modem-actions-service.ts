
'use server';
import { PythonShell } from 'python-shell';
import path from 'path';

// This helper function runs the Python script and returns the parsed JSON output.
async function runPythonScript(args: string[]): Promise<any> {
  const options = {
    mode: 'text' as const, // Use text mode to get the raw JSON string
    pythonPath: 'python3', // Assumes python3 is in the system's PATH
    scriptPath: path.join(process.cwd(), 'src', 'services'),
    args: args,
  };

  try {
    const results = await PythonShell.run('backend_controller.py', options);
    const result = JSON.parse(results[0]); // Manually parse the JSON output
    if (!result.success) {
      throw new Error(result.error || 'The Python script reported an execution error.');
    }
    return result; // Return the full result object which includes the 'data' or other keys
  } catch (error) {
    console.error('PythonShell Error:', error);
    // Propagate a user-friendly error message
    if (error instanceof Error) {
        throw new Error(`Backend script failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred while executing the backend script.');
  }
}


export interface SmsMessage {
    id: string;
    from: string;
    timestamp: string;
    content: string;
}

/**
 * Sends an SMS message via a modem interface.
 * @param interfaceName The modem interface (e.g., 'ppp0').
 * @param recipient The phone number of the recipient.
 * @param message The content of the SMS.
 * @returns A promise that resolves to an object indicating success and a message.
 */
export async function sendSms(interfaceName: string, recipient: string, message: string): Promise<{ success: boolean; message: string }> {
    const args = { recipient, message };
    const result = await runPythonScript(['send-sms', interfaceName, JSON.stringify(args)]);
    return { success: result.success, message: result.message };
}

/**
 * Reads all SMS messages from a modem interface.
 * @param interfaceName The modem interface (e.g., 'ppp0').
 * @returns A promise that resolves to an array of SMS messages.
 */
export async function readSms(interfaceName: string): Promise<SmsMessage[]> {
    const result = await runPythonScript(['read-sms', interfaceName, '{}']);
    return result.data;
}

/**
 * Sends a USSD command via a modem interface.
 * @param interfaceName The modem interface (e.g., 'ppp0').
 * @param ussdCode The USSD code to send (e.g., '*123#').
 * @returns A promise that resolves to an object indicating success and the response message.
 */
export async function sendUssd(interfaceName: string, ussdCode: string): Promise<{ success: boolean; response: string }> {
    const args = { ussdCode };
    const result = await runPythonScript(['send-ussd', interfaceName, JSON.stringify(args)]);
    return { success: result.success, response: result.response };
}

    