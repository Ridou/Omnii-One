import { Elysia, t } from 'elysia';
import { rdfService } from '../services/rdf-service';
import { HumanInputSchema } from '../types/rdf-schemas';

export default new Elysia({ prefix: '/rdf' })
  .get('/health', async () => {
    console.log('🏥 RDF Health check requested');
    try {
      const health = await rdfService.healthCheck();
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
      const result = await rdfService.processHumanInputToOmniiMCP(body);
      
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
      // For analysis, we process the input and return just the analysis data
      const result = await rdfService.processHumanInputToOmniiMCP(body);
      
      if (!result.success) {
        set.status = 400;
        return result;
      }
      
      // Extract analysis results from the bridge data
      const analysisResults = result.data?.structured?.analysis_results || {};
      
      return {
        success: true,
        analysis: {
          concepts: analysisResults.concept_insights || [],
          intent: analysisResults.intent_analysis || {},
          sentiment: analysisResults.sentiment_analysis || {},
          temporal_patterns: analysisResults.temporal_patterns || [],
          semantic_connections: analysisResults.semantic_connections || [],
          confidence_score: analysisResults.processing_metadata?.confidence_score || 0
        },
        metadata: {
          processing_time_ms: result.processing_time_ms || 0,
          concepts_extracted: analysisResults.processing_metadata?.concepts_extracted || 0
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
      service: 'omnii-rdf-integrated',
      status: rdfService.isServiceAvailable() ? 'available' : 'unavailable',
      version: '1.0.0',
      integration: 'native',
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

      const { extractBasicConcepts, analyzeBasicSentiment, detectBasicIntent } = await import('../utils/rdf-helpers');
      
      const text = (body as any).text;
      const concepts = extractBasicConcepts(text);
      const sentiment = analyzeBasicSentiment(text);
      const intent = detectBasicIntent(text);
      
      return {
        success: true,
        concepts: concepts,
        sentiment: {
          score: sentiment,
          polarity: sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral'
        },
        intent: intent,
        text_length: text.length,
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
      message: 'RDF service test endpoint',
      service: 'omnii-rdf-integrated',
      endpoints: [
        'GET /api/rdf/health - Service health check',
        'POST /api/rdf/process - Full RDF processing pipeline',
        'POST /api/rdf/analyze - Analysis-only endpoint',
        'POST /api/rdf/extract-concepts - Concept extraction only',
        'GET /api/rdf/status - Service status',
        'GET /api/rdf/test - This endpoint'
      ],
      timestamp: new Date().toISOString()
    };
  }); 