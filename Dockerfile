FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY server/package.json server/package.json
RUN npm ci --ignore-scripts
COPY . .

ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_SUPPORT_EMAIL
ARG VITE_LEGAL_ENTITY_NAME
ARG VITE_LEGAL_ADDRESS
ARG VITE_LEGAL_JURISDICTION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL
ENV VITE_LEGAL_ENTITY_NAME=$VITE_LEGAL_ENTITY_NAME
ENV VITE_LEGAL_ADDRESS=$VITE_LEGAL_ADDRESS
ENV VITE_LEGAL_JURISDICTION=$VITE_LEGAL_JURISDICTION

RUN npm run build
RUN node scripts/render-nginx-config.mjs

FROM nginx:1.29-alpine
COPY --from=build /app/nginx.rendered.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
