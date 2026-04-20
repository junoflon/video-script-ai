FROM node:20-slim

# Install system dependencies (ffmpeg, python3 for yt-dlp, unzip for deno)
RUN apt-get update && apt-get install -y \
  ffmpeg \
  python3 \
  curl \
  unzip \
  ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- -y \
  && ln -sf /usr/local/bin/deno /usr/bin/deno \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Start
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
