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

# Start supervisor in background
supervisord -c /etc/supervisor/conf.d/supervisord.conf &

# Wait for Redis to be ready
wait_for_service "Redis" 6379

# Wait for Docker daemon to be ready
wait_for_service "Docker" 2376

echo "All services are ready. MCP Server starting..."

# Keep the container running
wait