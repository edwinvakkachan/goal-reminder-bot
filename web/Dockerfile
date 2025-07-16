FROM node:20
WORKDIR /app

# Copy only dependency files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Now copy the rest of your app
COPY . .

CMD ["node", "server.js"]
