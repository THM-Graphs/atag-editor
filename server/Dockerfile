FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy files to container
COPY . .

# Install dependencies including devDependencies
RUN npm install

# Compile TS files to JS files on first creation
RUN npm run compile

# Expose port
EXPOSE 8080

# Command to start the application in development mode
CMD ["npm" ,"run", "dev"]
