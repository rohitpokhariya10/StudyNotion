FROM node:24-bookworm-slim AS contracts
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY server/package.json server/package.json
RUN npm ci --ignore-scripts
COPY packages/contracts packages/contracts
RUN npm run contracts:build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev --ignore-scripts \
  --workspace @studynotion/contracts \
  --workspace studynotion-backend \
  --include-workspace-root=false \
  && npm cache clean --force
COPY --from=contracts /app/packages/contracts/dist packages/contracts/dist
COPY packages/contracts/openapi.json packages/contracts/openapi.json
COPY server server
WORKDIR /app/server
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health/ready').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "index.js"]
