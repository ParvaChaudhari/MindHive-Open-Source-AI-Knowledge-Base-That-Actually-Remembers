# Development stage
FROM node:20-slim
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

USER appuser
EXPOSE 5173

# Run Vite dev server, bound to 0.0.0.0 so it's accessible outside the container
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
