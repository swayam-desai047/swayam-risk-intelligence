FROM node:20-alpine

WORKDIR /app

# Copy dependency mappings
COPY package*.json ./

# Install packages
RUN npm install

# Copy frontend pages, styles, and assets
COPY . .

EXPOSE 3000

# Start visual web server
CMD ["npm", "run", "dev"]
