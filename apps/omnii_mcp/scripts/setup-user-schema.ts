#!/usr/bin/env bun
/**
 * User Schema Setup Script
 *
 * Sets up graph schema (constraints + vector index) for a user's database.
 * Can be run as a CLI script or imported as a module.
 *
 * CLI Usage:
 *   bun scripts/setup-user-schema.ts <userId>
 *
 * Module Usage:
 *   import { setupUserSchema } from './scripts/setup-user-schema';
 *   const result = await setupUserSchema(userId);
 */

import { createClientForUser } from '../src/services/neo4j/http-client';
import { setupSchemaConstraints, checkConstraints, createTemporalIndex } from '../src/graph/schema/constraints';
import { createVectorIndex, checkVectorIndex, VECTOR_INDEX_NAME } from '../src/graph/schema/vector-index';
import type { ConstraintInfo } from '../src/graph/schema/constraints';

/**
 * Result of schema setup operation
 */
export interface SchemaSetupResult {
  success: boolean;
  constraints: {
    created: number;
    existing: string[];
    errors: string[];
  };
  vectorIndex: {
    created: boolean;
    name: string;
    error?: string;
  };
  temporalIndexes: {
    created: number;
    error?: string;
  };
}

/**
 * Set up schema for a user's Neo4j database.
 *
 * Creates:
 * - Uniqueness constraints for node IDs (Concept, Entity, Event, Contact)
 * - Existence constraints for required properties (name)
 * - Vector index for semantic search on Entity embeddings
 *
 * Safe to run multiple times - uses IF NOT EXISTS syntax.
 *
 * @param userId - The user ID whose database to configure
 * @returns Result indicating success and what was created
 */
export async function setupUserSchema(userId: string): Promise<SchemaSetupResult> {
  console.log(`[Schema] Setting up schema for user: ${userId}`);

  const result: SchemaSetupResult = {
    success: false,
    constraints: { created: 0, existing: [], errors: [] },
    vectorIndex: { created: false, name: VECTOR_INDEX_NAME },
    temporalIndexes: { created: 0 },
  };

  try {
    const client = await createClientForUser(userId);

    // Step 1: Create constraints
    console.log('[Schema] Creating constraints...');
    try {
      const constraintResult = await setupSchemaConstraints(client);
      result.constraints.created = constraintResult.constraintsCreated;
      result.constraints.errors = constraintResult.errors;

      // Get list of existing constraints
      const existing = await checkConstraints(client);
      result.constraints.existing = existing.map((c: ConstraintInfo) => c.name);
    } catch (error) {
      result.constraints.errors.push(
        error instanceof Error ? error.message : 'Unknown constraint error'
      );
    }

    // Step 2: Create vector index
    console.log('[Schema] Creating vector index...');
    try {
      await createVectorIndex(client);
      result.vectorIndex.created = true;
    } catch (error) {
      result.vectorIndex.error =
        error instanceof Error ? error.message : 'Unknown vector index error';
    }

    // Step 3: Create temporal indexes
    console.log('[Schema] Creating temporal indexes...');
    try {
      result.temporalIndexes.created = await createTemporalIndex(client);
    } catch (error) {
      result.temporalIndexes.error =
        error instanceof Error ? error.message : 'Unknown temporal index error';
    }

    // Success if no constraint errors (vector/temporal index errors are non-fatal)
    result.success = result.constraints.errors.length === 0;

    console.log(`[Schema] Setup ${result.success ? 'complete' : 'completed with errors'}`);
    return result;
  } catch (error) {
    console.error('[Schema] Setup failed:', error);
    throw error;
  }
}

// CLI runner
if (import.meta.main) {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: bun scripts/setup-user-schema.ts <userId>');
    console.error('');
    console.error('Sets up graph schema (constraints + vector index) for a user database.');
    process.exit(1);
  }

  setupUserSchema(userId)
    .then((result) => {
      console.log('\n[Schema] Setup complete:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n[Schema] Setup failed:', error);
      process.exit(1);
    });
}
