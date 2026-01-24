# Build stage
FROM node:20-slim as builder

# Install pnpm using corepack (included with Node.js 16+)
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/omnii_mcp/package.json ./apps/omnii_mcp/
COPY packages/ ./packages/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application if needed
# RUN pnpm run build

# Install stage - use pnpm to install the specific app
FROM node:20-slim as installer

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/apps/omnii_mcp /app/apps/omnii_mcp
COPY --from=builder /app/package.json /app/
COPY --from=builder /app/pnpm-lock.yaml /app/
COPY --from=builder /app/pnpm-workspace.yaml /app/
COPY --from=builder /app/packages /app/packages

# Install omnii_mcp app using pnpm
RUN pnpm install --frozen-lockfile

# Runtime stage - use bun to run the application
FROM oven/bun:1.0-slim

WORKDIR /app

# Copy the installed application from installer stage
COPY --from=installer /app /app

# Set environment variables
ARG PORT=8000
ENV PORT=${PORT}
ENV NODE_ENV=production

# Expose the port
EXPOSE ${PORT}

# Set working directory to the app
WORKDIR /app/apps/omnii_mcp

# Start the application using bun
CMD ["bun", "run", "src/app.ts"]