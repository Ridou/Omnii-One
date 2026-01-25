// Bun loads .env files automatically - no dotenv package needed
// Environment validation happens on first import of env config

import './config/axios.config';

// ✅ CRITICAL: Validate environment configuration at startup (fail-fast)
import { env } from './config/env';

// Log validated environment mode
console.log(`Starting MCP backend in ${env.NODE_ENV} mode`);

// ✅ CRITICAL: Initialize Neo4j driver at startup
import { neo4jService } from './config/neo4j.config';

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { helmet } from "elysia-helmet";
import { swagger } from "@elysiajs/swagger";
import routes from "./routes";
import { EnhancedWebSocketHandler } from "./services/core/enhanced-websocket-handler";
import {
  WebSocketMessageType,
  WebSocketResponseStatus,
} from "./types/websocket.types";
import { 
  isValidUnifiedToolResponse, 
  validateUnifiedToolResponse,
  safeParseUnifiedToolResponse
} from "@omnii/validators";
import { logObjectStructure } from "./utils/object-structure";

// RAILWAY DEBUGGING - Add this at the very start
console.log("🚀 === RAILWAY STARTUP DEBUG ===");
console.log("🚀 Process starting...");
console.log("🚀 NODE_ENV:", process.env.NODE_ENV);
console.log("🚀 PORT:", process.env.PORT);
console.log("🚀 Working directory:", process.cwd());
console.log("🚀 Command line args:", process.argv);
console.log("🚀 Process PID:", process.pid);
console.log("🚀 Available memory:", process.memoryUsage());
console.log("🚀 RDF_PYTHON_SERVICE_URL:", process.env.RDF_PYTHON_SERVICE_URL || "not set (will use defaults)");
console.log("🚀 RAILWAY_ENVIRONMENT:", process.env.RAILWAY_ENVIRONMENT || "not set");
console.log("🚀 ===============================");

// ✅ CRITICAL: Initialize Neo4j HTTP client early in startup
console.log("🚀 Initializing Neo4j HTTP client...");
try {
  // neo4jService is imported above and will initialize on import
  console.log("✅ Neo4j HTTP client initialization triggered");
} catch (error) {
  console.error("❌ Neo4j HTTP client initialization failed:", error);
}

// ✅ CRITICAL: Initialize Direct Neo4j Service
console.log("🚀 Initializing Direct Neo4j Service...");
import { neo4jDirectService } from './services/neo4j';
console.log("✅ Direct Neo4j Service loaded");

const DEFAULT_PORT = 8000;

// Server readiness flag
let serverReady = false;

console.log("🚀 Creating Elysia app...");

// Create Elysia app
const app = new Elysia()
  // Add CORS - Support for WebSocket and React Native
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production' 
        ? true  // Allow all origins in production for Railway health checks
        : [
            "http://localhost:3000",
            "http://localhost:4173",
            "http://localhost:8000",
            "http://localhost:8081", // Expo Metro bundler
            "exp://localhost:8081",  // Expo development
            // Allow any localhost for React Native development
            /^http:\/\/localhost:\d+$/,
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network IPs
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,  // Local network IPs
          ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      // Add WebSocket and tRPC specific headers
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "x-trpc-source", // Required for tRPC client
        "x-user-id", // Required for tRPC client
        "Sec-WebSocket-Protocol",
        "Sec-WebSocket-Version",
        "Sec-WebSocket-Key",
        "Sec-WebSocket-Accept",
        "Connection",
        "Upgrade"
      ],
    })
  )
  // Add security headers
  .use(helmet())
  // Add request logging
  .onRequest(({ request }) => {
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const url = new URL(request.url);
    
    console.log(`📥 ${request.method} ${url.pathname} from ${clientIP}`);
    if (url.pathname === '/health') {
      console.log(`🩺 RAILWAY HEALTH CHECK? UA: ${userAgent.substring(0, 50)}`);
    }
  })
  // Add Swagger documentation
  .use(
    swagger({
      documentation: {
        info: {
          title: "Omnii MCP API",
          version: "1.0.0",
          description: "Omnii MCP API Documentation",
        },
        tags: [
          { name: "Neo4j", description: "Neo4j related endpoints" },
          { name: "SMS", description: "SMS related endpoints" },
        ],
      },
    })
  );

