FROM node:22-alpine
RUN apk update && apk upgrade --no-cache
RUN npm install -g npm@latest
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
