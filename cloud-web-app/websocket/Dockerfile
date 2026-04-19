FROM node:20-alpine

RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  git \
  openssh-client \
  libc6-compat

WORKDIR /app

COPY cloud-web-app/web/package.json cloud-web-app/web/package-lock.json ./
RUN npm ci

COPY cloud-web-app/web/tsconfig.json ./tsconfig.json
COPY cloud-web-app/web/server ./server
COPY cloud-web-app/web/lib ./lib

ENV NODE_ENV=production
ENV WS_PORT=3001
ENV WS_HOST=0.0.0.0

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npx", "ts-node", "--transpile-only", "server/websocket-server.ts"]
