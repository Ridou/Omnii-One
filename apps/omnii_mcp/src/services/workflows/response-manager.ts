import { ExecutionContextType } from "../../types/action-planning.types";
import { StepResult } from "../../types/action-planning.types";
import twilioService from "../integrations/twilio-service";

export class ResponseManager {
  /**
   * Send response through appropriate channel
   */
  async sendResponse(
    message: string,
    userId: string,
    context: ExecutionContextType,
    success: boolean = true,
    error?: string
  ): Promise<void> {
    const formattedMessage = this.formatResponse(message, success, error);

    if (context === ExecutionContextType.WEBSOCKET) {
      // WebSocket responses are handled by the WebSocketHandler
      return;
    }

    // For SMS, send via Twilio
    try {
      await twilioService.sendMessage({
        to: userId,
        body: formattedMessage,
      });
      console.log(`[ResponseManager] ✅ Sent SMS response to ${userId}`);
    } catch (error) {
      console.error(`[ResponseManager] ❌ Failed to send SMS response:`, error);
    }
  }

  /**
   * Format step results into a unified response
   */
  formatStepResults(stepResults: StepResult[]): string {
    let response = "";

    // Group steps by success/failure
    const successfulSteps = stepResults.filter((r) => r.success);
    const failedSteps = stepResults.filter((r) => !r.success);

    // Add successful steps
    if (successfulSteps.length > 0) {
      response += "✅ Completed:\n";
      successfulSteps.forEach((step) => {
        response += `• ${step.description}\n`;
        if (step.message) {
          response += `  ${step.message}\n`;
        }
      });
      response += "\n";
    }

    // Add failed steps
    if (failedSteps.length > 0) {
      response += "❌ Failed:\n";
      failedSteps.forEach((step) => {
        response += `• ${step.description}\n`;
        if (step.error) {
          response += `  Error: ${step.error}\n`;
        }
      });
      response += "\n";
    }

    // Add summary
    response += `🎉 ${successfulSteps.length} completed, ${failedSteps.length} failed`;

    return response;
  }

  /**
   * Format a single response message
   */
  private formatResponse(
    message: string,
    success: boolean,
    error?: string
  ): string {
    let response = success ? "✅ " : "❌ ";
    response += message;

    if (error) {
      response += `\nError: ${error}`;
    }

    return response;
  }
}

// Default export for singleton pattern
const responseManager = new ResponseManager();
export default responseManager;
