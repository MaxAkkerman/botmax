FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=3000
ENV NODE_EXTRA_CA_CERTS=/app/certs/russian-trusted.pem
EXPOSE 3000

CMD ["npm", "start"]
