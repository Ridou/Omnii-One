# TypeScript & Bun Configuration Guide

This document outlines the TypeScript configuration for the Omnii MCP project when using Bun as the runtime, including compatibility with Node.js dependencies.

## Table of Contents
- [Current Configuration](#current-configuration)
- [Impact on Node.js Dependencies](#impact-on-nodejs-dependencies)
- [Recommended Adjustments](#recommended-adjustments)
- [Example Code](#example-code)
- [Build & Run Commands](#build--run-commands)
- [Docker Configuration](#docker-configuration)

## Current Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "types": ["bun-types"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### Key Settings Explained

- **`"module": "commonjs"`**: Ensures compatibility with Node.js packages
- **`"types": ["bun-types"]`**: Provides Bun-specific type definitions
- **`"esModuleInterop": true`**: Allows mixing CommonJS and ES modules
- **`"strict": true`**: Enables all strict type checking options

## Impact on Node.js Dependencies

### What Works Well
- Most Node.js packages work without issues
- TypeScript types for Node.js are included via `@types/node`
- CommonJS modules are fully supported

### Potential Issues & Solutions

1. **Native Add-ons**
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node"
     }
   }
   ```

2. **Node.js-specific Globals**
   ```bash
   bun add -D @types/node
   ```

3. **File System Operations**
   ```typescript
   // Instead of:
   // import fs from 'fs/promises';
   
   // Use:
   import { readFile } from 'fs/promises';
   // or Bun's native API:
   const file = await Bun.file('path').text();
   ```

## Recommended Adjustments

### 1. Enhanced Type Checking

```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2. Module Resolution

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

## Example Code

### Using Node.js Crypto

```typescript
// Example using Node.js crypto with Bun
import { createHash } from 'crypto';

// This works in both Bun and Node.js
function hashPassword(password: string): string {
  return createHash('sha256')
    .update(password)
    .digest('hex');
}

// Using Bun's native API (faster in Bun)
function bunHashPassword(password: string): string {
  return new Bun.CryptoHasher('sha256')
    .update(password)
    .digest('hex');
}
```

## Build & Run Commands

```bash
# Install dependencies
bun install

# Build TypeScript
bun build ./src/index.ts --outdir ./dist

# Run with Bun
bun run dist/index.js

# Run directly with Bun's TypeScript support
bun --hot src/index.ts

# Run tests
bun test
```

## Docker Configuration

```dockerfile
FROM oven/bun:1.0

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies (Bun will handle both npm and Bun packages)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN bun run build

# Expose port
EXPOSE 8000

# Run the app
CMD ["bun", "dist/index.js"]
```

## Best Practices

1. **Use Bun's Native APIs** when possible for better performance
2. **Keep Node.js Dependencies** to a minimum
3. **Test Thoroughly** after adding new dependencies
4. **Monitor Performance** using Bun's built-in tools
5. **Use TypeScript Strict Mode** for better type safety

## Troubleshooting

### Type Errors
If you encounter type errors:
1. Ensure you have the latest versions of Bun and its type definitions
2. Clear Bun's module cache: `bun clean`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && bun install`

### Performance Issues
For performance-critical code, consider:
1. Using Bun's native APIs
2. Enabling Bun's JIT compiler
3. Using WebAssembly for compute-heavy operations

## Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [Node.js Compatibility](https://bun.sh/docs/runtime/nodejs-apis)
