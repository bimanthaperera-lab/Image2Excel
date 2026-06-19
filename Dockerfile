# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend source
COPY . .
# Build the frontend with an empty API base URL so it queries the same origin
RUN VITE_API_BASE_URL="" pnpm run build


# Stage 2: Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ backend/

# Copy built frontend from the builder stage
COPY --from=frontend-builder /app/dist /app/dist

# Railway provides the PORT environment variable. If not set, default to 8000.
EXPOSE 8000
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
