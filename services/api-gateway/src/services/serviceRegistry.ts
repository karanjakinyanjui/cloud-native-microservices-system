import axios, { AxiosError } from 'axios';
import config, { ServiceConfig } from '../config';
import logger from '../utils/logger';
import { serviceHealthStatus } from '../utils/metrics';

export interface ServiceHealth {
  name: string;
  url: string;
  healthy: boolean;
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

class ServiceRegistry {
  private services: Map<string, ServiceConfig>;
  private healthCache: Map<string, ServiceHealth>;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.services = new Map();
    this.healthCache = new Map();
    this.initializeServices();
  }

  private initializeServices(): void {
    // Register all services from config
    Object.entries(config.services).forEach(([key, serviceConfig]) => {
      this.services.set(serviceConfig.name, serviceConfig);
      logger.info(`Registered service: ${serviceConfig.name}`, {
        url: serviceConfig.url,
      });
    });
  }

  // Start periodic health checks
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return;
    }

    logger.info('Starting periodic health checks', {
      interval: config.healthCheckInterval,
    });

    // Initial health check
    this.checkAllServices().catch((error) => {
      logger.error('Initial health check failed', { error });
    });

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServices().catch((error) => {
        logger.error('Periodic health check failed', { error });
      });
    }, config.healthCheckInterval);
  }

  // Stop periodic health checks
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Stopped periodic health checks');
    }
  }

  // Check health of a specific service
  async checkService(serviceName: string): Promise<ServiceHealth | null> {
    const serviceConfig = this.services.get(serviceName);

    if (!serviceConfig) {
      logger.warn(`Service not found: ${serviceName}`);
      return null;
    }

    const startTime = Date.now();
    const healthUrl = `${serviceConfig.url}${serviceConfig.healthPath}`;

    try {
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });

      const responseTime = Date.now() - startTime;
      const health: ServiceHealth = {
        name: serviceName,
        url: serviceConfig.url,
        healthy: response.status === 200,
        responseTime,
        lastChecked: new Date().toISOString(),
      };

      this.healthCache.set(serviceName, health);

      // Update metrics
      serviceHealthStatus.set({ service: serviceName }, 1);

      logger.debug(`Service ${serviceName} is healthy`, {
        responseTime: `${responseTime}ms`,
      });

      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.message || 'Unknown error';

      const health: ServiceHealth = {
        name: serviceName,
        url: serviceConfig.url,
        healthy: false,
        responseTime,
        lastChecked: new Date().toISOString(),
        error: errorMessage,
      };

      this.healthCache.set(serviceName, health);

      // Update metrics
      serviceHealthStatus.set({ service: serviceName }, 0);

      logger.warn(`Service ${serviceName} is unhealthy`, {
        error: errorMessage,
        responseTime: `${responseTime}ms`,
      });

      return health;
    }
  }

  // Check health of all services
  async checkAllServices(): Promise<Record<string, ServiceHealth>> {
    const serviceNames = Array.from(this.services.keys());
    const healthChecks = serviceNames.map((name) => this.checkService(name));

    const results = await Promise.all(healthChecks);
    const healthMap: Record<string, ServiceHealth> = {};

    results.forEach((health) => {
      if (health) {
        healthMap[health.name] = health;
      }
    });

    return healthMap;
  }

  // Get cached health status
  getCachedHealth(serviceName: string): ServiceHealth | null {
    return this.healthCache.get(serviceName) || null;
  }

  // Get all cached health statuses
  getAllCachedHealth(): Record<string, ServiceHealth> {
    const healthMap: Record<string, ServiceHealth> = {};

    this.healthCache.forEach((health, name) => {
      healthMap[name] = health;
    });

    return healthMap;
  }

  // Get service configuration
  getService(serviceName: string): ServiceConfig | null {
    return this.services.get(serviceName) || null;
  }

  // Get all services
  getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  // Check if service is healthy
  isServiceHealthy(serviceName: string): boolean {
    const health = this.healthCache.get(serviceName);
    return health?.healthy || false;
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();

export default serviceRegistry;
