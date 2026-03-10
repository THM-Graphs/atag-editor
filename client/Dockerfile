FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy files to container
COPY . .

# Install dependencies
RUN npm install
# Ensure Rollup's optional native binary for this platform is installed (npm optionalDeps bug)
RUN npm install @rollup/rollup-linux-arm64-musl@4.40.2 --no-save || npm install @rollup/rollup-linux-x64-musl@4.40.2 --no-save

# Expose port
EXPOSE 5173
# Start app
CMD ["npm", "run", "dev", "--", "--host"]