console.log("🚀 Elysia app created, setting up routes...");

// Health check endpoint
app.get("/health", ({ request, set }) => {
  const startTime = Date.now();
  const clientIP = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  console.log(`🏥 Health check called by: ${clientIP}, UA: ${userAgent}`);
  
  // Check if server is ready
  if (!serverReady) {
    console.log(`⚠️  Health check called but server not ready yet`);
    set.status = 503; // Service Unavailable
    return {
      status: "starting",
      service: "omnii-mcp",
      ready: false,
      message: "Server is starting up, please wait...",
      timestamp: new Date().toISOString(),
    };
  }
  
  const healthResponse = {
    status: "ok",
    service: "omnii-mcp",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    port: process.env.PORT || DEFAULT_PORT,
    host: "0.0.0.0",
    ready: true,
    responseTime: Date.now() - startTime,
    clientInfo: {
      ip: clientIP,
      userAgent: userAgent.substring(0, 100),
    }
  };
  
  console.log("🏥 Health check responding with:", JSON.stringify(healthResponse, null, 2));
  return healthResponse;
});

// Add WebSocket OPTIONS handler for preflight
app.options("/ws", ({ set }) => {
  console.log("🔧 WebSocket OPTIONS preflight request received");
  set.headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Sec-WebSocket-Protocol, Sec-WebSocket-Version, Sec-WebSocket-Key, Connection, Upgrade",
    "Access-Control-Allow-Credentials": "true"
  };
  return "";
});

// Add root endpoint
app.get("/", ({ request }) => {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  console.log(`🏠 Root endpoint called by: ${clientIP}, UA: ${userAgent}`);
  
  return {
    message: "OMNII MCP Server is running!",
    status: "ok", 
    health: "/health",
    websocket: "/ws",
    docs: "/swagger",
    services: {
      neo4j: "/api/neo4j",
      sms: "/api/sms", 
      rdf: "/api/rdf",
      trpc: "/api/trpc"
    },
    timestamp: new Date().toISOString(),
  };
});

console.log("🚀 Health and root endpoints configured, registering routes...");

// Register routes
app.use(routes);

console.log("🚀 Routes registered, initializing WebSocket handler...");

// Initialize services
const wsHandler = new EnhancedWebSocketHandler();

console.log("🚀 WebSocket handler initialized, setting up WebSocket endpoint...");

// Set up WebSocket endpoint
console.log("🔧 Setting up WebSocket endpoint at /ws");

