import { describe, test, expect, beforeAll } from "bun:test";
import { EntityManager } from "../../src/services/entity-recognizer";
import { ExecutionContextType } from "../../src/types/action-planning.types";
import { EntityType } from "../../src/types/entity.types";

describe("EntityManager RDF Enhancement", () => {
  let entityManager: EntityManager;
  
  beforeAll(() => {
    entityManager = new EntityManager();
  });

  test("should extract entities from RDF concepts", async () => {
    const rdfConcepts = [
      { concept_name: "Sarah", confidence: 0.9, insight_type: "semantic_connection" },
      { concept_name: "Paris", confidence: 0.8, insight_type: "semantic_connection" },
      { concept_name: "tomorrow", confidence: 0.7, insight_type: "temporal_pattern" }
    ];
    
    // This method doesn't exist yet - we need to implement it
    const entities = entityManager['extractEntitiesFromRDFConcepts'](rdfConcepts, "Call Sarah about Paris trip tomorrow");
    
    expect(entities).toHaveLength(3);
    expect(entities[0].type).toBe(EntityType.PERSON);
    expect(entities[0].value).toBe("Sarah");
    expect(entities[1].type).toBe(EntityType.LOCATION); // We need to add this type
    expect(entities[1].value).toBe("Paris");
    expect(entities[2].type).toBe(EntityType.TEMPORAL); // We need to add this type
    expect(entities[2].value).toBe("tomorrow");
  });

  test("should merge standard and RDF entities", async () => {
    const standardEntities = [
      { type: EntityType.EMAIL, value: "test@example.com", email: "test@example.com", resolvedAt: Date.now() }
    ];
    
    const rdfEntities = [
      { type: EntityType.PERSON, value: "John", confidence: 0.8, resolvedAt: Date.now() }
    ];
    
    // This method doesn't exist yet - we need to implement it
    const merged = entityManager['mergeEntities'](standardEntities, rdfEntities);
    
    expect(merged).toHaveLength(2);
    expect(merged.some(e => e.type === EntityType.EMAIL)).toBe(true);
    expect(merged.some(e => e.type === EntityType.PERSON)).toBe(true);
  });

  test("should enhance entity resolution with RDF insights", async () => {
    const message = "I need to contact Sarah about the project";
    const rdfInsights = {
      ai_reasoning: {
        extracted_concepts: [
          { concept_name: "sarah", confidence: 0.9 },
          { concept_name: "project", confidence: 0.8 }
        ]
      }
    };
    
    // This method doesn't exist yet - we need to implement it
    const entities = await entityManager.resolveEntitiesWithRDF(
      message, 
      ExecutionContextType.WEBSOCKET,
      rdfInsights
    );
    
    expect(entities.length).toBeGreaterThan(0);
    expect(entities.some(e => e.value.toLowerCase().includes('sarah'))).toBe(true);
  });

  test("should classify person names from RDF concepts", () => {
    // These helper methods don't exist yet - we need to implement them
    expect(entityManager['isPersonName']("Sarah")).toBe(true);
    expect(entityManager['isPersonName']("John Doe")).toBe(true);
    expect(entityManager['isPersonName']("meeting")).toBe(false);
    expect(entityManager['isPersonName']("tomorrow")).toBe(false);
  });

  test("should classify locations from RDF concepts", () => {
    expect(entityManager['isLocation']("Paris")).toBe(true);
    expect(entityManager['isLocation']("New York")).toBe(true);
    expect(entityManager['isLocation']("meeting")).toBe(false);
    expect(entityManager['isLocation']("John")).toBe(false);
  });

  test("should classify time expressions from RDF concepts", () => {
    expect(entityManager['isTimeExpression']("tomorrow")).toBe(true);
    expect(entityManager['isTimeExpression']("next week")).toBe(true);
    expect(entityManager['isTimeExpression']("2pm")).toBe(true);
    expect(entityManager['isTimeExpression']("Sarah")).toBe(false);
    expect(entityManager['isTimeExpression']("meeting")).toBe(false);
  });

  test("should handle empty RDF concepts gracefully", async () => {
    const entities = entityManager['extractEntitiesFromRDFConcepts']([], "No concepts here");
    expect(entities).toHaveLength(0);
  });

  test("should prioritize high-confidence RDF concepts", async () => {
    const rdfConcepts = [
      { concept_name: "Sarah", confidence: 0.9, insight_type: "semantic_connection" },
      { concept_name: "maybe_person", confidence: 0.3, insight_type: "semantic_connection" },
      { concept_name: "John", confidence: 0.8, insight_type: "semantic_connection" }
    ];
    
    const entities = entityManager['extractEntitiesFromRDFConcepts'](rdfConcepts, "Sarah and John are people");
    
    // Should filter out low-confidence concepts
    expect(entities.length).toBe(2);
    expect(entities.some(e => e.value === "Sarah")).toBe(true);
    expect(entities.some(e => e.value === "John")).toBe(true);
    expect(entities.some(e => e.value === "maybe_person")).toBe(false);
  });
}); 