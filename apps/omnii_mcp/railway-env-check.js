#!/usr/bin/env node

/**
 * Railway Environment Variables Check
 * Run this to see what environment variables are available in Railway
 */

console.log('🚀 Railway Environment Check');
console.log('============================');

// Required environment variables for the application
const requiredVars = [
  'REDIS_URL',
  'SUPABASE_URL', 
  'SUPABASE_ANON_KEY',
  'NEO4J_URI',
  'NEO4J_USERNAME', 
  'NEO4J_PASSWORD',
  'PORT',
  'NODE_ENV'
];

console.log('\n📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (varName.includes('PASSWORD') || varName.includes('KEY') ? '[HIDDEN]' : value) : 
    'NOT SET';
  
  console.log(`${status} ${varName}: ${displayValue}`);
});

console.log('\n🔍 All Environment Variables:');
const allVars = Object.keys(process.env).sort();
allVars.forEach(key => {
  if (key.includes('PASSWORD') || key.includes('KEY') || key.includes('SECRET')) {
    console.log(`${key}: [HIDDEN]`);
  } else {
    console.log(`${key}: ${process.env[key]}`);
  }
});

console.log('\n📊 Summary:');
const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log(`❌ Missing ${missingVars.length} required variables:`);
  missingVars.forEach(varName => console.log(`   - ${varName}`));
}

console.log('\n🌐 Server Configuration:');
console.log(`Port: ${process.env.PORT || 8000}`);
console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Redis URL: ${process.env.REDIS_URL ? '[SET]' : '[NOT SET]'}`); 