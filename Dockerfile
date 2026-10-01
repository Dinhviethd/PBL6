FROM node:22-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-slim AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
COPY docs/database/mvp-schema.sql /app/docs/database/mvp-schema.sql
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 STATIC_DIR=/app/public PAYMENT_MODE=disabled
COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/scripts ./scripts
COPY --from=client-builder /app/client/dist ./public
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
