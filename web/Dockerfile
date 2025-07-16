FROM node:20
WORKDIR /app

# Copy only package.json for clean install
COPY package*.json ./

RUN npm install

# Then copy the rest
COPY . .

CMD ["node", "server.js"]
