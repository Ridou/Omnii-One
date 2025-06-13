import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app, rdf_service
import json
from datetime import datetime

# Test client
client = TestClient(app)

class TestRDFServiceCore:
    """Test core RDF service functionality"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "graph_size" in data
        assert data["status"] == "healthy"
        assert data["brain_integration"] == True
    
    def test_basic_sparql_query(self):
        """Test basic SPARQL query execution"""
        query_data = {
            "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 5",
            "query_type": "SELECT",
            "reasoning": False,
            "limit": 5
        }
        
        response = client.post("/query", json=query_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "results" in data
        assert "execution_time_ms" in data
        assert "reasoning_applied" in data
        assert data["reasoning_applied"] == False
    
    def test_brain_enhanced_query(self):
        """Test SPARQL query with brain memory context"""
        query_data = {
            "query": """
                PREFIX omnii: <https://omnii.ai/ontology#>
                SELECT ?concept WHERE {
                    ?concept a omnii:Concept .
                }
            """,
            "query_type": "SELECT",
            "reasoning": True,
            "brain_context": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "channel": "sms",
                "memory_window_hours": 168,
                "temporal_reasoning": True
            }
        }
        
        response = client.post("/query", json=query_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["reasoning_applied"] == True
        assert "brain_memory_integration" in data
    
    def test_concept_evolution(self):
        """Test concept evolution endpoint"""
        evolution_data = {
            "concept_id": "123e4567-e89b-12d3-a456-426614174000",
            "concept_name": "test_concept",
            "current_properties": {
                "activation_strength": 0.6,
                "mention_count": 3,
                "semantic_weight": 0.7
            },
            "new_information": [],
            "evidence_sources": [],
            "brain_memory_context": {
                "working_memory_references": 5,
                "episodic_memory_connections": 2,
                "semantic_network_strength": 0.8,
                "temporal_distribution": {
                    "previous_week": 0.2,
                    "current_week": 0.6,
                    "next_week": 0.2
                }
            }
        }
        
        response = client.post("/evolve-concept", json=evolution_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "confidence_score" in data
        assert "brain_memory_updates" in data
    
    def test_brain_memory_analysis(self):
        """Test brain memory analysis endpoint"""
        analysis_data = {
            "brain_memory_context": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "retrieval_timestamp": datetime.now().isoformat(),
                "memory_strength": 0.75,
                "working_memory_size": 7,
                "episodic_threads": 3,
                "active_concepts": 5
            },
            "rdf_analysis_request": {
                "analysis_type": "semantic_reasoning",
                "reasoning_depth": "intermediate"
            },
            "expected_outputs": {
                "concept_updates": True,
                "semantic_insights": True,
                "temporal_patterns": True
            },
            "full_brain_context": {
                "working_memory": {
                    "active_concepts": ["concept1", "concept2"],
                    "time_window_stats": {
                        "current_week_count": 10,
                        "previous_week_count": 5
                    }
                }
            }
        }
        
        response = client.post("/analyze-brain-memory", json=analysis_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "concept_insights" in data
        assert "temporal_patterns" in data
    
    def test_rdf_import(self):
        """Test RDF data import"""
        rdf_data = {
            "data": """
                @prefix omnii: <https://omnii.ai/ontology#> .
                @prefix ex: <http://example.org/> .
                
                ex:concept1 a omnii:Concept ;
                    omnii:hasConfidence 0.85 ;
                    rdfs:label "test concept" .
            """,
            "format": "turtle",
            "validation": True
        }
        
        response = client.post("/import-rdf", json=rdf_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "triples_imported" in data
    
    def test_ontology_retrieval(self):
        """Test ontology retrieval endpoint"""
        response = client.get("/ontology")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "ontology" in data
        assert "triple_count" in data
    
    def test_metrics_endpoint(self):
        """Test metrics collection endpoint"""
        response = client.get("/metrics")
        assert response.status_code == 200
        
        data = response.json()
        assert "graph_size" in data
        assert "cache_stats" in data
        assert "namespaces" in data
        assert "ontology_classes" in data
        assert "ontology_properties" in data

class TestRDFServiceErrors:
    """Test error handling and edge cases"""
    
    def test_invalid_sparql_query(self):
        """Test handling of invalid SPARQL syntax"""
        query_data = {
            "query": "INVALID SPARQL SYNTAX",
            "query_type": "SELECT"
        }
        
        response = client.post("/query", json=query_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == False
        assert "error" in data
    
    def test_malformed_rdf_import(self):
        """Test malformed RDF data import"""
        rdf_data = {
            "data": "INVALID RDF DATA",
            "format": "turtle",
            "validation": True
        }
        
        response = client.post("/import-rdf", json=rdf_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == False
        assert "error" in data

if __name__ == "__main__":
    pytest.main([__file__]) 