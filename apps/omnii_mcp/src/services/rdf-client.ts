/**
 * RDF Service Client for omnii_mcp
 * Handles communication with the omnii-rdf-node and omnii-rdf-python services
 */

export class RDFServiceClient {
  private nodeServiceUrl = process.env.RDF_NODE_SERVICE_URL!;
  private pythonServiceUrl = process.env.RDF_PYTHON_SERVICE_URL!;

  constructor() {
    if (!this.nodeServiceUrl) {
      console.warn('⚠️ RDF_NODE_SERVICE_URL not configured');
    }
    if (!this.pythonServiceUrl) {
      console.warn('⚠️ RDF_PYTHON_SERVICE_URL not configured');
    }
  }

  /**
   * Process RDF request through the complete pipeline
   * omnii_mcp → omnii-rdf-node → omnii-rdf-python
   */
  async processRDFRequest(data: any) {
    try {
      console.log('🧠 Processing RDF request through node service');
      
      if (!this.nodeServiceUrl) {
        throw new Error('RDF_NODE_SERVICE_URL not configured');
      }

      // Call Node RDF service
      const nodeResponse = await fetch(`${this.nodeServiceUrl}/api/rdf/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!nodeResponse.ok) {
        throw new Error(`Node RDF service error: ${nodeResponse.status} ${nodeResponse.statusText}`);
      }

      const result = await nodeResponse.json();
      
      console.log('✅ RDF processing completed successfully');
      return result;

    } catch (error) {
      console.error('❌ RDF processing failed:', error);
      throw error;
    }
  }

  /**
   * Call Python service directly if needed
   * omnii_mcp → omnii-rdf-python
   */
  async getPythonAnalysis(rdfData: any) {
    try {
      console.log('🐍 Getting Python AI analysis');
      
      if (!this.pythonServiceUrl) {
        throw new Error('RDF_PYTHON_SERVICE_URL not configured');
      }

      // Call Python service directly
      const pythonResponse = await fetch(`${this.pythonServiceUrl}/api/rdf/analyze`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rdfData)
      });

      if (!pythonResponse.ok) {
        throw new Error(`Python service error: ${pythonResponse.status} ${pythonResponse.statusText}`);
      }

      const result = await pythonResponse.json();
      
      console.log('✅ Python analysis completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Python analysis failed:', error);
      throw error;
    }
  }

  /**
   * Health check for RDF services
   */
  async healthCheck() {
    const results = {
      nodeService: { status: 'unknown', error: null as string | null },
      pythonService: { status: 'unknown', error: null as string | null }
    };

    // Check Node service
    try {
      if (this.nodeServiceUrl) {
        const nodeHealth = await fetch(`${this.nodeServiceUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (nodeHealth.ok) {
          results.nodeService.status = 'healthy';
        } else {
          results.nodeService.status = 'unhealthy';
          results.nodeService.error = `HTTP ${nodeHealth.status}`;
        }
      } else {
        results.nodeService.status = 'not_configured';
        results.nodeService.error = 'RDF_NODE_SERVICE_URL not set';
      }
    } catch (error) {
      results.nodeService.status = 'error';
      results.nodeService.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check Python service
    try {
      if (this.pythonServiceUrl) {
        const pythonHealth = await fetch(`${this.pythonServiceUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (pythonHealth.ok) {
          results.pythonService.status = 'healthy';
        } else {
          results.pythonService.status = 'unhealthy';
          results.pythonService.error = `HTTP ${pythonHealth.status}`;
        }
      } else {
        results.pythonService.status = 'not_configured';
        results.pythonService.error = 'RDF_PYTHON_SERVICE_URL not set';
      }
    } catch (error) {
      results.pythonService.status = 'error';
      results.pythonService.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  }

  /**
   * Check if RDF services are available
   */
  isAvailable(): boolean {
    return Boolean(this.nodeServiceUrl && this.pythonServiceUrl);
  }
}

// Export singleton instance
export const rdfServiceClient = new RDFServiceClient(); 