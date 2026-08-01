FROM node:22-alpine
RUN npm install -g npm@latest
RUN cd /usr/local/lib/node_modules/npm && npm install brace-expansion@5.0.8
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
