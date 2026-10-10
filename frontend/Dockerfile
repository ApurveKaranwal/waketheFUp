FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN addgroup --system --gid 1001 nodegroup && adduser --system --uid 1001 --ingroup nodegroup nodeuser

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

USER nodeuser

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_URL=http://localhost:4000

CMD ["npm", "run", "start"]