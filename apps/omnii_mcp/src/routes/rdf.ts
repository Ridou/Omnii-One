import { Elysia, t } from 'elysia';
import { rdfServiceClient } from '../services/rdf/rdf-client';
import { HumanInputSchema } from '../types/rdf-schemas';

export default new Elysia({ prefix: '/rdf' })
  .get('/health', async () => {
    console.log('🏥 RDF Health check requested');
    try {
      const health = await rdfServiceClient.healthCheck();
      return health;
    } catch (error) {
      console.error('❌ RDF health check failed:', error);
      return {
        response_type: "health",
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })

  .post('/process', async ({ body, set }) => {
    console.log('🧠 RDF Processing request received');
    
    try {
      const result = await rdfServiceClient.processRDFRequest(body);
      
      if (!result.success) {
        set.status = 400;
      }
      
      return result;
    } catch (error) {
      console.error('❌ RDF processing failed:', error);
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'RDF processing failed',
        timestamp: new Date().toISOString()
      };
    }
  }, {
    body: t.Any() // Accept any JSON input and let the service validate
  })

  .post('/analyze', async ({ body, set }) => {
    console.log('🔍 RDF Analysis request received');
    
    try {
      // For analysis, we process the input through the Python RDF service
      const result = await rdfServiceClient.processRDFRequest(body);
      
      if (!result.success) {
        set.status = 400;
        return result;
      }
      
      return {
        success: true,
        analysis: result,
        metadata: {
          processing_time_ms: 0,
          concepts_extracted: 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ RDF analysis failed:', error);
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'RDF analysis failed',
        timestamp: new Date().toISOString()
      };
    }
  }, {
    body: t.Any() // Accept any JSON input and let the service validate
  })

  .get('/status', () => {
    console.log('📊 RDF Status check requested');
    return {
      service: 'omnii-rdf-python-client',
      status: rdfServiceClient.isAvailable() ? 'available' : 'unavailable',
      version: '1.0.0',
      integration: 'python_service_client',
      timestamp: new Date().toISOString()
    };
  })

  .post('/extract-concepts', async ({ body, set }) => {
    console.log('🔍 RDF Concept extraction request received');
    
    try {
      if (typeof body !== 'object' || !body || !('text' in body)) {
        set.status = 400;
        return {
          success: false,
          error: 'Request body must contain "text" field',
          timestamp: new Date().toISOString()
        };
      }

      // Use the Python RDF service for concept extraction
      const result = await rdfServiceClient.processRDFRequest({
        text: (body as any).text,
        domain: 'concept_extraction',
        task: 'extract_concepts',
        extractors: ['concepts', 'sentiment', 'intent']
      });
      
      return {
        success: true,
        concepts: result.concepts || [],
        sentiment: result.sentiment || { score: 0, polarity: 'neutral' },
        intent: result.intent || 'unknown',
        text_length: (body as any).text.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ RDF concept extraction failed:', error);
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Concept extraction failed',
        timestamp: new Date().toISOString()
      };
    }
  }, {
    body: t.Object({
      text: t.String({ minLength: 1 })
    })
  })

  .get('/test', () => {
    console.log('🧪 RDF Test endpoint accessed');
    return {
      message: 'RDF Python service client test endpoint',
      service: 'omnii-rdf-python-client',
      endpoints: [
        'GET /api/rdf/health - Python RDF service health check',
        'POST /api/rdf/process - Full RDF processing via Python service',
        'POST /api/rdf/analyze - Analysis via Python service',
        'POST /api/rdf/extract-concepts - Concept extraction via Python service',
        'GET /api/rdf/status - Service status',
        'GET /api/rdf/test - This endpoint'
      ],
      timestamp: new Date().toISOString()
    };
  }); 