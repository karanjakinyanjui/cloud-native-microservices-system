import { initTracer, JaegerTracer } from 'jaeger-client';
import { config } from '../config';
import logger from './logger';

let tracer: JaegerTracer | null = null;

export const initializeTracer = (): JaegerTracer => {
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
      logSpans: true,
      agentHost: config.jaeger.agentHost,
      agentPort: config.jaeger.agentPort,
    },
  };

  const options = {
    logger: {
      info: (msg: string) => logger.info(msg),
      error: (msg: string) => logger.error(msg),
    },
  };

  tracer = initTracer(tracerConfig, options);
  logger.info('Jaeger tracer initialized');

  return tracer;
};

export const getTracer = (): JaegerTracer => {
  if (!tracer) {
    return initializeTracer();
  }
  return tracer;
};

export default { initializeTracer, getTracer };
