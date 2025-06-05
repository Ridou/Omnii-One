# Express to Elysia Migration Guide

This guide provides a simple, step-by-step approach to migrate your Express application to Elysia with Bun.

## 1. Install Dependencies

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install Elysia and required plugins
bun add @elysiajs/cors @elysiajs/helmet
```

## 2. Update package.json

Update your scripts section:

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "build": "bun build ./src/index.ts --outdir ./dist"
  }
}
```

## 3. Migrate index.ts

Convert your Express app to Elysia:

```typescript
// Before: Express
import express from 'express';
const app = express();
app.use(express.json());
app.listen(3000);

// After: Elysia
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { helmet } from '@elysiajs/helmet';

const app = new Elysia()
  .use(cors())
  .use(helmet())
  .listen(3000);
```

## 4. Convert Routes

### Basic Route Conversion

```typescript
// Before: Express
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

// After: Elysia
app.get('/api/hello', () => ({
  message: 'Hello World'
}));
```

### Route with Parameters

```typescript
// Before: Express
app.get<{ id: string }>('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  res.json({ userId });
});

// After: Elysia with TypeBox
import { t } from 'elysia';

const UserParams = t.Object({
  id: t.Numeric()
});

type UserParams = (typeof UserParams)['static'];

app.get('/api/users/:id', 
  ({ params: { id } }) => ({
    userId: id
  }),
  {
    params: UserParams,
    response: {
      200: t.Object({
        userId: t.Number()
      }),
      400: t.Object({
        error: t.String(),
        details: t.Optional(t.String())
      })
    },
    detail: {
      summary: 'Get user by ID',
      tags: ['Users']
    }
  }
);
```

### Request Body with Type Safety

```typescript
// Before: Express
interface UserBody {
  name: string;
  email: string;
}

app.post('/api/users', (req: Request<{}, {}, UserBody>, res: Response) => {
  const { name, email } = req.body;
  res.status(201).json({ name, email });
});

// After: Elysia with TypeBox
import { t } from 'elysia';

const UserDTO = t.Object({
  name: t.String(),
  email: t.String({ format: 'email' })
});

type UserDTO = (typeof UserDTO)['static'];

app.post('/api/users', 
  ({ body }) => ({
    name: body.name,
    email: body.email
  }),
  {
    body: UserDTO,
    response: {
      201: UserDTO,
      400: t.Object({
        error: t.String(),
        details: t.Optional(t.String())
      })
    },
    detail: {
      summary: 'Create a new user',
      tags: ['Users']
    }
  }
);
```

## 5. Error Handling with Types

### Global Error Handler

```typescript
// Before: Express
interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// After: Elysia with Type Safety
import { Elysia, t } from 'elysia';

// Define error types
const ErrorResponse = t.Object({
  error: t.String(),
  code: t.Optional(t.String()),
  details: t.Optional(t.Any()),
  stack: t.Optional(t.String())
});

type ErrorResponse = (typeof ErrorResponse)['static'];

// Custom error class
class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Global error handler
app.onError(({ code, error, set }) => {
  // Log the error
  console.error('Error:', error);

  // Set status code
  const status = error instanceof AppError ? error.status : 500;
  set.status = status;

  // Prepare error response
  const response: ErrorResponse = {
    error: error.message || 'Internal Server Error',
    code: error instanceof AppError ? error.code : code,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack 
    })
  };

  return response;
});

// Example of throwing a typed error in a route
app.get('/protected', () => {
  const isAuthorized = false; // Your auth logic here
  
  if (!isAuthorized) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  return { message: 'Welcome!' };
}, {
  response: {
    200: t.Object({
      message: t.String()
    }),
    401: ErrorResponse
  }
});
```

## 6. Middleware

```typescript
// Before: Express
app.use((req, res, next) => {
  console.log('Request received');
  next();
});

// After: Elysia
app.onRequest(() => {
  console.log('Request received');
});
```

## 7. Running the Application

```bash
# Development (with hot reloading)
bun run dev

# Production build
bun run build
bun start
```

## 8. Testing

```typescript
// test/app.test.ts
import { describe, expect, it } from 'bun:test';
import { app } from '../src/index';

describe('Elysia', () => {
  it('returns a response', async () => {
    const response = await app.handle(new Request('http://localhost/')).then(res => res.json());
    expect(response).toEqual({ message: 'Hello Elysia' });
  });
});
```

Run tests with:

```bash
bun test
```

## 9. Next Steps

1. Gradually migrate routes from Express to Elysia
2. Update any middleware to use Elysia's plugin system
3. Take advantage of Elysia's built-in features like validation and type safety
4. Consider using Elysia's dependency injection for better testability

## Common Issues & Solutions

### 1. TypeScript Errors
If you see TypeScript errors, ensure you have these in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

### 2. Missing Middleware
Most Express middleware has an Elysia equivalent. Search for `@elysiajs/` packages or implement custom middleware using Elysia's hooks.

### 3. Request/Response Differences
Elysia's context combines request and response. Use destructuring to access what you need:

```typescript
app.get('/', ({ headers, query, params, body, set }) => {
  // Set headers
  set.headers['X-Custom-Header'] = 'value';
  
  // Return response
  return { success: true };
});
```

## Resources

- [Elysia Documentation](https://elysiajs.com/)
- [Bun Documentation](https://bun.sh/docs)
- [Migrating from Express to Elysia](https://elysiajs.com/patterns/migrate-from-express.html)
