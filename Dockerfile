FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
