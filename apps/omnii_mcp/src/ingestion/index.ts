/**
 * Ingestion Module
 *
 * Barrel export for ingestion infrastructure.
 * Provides:
 * - Composio client for Google OAuth abstraction
 * - BullMQ queue factory for background job processing
 * - Redis connection for job queues
 */

// Composio client singleton
export { getComposioClient, type ComposioClient } from "./composio-client";

// BullMQ queue factory
export { getRedisConnection, createIngestionQueue } from "./jobs/queue";
