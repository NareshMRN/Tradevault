FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared-schemas ./packages/shared-schemas
COPY apps/api ./apps/api

RUN npm install
RUN npm run build:schemas
RUN npm run build:api

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-schemas/dist ./packages/shared-schemas/dist
COPY --from=builder /app/packages/shared-schemas/package.json ./packages/shared-schemas/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
