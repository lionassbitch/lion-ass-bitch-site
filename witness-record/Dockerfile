# THE WITNESS RECORD — production image
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --system --create-home --uid 10001 witness
COPY --from=build --chown=witness:witness /app/package.json ./
COPY --from=build --chown=witness:witness /app/node_modules ./node_modules
COPY --from=build --chown=witness:witness /app/dist ./dist
COPY --from=build --chown=witness:witness /app/migrations ./migrations
COPY --from=build --chown=witness:witness /app/server/assets ./server/assets
USER witness
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/index.js"]
