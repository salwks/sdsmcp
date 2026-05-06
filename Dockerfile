# SDS Generator MCP Server — minimal container for Glama / smithery / etc.
#
# This image runs the MCP server over stdio. Suitable for any MCP client
# that spawns containers (Glama's automated checks, Docker-based clients).
#
# Build:
#   docker build -t sdsmcp .
#
# Run (provide at least one API key):
#   docker run --rm -i \
#     -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
#     sdsmcp
#
# Note: the container expects to communicate via stdin/stdout (MCP stdio
# transport). Don't redirect stdout to anything other than the MCP client.

FROM node:20-alpine

# Run as non-root for hardening; node:20-alpine ships a `node` user.
WORKDIR /app
RUN chown node:node /app
USER node

# Copy only what the runtime needs. There are zero npm dependencies, so
# `npm install` is essentially a no-op, but we still run it so package-lock
# reproducibility holds.
COPY --chown=node:node package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund || true

COPY --chown=node:node lib ./lib
COPY --chown=node:node mcp-server.js sds.js ./

# Default to MCP mode. Override the CMD to use CLI mode if needed.
ENTRYPOINT ["node", "sds.js"]
CMD ["--mcp"]
