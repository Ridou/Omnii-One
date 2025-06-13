/**
 * RDF Service Client for omnii_mcp
 * Handles communication with the omnii-rdf-node and omnii-rdf-python services
 */

export class RDFServiceClient {
  private pythonServiceUrl = process.env.RDF_PYTHON_SERVICE_URL || "http://omnii-rdf-python-production.railway.internal:8000";

  constructor() {
    console.log(`[RDFServiceClient] 🔗 Connecting directly to Python RDF service:`);
    console.log(`[RDFServiceClient] - Python service: ${this.pythonServiceUrl}`);
    
    if (!this.pythonServiceUrl) {
      console.warn('⚠️ RDF_PYTHON_SERVICE_URL not configured');
    }
  }

  /**
   * Process RDF request directly through Python service
   * omnii_mcp → omnii-rdf-python
   */
  async processRDFRequest(data: any) {
    try {
      console.log('🧠 Processing RDF request directly through Python service');
      
      if (!this.pythonServiceUrl) {
        throw new Error('RDF_PYTHON_SERVICE_URL not configured');
      }

      // Call Python RDF service directly
      const response = await fetch(`${this.pythonServiceUrl}/api/rdf/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python RDF service error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      console.log('✅ RDF processing completed successfully');
      console.log('📊 RDF result keys:', Object.keys(result));
      
      return result;

    } catch (error) {
      console.error('❌ RDF processing failed:', error);
      throw error;
    }
  }

  /**
   * Get Python analysis (alias for processRDFRequest for backward compatibility)
   * omnii_mcp → omnii-rdf-python
   */
  async getPythonAnalysis(rdfData: any) {
    console.log('🐍 Getting Python AI analysis (calling processRDFRequest)');
    return this.processRDFRequest(rdfData);
  }

  /**
   * Health check for Python RDF service
   */
  async healthCheck() {
    const results = {
      pythonService: { status: 'unknown', error: null as string | null }
    };

    // Check Python service
    try {
      if (this.pythonServiceUrl) {
        const pythonHealth = await fetch(`${this.pythonServiceUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (pythonHealth.ok) {
          results.pythonService.status = 'healthy';
          console.log('✅ Python RDF service is healthy');
        } else {
          results.pythonService.status = 'unhealthy';
          results.pythonService.error = `HTTP ${pythonHealth.status}`;
          console.warn(`⚠️ Python RDF service unhealthy: ${pythonHealth.status}`);
        }
      } else {
        results.pythonService.status = 'not_configured';
        results.pythonService.error = 'RDF_PYTHON_SERVICE_URL not set';
        console.warn('⚠️ Python RDF service URL not configured');
      }
    } catch (error) {
      results.pythonService.status = 'error';
      results.pythonService.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Python RDF service health check failed:', error);
    }

    return results;
  }

  /**
   * Check if Python RDF service is available
   */
  isAvailable(): boolean {
    return Boolean(this.pythonServiceUrl);
  }
}

// Export singleton instance
export const rdfServiceClient = new RDFServiceClient(); 