# Single-stage build with Node.js (better pnpm workspace support)
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10.0.0

# Set working directory to workspace root
WORKDIR /workspace

# Copy workspace configuration files
COPY ../../package.json ./
COPY ../../pnpm-workspace.yaml ./
COPY ../../pnpm-lock.yaml ./
COPY ../../turbo.json ./

# Create directory structure and copy package.json files
RUN mkdir -p apps/omnii_mcp packages
COPY package.json ./apps/omnii_mcp/
COPY ../../packages/*/package.json ./packages/*/
COPY ../../apps/*/package.json ./apps/*/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./apps/omnii_mcp/src
COPY tsconfig.json ./apps/omnii_mcp/
COPY ../../packages ./packages

# Build the application
WORKDIR /workspace/apps/omnii_mcp
RUN pnpm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Expose the port
EXPOSE 8000

# Start the application with Node.js (most compatible)
CMD ["node", "dist/app.js"]