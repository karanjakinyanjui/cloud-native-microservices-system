import { initTracer as jaegerInitTracer, JaegerTracer } from 'jaeger-client';
import { config } from '../config';
import { logger } from './logger';

export function initTracer(serviceName: string): JaegerTracer {
  const tracerConfig = {
    serviceName: serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: config.env !== 'production',
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

  return jaegerInitTracer(tracerConfig, options);
}
