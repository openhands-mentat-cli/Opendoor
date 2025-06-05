#!/bin/bash
set -e

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local timeout=${3:-30}
    
    echo "Waiting for $service on port $port..."
    for i in $(seq 1 $timeout); do
        if nc -z localhost $port 2>/dev/null; then
            echo "$service is ready!"
            return 0
        fi
        sleep 1
    done
    echo "Timeout waiting for $service"
    return 1
}

# Function to wait for Docker socket
wait_for_docker() {
    local timeout=${1:-30}
    
    echo "Waiting for Docker socket..."
    for i in $(seq 1 $timeout); do
        if docker version >/dev/null 2>&1; then
            echo "Docker is ready!"
            return 0
        fi
        sleep 1
    done
    echo "Timeout waiting for Docker"
    return 1
}

# Start supervisor in background
supervisord -c /etc/supervisor/conf.d/supervisord.conf &

# Wait for Redis to be ready
wait_for_service "Redis" 6379

# Check if Docker socket is available (optional, as it's mounted from host)
if [ -S /var/run/docker.sock ]; then
    echo "Docker socket is available"
    # Try to test Docker connection
    if docker version >/dev/null 2>&1; then
        echo "Docker is accessible!"
    else
        echo "Docker socket exists but not accessible (this is normal in some environments)"
    fi
else
    echo "Docker socket not found (this is normal for testing without Docker)"
fi

echo "All services are ready. MCP Server starting..."

# Keep the container running
wait