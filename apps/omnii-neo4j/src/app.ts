import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { validateEnvironment } from './config/env.validation';
import { initializeNeo4j, closeNeo4jDriver } from './config/neo4j.config';
import { neo4jRoutes } from './routes/neo4j.routes';

// Load environment and validate
const config = validateEnvironment();

// Initialize the Neo4j service
async function startServer() {
  try {
    // Initialize Neo4j connection
    await initializeNeo4j();
    console.log('✅ Neo4j service initialized successfully');

    // Create Elysia app
    const app = new Elysia({ name: 'Neo4j Service' })
      
      // Add CORS support
      .use(cors({
        origin: true, // Allow all origins for now
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }))
      
      // Add Swagger documentation
      .use(swagger({
        documentation: {
          info: {
            title: 'Neo4j Service API',
            version: '1.0.0',
            description: 'Dedicated Neo4j graph database service for Omnii platform',
          },
          tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Concepts', description: 'Concept node operations' },
            { name: 'Context', description: 'AI context retrieval' },
            { name: 'Brain Memory', description: 'Brain-like memory operations' },
            { name: 'Nodes', description: 'General node operations' },
            { name: 'Import', description: 'Data import operations' },
            { name: 'Railway', description: 'Railway template features' },
          ],
          servers: [
            { url: 'http://localhost:8002', description: 'Local development' },
            { url: 'https://neo4j-service-production.railway.app', description: 'Production (Railway)' },
          ],
        },
      }))
      
      // Add routes
      .use(neo4jRoutes)
      
      // Root endpoint
      .get('/', () => ({
        service: 'Neo4j Service',
        version: '1.0.0',
        status: 'running',
        environment: config.NODE_ENV,
        endpoints: {
          health: '/api/health',
          swagger: '/swagger',
          concepts: '/api/concepts',
          context: '/api/context',
          brain_memory: '/api/brain/memory-context',
        },
        railway: {
          environment: !!config.RAILWAY_ENVIRONMENT,
          project_id: config.RAILWAY_PROJECT_ID || 'none',
        },
      }))
      
      // Error handling
      .onError(({ error, code, set }) => {
        console.error(`[Neo4j Service] Error ${code}:`, error);
        
        switch (code) {
          case 'NOT_FOUND':
            set.status = 404;
            return { error: 'Endpoint not found' };
          case 'VALIDATION':
            set.status = 400;
            return { error: 'Validation error', details: error.message };
          case 'INTERNAL_SERVER_ERROR':
            set.status = 500;
            return { error: 'Internal server error' };
          default:
            set.status = 500;
            return { error: 'Unknown error occurred' };
        }
      })
      
      // Start listening
      .listen(config.PORT);

    console.log('🚀 Neo4j Service started successfully!');
    console.log(`📍 Server running on: http://localhost:${config.PORT}`);
    console.log(`📖 Swagger docs: http://localhost:${config.PORT}/swagger`);
    console.log(`❤️  Health check: http://localhost:${config.PORT}/api/health`);
    console.log(`🔗 Neo4j URI: ${config.NEO4J_URI}`);
    console.log(`🎯 Environment: ${config.NODE_ENV}`);
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Neo4j service gracefully...');
      try {
        await closeNeo4jDriver();
        console.log('✅ Neo4j driver closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      try {
        await closeNeo4jDriver();
        console.log('✅ Neo4j driver closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    return app;

  } catch (error) {
    console.error('❌ Failed to start Neo4j service:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 