app.ws("/ws", {
  open(ws) {
    console.log(`🔌 WebSocket client connected!`);
    console.log(`📊 Connection established for WebSocket client`);
  },

  message(ws, message) {
    console.log(`📨 WebSocket message received:`, message);
    console.log(`📝 Message type:`, typeof message);
    if (typeof message === "string") {
      console.log(`📏 Message length:`, message.length);
    }

    try {
      // Parse the message
      const parsedMessage =
        typeof message === "string" ? JSON.parse(message) : message;


      // Process with handler service (pass ws parameter)
      wsHandler
        .processMessage(parsedMessage, ws)
        .then((response) => {
          
          // ✅ CRITICAL: Full response structure for debugging
          logObjectStructure(`[app.ts] 📄 FULL RESPONSE STRUCTURE`, response);
          
          // ✅ CRITICAL DEBUG: Log what the WebSocketHandler returned
          console.log(`[app.ts] 🔍 *** RESPONSE FROM WEBSOCKET HANDLER ***`);
          console.log(`[app.ts] Response type:`, typeof response);
          console.log(`[app.ts] Response keys:`, response ? Object.keys(response) : 'null response');
          
          // ✅ DETAILED RESPONSE ANALYSIS BEFORE ANY FILTERING
          if (response) {
            console.log(`[app.ts] 🔍 *** RAW RESPONSE ANALYSIS ***`);
            console.log(`[app.ts] - response.type:`, response.type);
            console.log(`[app.ts] - response.success:`, response.success);
            console.log(`[app.ts] - response.status:`, response.status);
            console.log(`[app.ts] - response.data exists:`, !!response.data);
            
            if (response.data) {
              console.log(`[app.ts] - data keys:`, Object.keys(response.data));
              console.log(`[app.ts] - data.ui exists:`, !!response.data.ui);
              console.log(`[app.ts] - data.structured exists:`, !!response.data.structured);
              console.log(`[app.ts] - data.pong:`, response.data.pong);
              console.log(`[app.ts] - data.message:`, !!response.data.message);
            }
            
            console.log(`[app.ts] - response.message:`, !!response.message);
            console.log(`[app.ts] - response.id:`, !!response.id);
            console.log(`[app.ts] - response.userId:`, !!response.userId);
            console.log(`[app.ts] - response.timestamp:`, !!response.timestamp);
            
            // Check what type of response this looks like
            const looksLikeUnified = response.type && ['email', 'calendar', 'contact', 'task', 'general'].includes(response.type) && response.data?.ui;
            const looksLikeLegacy = response.status && response.data?.message;
            const looksLikePing = response.data?.pong;
            
            console.log(`[app.ts] 🎯 *** RESPONSE TYPE ANALYSIS ***`);
            console.log(`[app.ts] - Looks like UnifiedToolResponse:`, looksLikeUnified);
            console.log(`[app.ts] - Looks like legacy response:`, looksLikeLegacy);
            console.log(`[app.ts] - Looks like ping/pong:`, looksLikePing);
          }
          
          // ✅ EARLY FILTER: Skip Zod validation ONLY for ping/pong messages  
          if (response && response.data?.pong) {
            console.log(`[app.ts] 🏓 Detected ping/pong message - sending legacy format`);
            const formattedResponse = {
              type: WebSocketMessageType.RESPONSE,
              ...response,
            };
            ws.send(JSON.stringify(formattedResponse));
            return;
          }
          
          // ✅ SMART VALIDATION: Only validate as UnifiedToolResponse if it looks like one
          console.log(`[app.ts] 🧪 *** SMART RESPONSE DETECTION ***`);
          
          let isUnifiedResponse = false;
          let validatedResponse: any = null;
          
          // Pre-check: Does this look like a UnifiedToolResponse?
          const looksLikeUnified = response && 
            response.type && 
            ['email', 'calendar', 'contact', 'task', 'general', 'rdf'].includes(response.type) &&
            response.data &&
            response.data.ui;
            
          const looksLikeLegacy = response && 
            (response.status || response.type === 'response');
          
          console.log(`[app.ts] 🔍 Pre-validation checks:`);
          console.log(`[app.ts] - Looks like UnifiedToolResponse:`, looksLikeUnified);
          console.log(`[app.ts] - Looks like legacy response:`, looksLikeLegacy);
          
          if (looksLikeUnified) {
            console.log(`[app.ts] 🧪 Attempting UnifiedToolResponse validation...`);
            const parseResult = safeParseUnifiedToolResponse(response);
            
            if (parseResult.success) {
              console.log(`[app.ts] ✅ ZOD VALIDATION SUCCESS!`);
              isUnifiedResponse = true;
              validatedResponse = parseResult.data;
              console.log(`[app.ts] Validated response type:`, validatedResponse.type);
              console.log(`[app.ts] Has structured data:`, !!validatedResponse.data?.structured);
            } else {
              console.log(`[app.ts] ❌ ZOD VALIDATION FAILED despite looking unified`);
              console.log(`[app.ts] Error details:`, parseResult.error);
              isUnifiedResponse = false;
            }
          } else {
            console.log(`[app.ts] ⏭️ Skipping UnifiedToolResponse validation - doesn't match expected structure`);
            isUnifiedResponse = false;
          }
          
          // Use Zod validation result instead of manual checks
          if (isUnifiedResponse && validatedResponse) {
            console.log(`✅ [app.ts] *** DETECTED UNIFIED TOOL RESPONSE (ZOD VALIDATED) ***`);
            console.log(`[app.ts] - Type: ${validatedResponse.type}`);
            console.log(`[app.ts] - Success: ${validatedResponse.success}`);
            console.log(`[app.ts] - Has structured data: ${!!validatedResponse.data?.structured}`);
            
            if (validatedResponse.data?.structured && validatedResponse.type === 'email') {
              const emailData = validatedResponse.data.structured;
              console.log(`[app.ts] 📧 Email structured data:`, {
                hasEmails: !!emailData.emails,
                emailCount: emailData.emails?.length || 0,
                totalCount: emailData.totalCount,
                unreadCount: emailData.unreadCount
              });
            }
            
            console.log(`[app.ts] 🚀 SENDING UNIFIED RESPONSE DIRECTLY TO CLIENT`);
            
            // Send UnifiedToolResponse directly without wrapping
            ws.send(JSON.stringify(validatedResponse));
            return;
          } else {
            console.log(`❌ [app.ts] *** ZOD VALIDATION FAILED - USING LEGACY FORMAT ***`);
            console.log(`[app.ts] Response did not pass UnifiedToolResponse validation`);
            
            // Log why it might have failed
            if (response) {
              console.log(`[app.ts] Response analysis:`);
              console.log(`[app.ts] - Has 'status' field (legacy indicator):`, 'status' in response);
              console.log(`[app.ts] - Has 'type' field:`, 'type' in response, '| value:', (response as any).type);
              console.log(`[app.ts] - Type is 'response' (legacy):`, (response as any).type === 'response');
            }
          }
          
          // OLD: Legacy format for backward compatibility
          console.log(`[app.ts] 📤 *** SENDING LEGACY FORMAT ***`);
          const formattedResponse = {
            type: WebSocketMessageType.RESPONSE,
            ...response,
          };
          console.log(`[app.ts] Legacy response keys:`, Object.keys(formattedResponse));
          console.log(`[app.ts] Legacy response type field:`, formattedResponse.type);
          ws.send(JSON.stringify(formattedResponse));
        })
        .catch((error) => {
          console.error("❌ Error in WebSocket handler:", error);
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.ERROR,
              status: WebSocketResponseStatus.ERROR,
              data: { error: "Server error processing message" },
              timestamp: Date.now(),
            })
          );
        });
    } catch (error) {
      console.error("❌ Error parsing WebSocket message:", error);
      ws.send(
        JSON.stringify({
          type: WebSocketMessageType.ERROR,
          status: WebSocketResponseStatus.ERROR,
          data: { error: "Invalid message format" },
          timestamp: Date.now(),
        })
      );
    }
  },

  close(ws) {
    console.log(`❌ WebSocket client disconnected!`);

    // Find and remove the user connection properly
    const connectedUsers = wsHandler.getConnectedUsers();
    let removedUserId: string | null = null;

    for (const userId of connectedUsers) {
      console.log(`🔍 Checking if user ${userId} has active connection`);
      try {
        // Since we can't check connection state directly, we'll try to send a test message
        // If it fails, we know the connection is dead
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
          // If send succeeds, connection is still alive, skip this user
          continue;
        } catch (sendError) {
          // Send failed, this connection is dead
          wsHandler.removeConnectionForUser(userId);
          removedUserId = userId;
          console.log(`🧹 Cleaned up dead connection for user: ${userId}`);
          break;
        }
      } catch (error) {
        // If checking the connection fails, remove it
        wsHandler.removeConnectionForUser(userId);
        removedUserId = userId;
        console.log(`🧹 Removed failed connection for user: ${userId}`);
        break;
      }
    }

    if (!removedUserId) {
      console.log(`⚠️ Could not determine which user disconnected`);
    }
  },
});

