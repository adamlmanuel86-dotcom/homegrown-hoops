FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @workspace/db run push-force && pnpm --filter @workspace/api-server run start"]
