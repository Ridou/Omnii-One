FROM oven/bun:1.0-slim

WORKDIR /app

# Copy package.json and other config files
COPY package.json .
COPY tsconfig.json .

# Install dependencies
RUN bun install

# Copy source code
COPY src ./src

# Set environment variables
ARG PORT=8000
ENV PORT=${PORT}

# Expose the port
EXPOSE ${PORT}

# Start the application
CMD ["bun", "run", "src/app.ts"]