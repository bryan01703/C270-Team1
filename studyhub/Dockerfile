FROM node:22-alpine
RUN apk update && apk upgrade --no-cache
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
