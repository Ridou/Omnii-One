#!/usr/bin/env bun

/**
 * Test Modified Files Script
 * 
 * Runs comprehensive tests on all files modified during brain memory implementation
 * to ensure no functionality was broken.
 */

console.log('🧪 Testing Modified Files - Brain Memory Implementation');
console.log('====================================================');

const testFiles = [
  'tests/integration/modified-files-integration.test.ts'
];

const testCategories = {
  'Redis Cache': '🔒 Security & caching functionality',
  'SMS AI': '🧠 Brain memory integration for SMS',
  'WebSocket Handler': '💬 Real-time chat with brain memory',
  'Action Planning Types': '🔍 Type safety and validation',
  'Integration Flow': '🔄 End-to-end functionality',
  'Performance': '⚡ Stability and efficiency'
};

console.log('\n📋 Test Categories:');
Object.entries(testCategories).forEach(([category, description]) => {
  console.log(`  ${description}`);
});

console.log('\n🚀 Starting tests...\n');

// Run the tests
import { spawn } from 'bun';

try {
  const result = await spawn({
    cmd: ['bun', 'test', '--timeout', '30000', ...testFiles],
    cwd: process.cwd(),
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  if (result.exitCode === 0) {
    console.log('\n✅ All modified files tests passed!');
    console.log('🎉 Brain memory integration is working correctly.');
  } else {
    console.log('\n❌ Some tests failed.');
    console.log('🔧 Please check the output above for details.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
} 