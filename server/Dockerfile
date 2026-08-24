FROM node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03
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
COPY packages/contracts/src packages/contracts/src
COPY packages/contracts/openapi.json packages/contracts/openapi.json
COPY server server
WORKDIR /app/server
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health/ready').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "index.js"]
