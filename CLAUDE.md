# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Omnii is an AI-powered productivity platform built as a TypeScript monorepo. The system consists of a React Native mobile app, AI backend services, and Python RDF semantic analysis services. The platform features gamified task management, universal integrations, and intelligent automation.

## Architecture

### Monorepo Structure
- **apps/omnii-mobile**: React Native mobile app with web support
- **apps/omnii_mcp**: Model Context Protocol backend services (Bun + Elysia)
- **apps/python-rdf**: RDF semantic analysis service (Python + FastAPI)
- **packages/**: Shared packages (API, auth, database, UI, validators)
- **tooling/**: Development tooling (ESLint, Prettier, Tailwind, TypeScript configs)

### Technology Stack
- **Frontend**: React Native + Expo + NativeWind V4 + React 19
- **Backend**: Bun runtime + Elysia framework + tRPC v11
- **Database**: Supabase + PostgreSQL + Neo4j (graph database)
- **AI/ML**: OpenAI integration + Custom LLM services
- **Auth**: Better-auth + OAuth (Google, Apple)
- **Build System**: Turborepo + pnpm workspaces

## Common Development Commands

### Project Setup
```bash
# Install dependencies
pnpm install

# Start all services in development
pnpm dev

# Start specific apps
pnpm dev:local  # Mobile + MCP backend only
```

### Mobile App Development
```bash
# Start mobile app with development client
cd apps/omnii-mobile
pnpm dev              # Development client
pnpm dev:web          # Web version
pnpm dev:ios          # iOS simulator
pnpm dev:android      # Android emulator

# Asset generation
pnpm generate:assets  # Generate all platform assets
pnpm generate:ios     # iOS-specific assets
pnpm generate:android # Android-specific assets
```

### Backend Services
```bash
# MCP Backend (apps/omnii_mcp)
cd apps/omnii_mcp
bun run dev           # Development with hot reload
bun run build         # Production build
bun run test          # Run all tests
bun run test:integration  # Integration tests only

# Python RDF Service (apps/python-rdf)
cd apps/python-rdf
python -m uvicorn app.main:app --reload
```

### Database Operations
```bash
# Supabase/PostgreSQL
pnpm db:push          # Push schema changes
pnpm db:studio        # Open database studio

# Neo4j operations are handled via the MCP service
```

### Code Quality
```bash
# Linting and formatting
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm format           # Check formatting
pnpm format:fix       # Fix formatting
pnpm typecheck        # TypeScript type checking

# Workspace validation
pnpm lint:ws          # Validate workspace dependencies
```

### Testing
```bash
# Run tests across all packages
pnpm test

# Mobile app testing
cd apps/omnii-mobile
pnpm test             # Unit tests
pnpm test:oauth       # OAuth integration tests

# Backend testing
cd apps/omnii_mcp
bun test              # All tests
bun run test:neo4j    # Neo4j tests
bun run test:composio # Composio integration tests
bun run test:sms-ai   # SMS AI service tests
```

## Development Workflow

### Adding New Features
1. Use existing Zod schemas from `unified-response.validation.ts` when possible
2. Follow the approval system patterns established in `.cursor/rules/approvals.mdc`
3. Maintain React Native + Expo compatibility for mobile components
4. Use NativeWind V4 for styling consistency across platforms

### Authentication Flow
- Better-auth handles OAuth with Google and Apple
- Mobile app uses Expo AuthSession for secure token handling
- Backend validates tokens via Supabase integration
- Debug authentication with built-in OAuth debugger components

### AI Service Integration
- MCP backend handles AI context protocol
- Composio integration for Google services (Calendar, Tasks, Contacts)
- Twilio integration for SMS AI services
- OpenAI integration for natural language processing
- Neo4j stores conversation memory and temporal context

### Mobile App Patterns
- Use Expo Router for navigation
- NativeWind V4 for cross-platform styling
- React Query for server state management
- Zustand for client state management
- Implement proper error boundaries and loading states

### Backend Service Patterns
- Bun runtime with Elysia framework for performance
- tRPC for type-safe API communication
- Redis caching for frequently accessed data
- Neo4j for graph-based memory and relationship storage
- Zod validation for runtime type safety

## Key Configuration Files

### Environment Setup
- `.env` files are workspace-specific
- Mobile app: `apps/omnii-mobile/env.template`
- Backend: `apps/omnii_mcp/.env` (not in repo)
- Required environment variables documented in README

### Build Configuration
- `turbo.json`: Turborepo pipeline configuration
- `pnpm-workspace.yaml`: Package manager workspace config
- Each app has its own build configuration (Expo, Bun, etc.)

### TypeScript Configuration
- Shared configs in `tooling/typescript/`
- App-specific extends from shared base configurations
- Strict mode enabled across all packages

## Important Notes

### Mobile Development
- Use Expo Dev Client for custom native code
- Test on both iOS and Android simulators
- Web version available via Expo for web
- Asset generation system handles all platform requirements

### Backend Development
- Bun runtime provides fast TypeScript execution
- Neo4j requires local instance or cloud connection
- MCP (Model Context Protocol) enables AI service communication
- Comprehensive test suite covers integration scenarios

### Debugging
- Mobile: Use Expo developer tools and React Native debugger
- Backend: Built-in debug logging and test scripts
- Database: Supabase studio for PostgreSQL, Neo4j browser for graph data

### Performance Considerations
- Mobile: Optimize for 60fps animations using native driver
- Backend: Use Redis caching for expensive operations
- Database: Index graph queries appropriately in Neo4j
- Build: Turborepo caching speeds up development builds

## Troubleshooting

### Common Issues
- **Metro bundler cache**: Clear with `pnpm dev:local --clear`
- **Node modules**: Run `pnpm clean` then `pnpm install`
- **TypeScript errors**: Run `pnpm typecheck` to identify issues
- **Expo builds**: Ensure EAS CLI is properly configured

### Platform-Specific
- **iOS**: Requires Xcode and iOS simulator
- **Android**: Requires Android Studio and emulator
- **Web**: Works with any modern browser
- **Backend**: Requires Bun runtime and Neo4j database

This architecture enables rapid development of AI-powered productivity features while maintaining type safety and cross-platform compatibility.