console.log("✅ WebSocket endpoint configured");

// ✅ CRITICAL: Error handlers must be registered BEFORE app.listen()
// Auth errors (401)
app.onError(({ code, error, set }) => {
  console.error("🚨 Error caught:", error);

  // Extract error message safely
  const errorMessage =
    typeof error === "object" && error !== null && "message" in error
      ? (error as Error).message
      : "Internal Server Error";

  // Handle auth errors - check for authorization-related messages
  if (errorMessage.includes('authorization') ||
      errorMessage.includes('Invalid or expired token') ||
      errorMessage.includes('Missing or invalid')) {
    set.status = 401;
    return { error: 'Unauthorized', message: errorMessage };
  }

  // Handle not found
  if (code === "NOT_FOUND" || errorMessage.includes('not found')) {
    set.status = 404;
    return { error: 'Not Found', message: errorMessage };
  }

  // Generic server error
  set.status = 500;
  return {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong'
  };
});

// Railway and other cloud platforms provide PORT via environment
const port = process.env.PORT || DEFAULT_PORT;
const host = "0.0.0.0"; // Listen on all interfaces for cloud deployment

console.log(`🚀 Starting server configuration:`);
console.log(`   - Host: ${host}`);
console.log(`   - Port: ${port} (from ${process.env.PORT ? 'ENV.PORT' : 'DEFAULT'})`);
console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`   - Health endpoint: /health`);
console.log(`   - WebSocket endpoint: /ws`);

