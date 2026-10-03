FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js test.mjs articles.json ./
ENV NODE_ENV=production
RUN npm test
EXPOSE 3000
CMD ["node","server.js"]
