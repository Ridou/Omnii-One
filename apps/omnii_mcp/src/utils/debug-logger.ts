import fs from 'fs';
import path from 'path';

interface ToolCallLog {
  timestamp: string;
  userId: string;
  actionName: string;
  inputParams: any;
  response: any;
  success: boolean;
  error?: string;
}

export class DebugLogger {
  private static logsDir = path.join(process.cwd(), 'debug-logs');

  static {
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  static async logToolCall(log: ToolCallLog): Promise<void> {
    try {
      const filename = `${log.actionName.toLowerCase()}-${Date.now()}.json`;
      const filepath = path.join(this.logsDir, filename);
      
      const logData = {
        ...log,
        timestamp: new Date().toISOString(),
        formattedTimestamp: new Date().toLocaleString(),
      };

      await fs.promises.writeFile(filepath, JSON.stringify(logData, null, 2));
      console.log(`[DebugLogger] 📁 Tool call logged to: ${filename}`);
    } catch (error) {
      console.error(`[DebugLogger] ❌ Failed to log tool call:`, error);
    }
  }

  static async logResponse(actionName: string, userId: string, response: any): Promise<void> {
    await this.logToolCall({
      timestamp: new Date().toISOString(),
      userId,
      actionName,
      inputParams: {},
      response,
      success: !!response.successful
    });
  }
} 