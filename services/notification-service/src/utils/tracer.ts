import { initTracer, JaegerTracer } from 'jaeger-client';
import { config } from '../config';
import { logger } from './logger';

let tracer: JaegerTracer | null = null;

export function initializeTracer(): JaegerTracer {
  if (tracer) {
    return tracer;
  }

  const tracerConfig = {
    serviceName: config.jaeger.serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: config.nodeEnv === 'development',
      agentHost: config.jaeger.agentHost,
      agentPort: config.jaeger.agentPort,
    },
  };

  const tracerOptions = {
    logger: {
      info: (msg: string) => logger.debug(msg),
      error: (msg: string) => logger.error(msg),
    },
  };

  tracer = initTracer(tracerConfig, tracerOptions);
  logger.info('Jaeger tracer initialized', {
    serviceName: config.jaeger.serviceName,
    agentHost: config.jaeger.agentHost,
    agentPort: config.jaeger.agentPort,
  });

  return tracer;
}

export function getTracer(): JaegerTracer {
  if (!tracer) {
    return initializeTracer();
  }
  return tracer;
}

export function createSpan(operationName: string, parentSpan?: any) {
  const tracer = getTracer();
  if (parentSpan) {
    return tracer.startSpan(operationName, { childOf: parentSpan });
  }
  return tracer.startSpan(operationName);
}
