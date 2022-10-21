FROM node:18
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN [ "npm", "i", "--omit=dev" ]

RUN [ "apt-get", "update" ]
RUN [ "apt-get", "install", "libsodium23" ]

COPY . .

CMD [ "node", "--es-module-specifier-resolution=node", "." ]