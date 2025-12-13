FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install runtimes
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    curl \
    openjdk-17-jdk \
    golang-go \
    gcc g++ \
    ruby \
    php \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend deps
COPY package*.json ./
RUN npm install --production

# Copy backend
COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
