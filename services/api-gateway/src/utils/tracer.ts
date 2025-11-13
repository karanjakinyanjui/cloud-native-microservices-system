import { initTracer, JaegerTracer } from 'jaeger-client';
import { Tracer } from 'opentracing';
import config from '../config';
import logger from './logger';

let tracer: Tracer | null = null;

export function initializeTracer(): Tracer {
  if (tracer) {
    return tracer;
  }

  const tracerConfig = {
    serviceName: config.jaeger.serviceName,
    sampler: {
      type: config.jaeger.samplerType,
      param: config.jaeger.samplerParam,
    },
    reporter: {
      logSpans: config.env === 'development',
      agentHost: config.jaeger.agentHost,
      agentPort: config.jaeger.agentPort,
    },
  };

  const options = {
    logger: {
      info: (msg: string) => logger.info(`Jaeger: ${msg}`),
      error: (msg: string) => logger.error(`Jaeger: ${msg}`),
    },
  };

  tracer = initTracer(tracerConfig, options) as JaegerTracer;
  logger.info('Jaeger tracer initialized', {
    serviceName: config.jaeger.serviceName,
    agentHost: config.jaeger.agentHost,
    agentPort: config.jaeger.agentPort,
  });

  return tracer;
}

export function getTracer(): Tracer {
  if (!tracer) {
    return initializeTracer();
  }
  return tracer;
}

export default {
  initializeTracer,
  getTracer,
};
