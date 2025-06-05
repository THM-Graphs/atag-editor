FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy files to container
COPY . .

# Install dependencies including devDependencies
RUN npm install

# Expose port
EXPOSE 5173
# Start app
CMD ["npm", "run", "dev", "--", "--host"]
