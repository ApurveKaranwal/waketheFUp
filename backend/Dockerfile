FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /app

RUN addgroup --system --gid 1001 bungroup && adduser --system --uid 1001 --ingroup bungroup bunuser
RUN mkdir -p /data /logs && chown -R bunuser:bungroup /data /logs

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY backend ./backend
COPY tsconfig.json ./

RUN bun x prisma generate --schema=backend/prisma/schema.prisma

USER bunuser

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["bun", "run", "--smol", "backend/index.ts"]