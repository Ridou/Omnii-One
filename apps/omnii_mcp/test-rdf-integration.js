#!/usr/bin/env bun

// Runner script for RDF integration tests
console.log('🧪 Running RDF Integration Tests');
console.log('📍 This will use the endpoints from your constants.js');
console.log('🔧 Set OMNII_TEST_ENV=PROD to test production endpoints\n');

// Run the actual Bun test
import { $ } from "bun";
await $`bun test tests/rdf-integration.test.js`;