// Add graceful shutdown handling for Railway
const gracefulShutdown = (signal: string) => {
  console.log(`🛑 Received ${signal}. Graceful shutdown initiated...`);
  
  // Close WebSocket connections
  console.log('📡 Closing WebSocket connections...');
  
  // Give some time for cleanup
  setTimeout(() => {
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  app.listen({
    port: parseInt(port.toString()),
    hostname: host,
  });

  console.log(`🚀 Server listening on ${host}:${port}`);
  console.log(`📡 WebSocket endpoint available at: ws://${host}:${port}/ws`);
  console.log(`🏥 Health check: http://${host}:${port}/health`);
  console.log(`📊 Swagger docs: http://${host}:${port}/swagger`);
  console.log(`MCP backend running at ${env.MCP_BASE_URL}`);
  
  // Get local network IP for React Native connections
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  console.log(`🌐 *** REACT NATIVE CONNECTION INFO ***`);
  console.log(`📱 For React Native/Expo development, use one of these URLs:`);
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      interfaces.forEach((details: any) => {
        if (details.family === 'IPv4' && !details.internal) {
          console.log(`   - ws://${details.address}:${port}/ws`);
        }
      });
    }
  });
  
  console.log(`🔧 Railway environment checks:`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   - PORT: ${process.env.PORT}`);
  console.log(`   - Railway health path: /health`);
  
  // Internal health check removed - no need to self-test in production
  
  // Log ready state for Railway
  setTimeout(() => {
    console.log("🎯 SERVER READY FOR RAILWAY HEALTH CHECK");
    console.log(`🎯 Health endpoint: http://0.0.0.0:${port}/health`);
    serverReady = true; // Mark server as ready for health checks
    console.log("✅ Server readiness flag set to true");
  }, 3000);
  
  // Log memory usage periodically for debugging Railway issues
  const logMemoryUsage = () => {
    const usage = process.memoryUsage();
    console.log('📊 Memory Usage:', {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
  };
  
  // Log initial memory
  logMemoryUsage();
  
  // Log memory every 5 minutes in production to monitor for leaks
  if (process.env.NODE_ENV === 'production') {
    setInterval(logMemoryUsage, 5 * 60 * 1000);
  }
} catch (error) {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
}
