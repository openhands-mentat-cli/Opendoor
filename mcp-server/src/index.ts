#!/usr/bin/env node

import { MCPServer } from '@ronangrant/mcp-framework';
import { Logger } from './utils/Logger.js';
import { ConfigService } from './services/ConfigService.js';
import { SessionManager } from './session/SessionManager.js';
import { ContainerManager } from './container/ContainerManager.js';
import { SecurityManager } from './security/SecurityManager.js';
import { HealthService } from './services/HealthService.js';

const logger = Logger.getInstance();

// Global services that will be injected into tools
export let globalServices: {
  sessionManager: SessionManager;
  containerManager: ContainerManager;
  securityManager: SecurityManager;
  configService: ConfigService;
  healthService: HealthService;
} | null = null;

async function initializeServices() {
  const startTime = Date.now();
  logger.info('🚀 Starting Opendoor MCP Server initialization...');

  try {
    // Initialize services in parallel for faster boot time
    const [
      configService,
      sessionManager,
      containerManager,
      securityManager,
      healthService
    ] = await Promise.all([
      Promise.resolve(new ConfigService()),
      new SessionManager().initialize(),
      new ContainerManager().initialize(),
      Promise.resolve(new SecurityManager()),
      Promise.resolve(new HealthService())
    ]);

    const bootTime = Date.now() - startTime;
    logger.info(`✅ Services initialized in ${bootTime}ms`);

    globalServices = {
      configService,
      sessionManager,
      containerManager,
      securityManager,
      healthService
    };

    return globalServices;
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

async function main() {
  try {
    // Initialize services first
    await initializeServices();

    // Determine transport type from environment
    const useSSE = process.env.MCP_TRANSPORT === 'sse';
    const port = parseInt(process.env.PORT || '8080');

    // Create MCP server with appropriate transport
    const server = new MCPServer({
      name: "opendoor-mcp-server",
      version: "2.0.0",
      transport: useSSE ? {
        type: "sse",
        options: {
          port,
          cors: {
            allowOrigin: process.env.ALLOWED_ORIGINS || "*",
            allowMethods: "GET, POST, OPTIONS",
            allowHeaders: "Content-Type, Authorization, X-API-Key, X-Client-ID",
            exposeHeaders: "Content-Type, Authorization, X-API-Key",
            maxAge: "86400"
          }
        }
      } : {
        type: "stdio"
      }
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        if (globalServices) {
          await Promise.all([
            globalServices.sessionManager?.cleanup(),
            globalServices.containerManager?.cleanup()
          ]);
        }
        
        await server.stop();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error(`Error during shutdown: ${error}`);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Start the server
    logger.info(`🎉 Starting Opendoor MCP Server with ${useSSE ? 'SSE' : 'STDIO'} transport`);
    if (useSSE) {
      logger.info(`📡 SSE endpoint will be available on port ${port}`);
    }
    logger.info('🔧 Multi-language code execution environment ready');
    logger.info('🖥️  VS Code integration enabled');
    logger.info('🎭 Playwright browser automation ready');
    
    await server.start();

  } catch (error) {
    logger.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main();
