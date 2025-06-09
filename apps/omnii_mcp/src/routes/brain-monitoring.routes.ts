import { Router, Request, Response } from 'express';
import { productionBrainService } from '../services/memory/production-brain-service';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await productionBrainService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Memory metrics endpoint
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: {
        consolidation_enabled: process.env.MEMORY_BRIDGE_ENABLED === 'true',
        cache_ttl: process.env.MEMORY_CACHE_TTL,
        context_timeout: process.env.CONTEXT_RETRIEVAL_TIMEOUT
      },
      neo4j: {
        uri: process.env.NEO4J_URI?.split('@')[1],
        database: process.env.NEO4J_DATABASE,
        environment: process.env.NODE_ENV
      }
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ 
      error: 'Metrics collection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Memory context test endpoint (for development)
router.post('/test-memory', async (req: Request, res: Response) => {
  try {
    const { userId, message, channel, sourceIdentifier } = req.body;
    
    if (!userId || !message || !channel || !sourceIdentifier) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, message, channel, sourceIdentifier' 
      });
    }

    const memoryContext = await productionBrainService.getBrainMemoryContext(
      userId,
      message,
      channel,
      sourceIdentifier
    );

    res.json({
      success: true,
      memory_strength: memoryContext.consolidation_metadata.memory_strength,
      working_memory_count: memoryContext.working_memory.recent_messages.length,
      episodic_memory_count: memoryContext.episodic_memory.conversation_threads.length,
      semantic_concepts_count: memoryContext.semantic_memory.activated_concepts.length,
      time_window_stats: memoryContext.working_memory.time_window_stats
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Memory test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 