
'use server';
/**
 * @fileOverview Automatically detects IP address changes on modem interfaces and rebinds proxy servers.
 *
 * - autoProxyRebind - A function that initiates the automatic proxy rebinding process.
 * - AutoProxyRebindInput - The input type for the autoProxyRebind function (empty object).
 * - AutoProxyRebindOutput - The return type for the autoProxyRebind function (success boolean).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getCurrentIpAddress} from '@/services/network-service';
import {rebindProxy} from '@/services/proxy-service';

const AutoProxyRebindInputSchema = z.object({});
export type AutoProxyRebindInput = z.infer<typeof AutoProxyRebindInputSchema>;

const AutoProxyRebindOutputSchema = z.object({
  success: z.boolean().describe('Indicates whether the proxy rebinding was successful.'),
  message: z.string().optional().describe('Optional message providing details about the rebind attempt.'),
});
export type AutoProxyRebindOutput = z.infer<typeof AutoProxyRebindOutputSchema>;

export async function autoProxyRebind(input: AutoProxyRebindInput): Promise<AutoProxyRebindOutput> {
  try {
    console.log('[Server Action] autoProxyRebind called with input:', JSON.stringify(input));
    const result = await autoProxyRebindFlow(input);
    console.log('[Server Action] autoProxyRebindFlow result:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[Server Action] Unhandled error in autoProxyRebind server action:', error);
    let errorMessage = 'An unexpected error occurred in the server action.';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('[Server Action] Error stack:', error.stack);
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      try {
        errorMessage = `Non-standard error: ${JSON.stringify(error)}`;
      } catch (stringifyError) {
        console.error('[Server Action] Error stringifying non-standard error in server action:', stringifyError);
        errorMessage = 'A non-serializable, non-standard error occurred in the server action.';
      }
    }
    return {
      success: false,
      message: `Server Action Failed: ${errorMessage}`,
    };
  }
}

const getInterfaceIpTool = ai.defineTool({
  name: 'getInterfaceIp',
  description: 'Retrieves the current IP address of a specified network interface.',
  inputSchema: z.object({
    interfaceName: z.string().describe('The name of the network interface (e.g., ppp0, ppp1).'),
  }),
  outputSchema: z.string(),
}, async (input) => {
  console.log('[AI Tool] getInterfaceIpTool called with:', input);
  const ip = await getCurrentIpAddress(input.interfaceName);
  console.log('[AI Tool] getInterfaceIpTool result:', ip);
  return ip;
});

const rebindProxyTool = ai.defineTool({
  name: 'rebindProxy',
  description: 'Rebinds the proxy server to a new IP address.',
  inputSchema: z.object({
    interfaceName: z.string().describe('The name of the interface to bind.'),
    newIp: z.string().describe('The new IP address to bind the proxy to.'),
  }),
  outputSchema: z.boolean(),
}, async (input) => {
  console.log('[AI Tool] rebindProxyTool called with:', input);
  const success = await rebindProxy(input.interfaceName, input.newIp);
  console.log('[AI Tool] rebindProxyTool result:', success);
  return success;
});

const autoProxyRebindPrompt = ai.definePrompt({
  name: 'autoProxyRebindPrompt',
  input: {schema: AutoProxyRebindInputSchema},
  output: {schema: AutoProxyRebindOutputSchema},
  tools: [getInterfaceIpTool, rebindProxyTool],
  prompt: `You are an expert system administrator. Your task is to ensure continuous proxy service for the 'ppp0' interface.
1. Determine the current IP address of the 'ppp0' network interface using the available tools.
2. Rebind the proxy server on 'ppp0' to this new IP address using the available tools.
3. Report the success status and a message detailing the outcome, conforming to the required output format. For instance, if rebinding to IP 1.2.3.4 on ppp0 was successful, the message should reflect that. If it failed, the message should indicate failure. If a tool fails, report that failure.
`,
});

const autoProxyRebindFlow = ai.defineFlow(
  {
    name: 'autoProxyRebindFlow',
    inputSchema: AutoProxyRebindInputSchema,
    outputSchema: AutoProxyRebindOutputSchema,
  },
  async (input) => {
    try {
      console.log('[AI Flow] autoProxyRebindFlow started with input:', JSON.stringify(input));
      const {output: llmOutput} = await autoProxyRebindPrompt(input);
      console.log('[AI Flow] LLM raw output:', JSON.stringify(llmOutput));

      if (!llmOutput) {
        console.error('[AI Flow] LLM did not return any output.');
        return {
          success: false,
          message: 'AI agent failed to produce any response.',
        };
      }

      const parsedOutput = AutoProxyRebindOutputSchema.safeParse(llmOutput);

      if (!parsedOutput.success) {
        console.error('[AI Flow] LLM output failed schema validation:', parsedOutput.error.flatten());
        const fieldErrors = parsedOutput.error.flatten().fieldErrors;
        const errorMessages = Object.values(fieldErrors).flat().join(' ');
        return {
          success: false,
          message: `AI agent output was invalid: ${errorMessages || 'Schema validation failed.'}`,
        };
      }
      
      const finalMessage = parsedOutput.data.message ||
                       (parsedOutput.data.success
                         ? 'Proxy rebind process completed as per AI.'
                         : 'AI indicated an issue or did not provide a clear message.');

      const result = {
        success: parsedOutput.data.success,
        message: finalMessage,
      };
      console.log('[AI Flow] autoProxyRebindFlow processed result:', JSON.stringify(result));
      return result;

    } catch (error: any) {
      console.error('[AI Flow] Error during auto proxy rebind flow execution:', error);
      let errorMessage = 'Unknown error executing AI flow.';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('[AI Flow] Error stack:', error.stack);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        try {
          errorMessage = `Non-standard error: ${JSON.stringify(error)}`;
        } catch (stringifyError) {
          console.error('[AI Flow] Error stringifying non-standard error:', stringifyError);
          errorMessage = 'A non-serializable, non-standard error occurred in the AI flow.';
        }
      }
      return {
        success: false,
        message: `AI Flow Execution Failed: ${errorMessage}`,
      };
    }
  }
);
