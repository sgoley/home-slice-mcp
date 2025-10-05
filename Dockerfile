FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY index.js ./

# Make index.js executable
RUN chmod +x index.js

# Environment variable for API key (can be overridden at runtime)
ENV HOMESLICE_API_KEY=""

# Run the MCP server
CMD ["node", "index.js"]
