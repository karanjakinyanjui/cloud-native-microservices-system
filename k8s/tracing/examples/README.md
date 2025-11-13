# Jaeger Tracing Examples

This directory contains examples for instrumenting services and testing Jaeger tracing.

## Files

- **service-instrumentation.yaml**: Example Kubernetes deployments with Jaeger configuration
- **test-trace.json**: Sample trace data for testing
- **test-trace.sh**: Script to submit test traces to Jaeger

## Service Instrumentation Examples

### 1. Basic Instrumentation

Deploy a service with environment variables for Jaeger:

```bash
kubectl apply -f service-instrumentation.yaml
```

The service will automatically connect to the Jaeger agent running on the node.

### 2. Sidecar Pattern

Some scenarios require a dedicated Jaeger agent per pod:

```yaml
containers:
- name: jaeger-agent
  image: jaegertracing/jaeger-agent:1.51
  args:
  - --reporter.grpc.host-port=jaeger-collector:14250
```

### 3. Direct to Collector

For services that can't use UDP (some cloud environments):

```yaml
env:
- name: JAEGER_ENDPOINT
  value: "http://jaeger-collector:14268/api/traces"
```

## Testing Trace Submission

### Using the Test Script

```bash
# Make script executable
chmod +x test-trace.sh

# Test locally (requires port-forward)
./test-trace.sh --k8s

# Or manually port-forward first
kubectl port-forward svc/jaeger-collector 14268:14268 &
./test-trace.sh
```

### Manual Test with curl

```bash
# Port forward collector
kubectl port-forward svc/jaeger-collector 14268:14268

# Submit trace
curl -X POST http://localhost:14268/api/traces \
  -H "Content-Type: application/json" \
  -d @test-trace.json

# View in UI (requires port-forward to query service)
kubectl port-forward svc/jaeger-query 16686:16686
# Open: http://localhost:16686
```

## Language-Specific Examples

### Go

```go
package main

import (
    "context"
    "github.com/opentracing/opentracing-go"
    "github.com/uber/jaeger-client-go"
    "github.com/uber/jaeger-client-go/config"
)

func main() {
    cfg := config.Configuration{
        ServiceName: "my-service",
        Sampler: &config.SamplerConfig{
            Type:  jaeger.SamplerTypeProbabilistic,
            Param: 0.5,
        },
        Reporter: &config.ReporterConfig{
            LogSpans:           true,
            LocalAgentHostPort: "jaeger-agent:6831",
        },
    }

    tracer, closer, _ := cfg.NewTracer()
    defer closer.Close()
    opentracing.SetGlobalTracer(tracer)

    // Create span
    span := tracer.StartSpan("operation-name")
    defer span.Finish()

    // Add tags
    span.SetTag("http.method", "GET")
    span.SetTag("http.url", "/api/users")

    // Log events
    span.LogKV("event", "processing", "user_id", 123)

    // Propagate context
    ctx := opentracing.ContextWithSpan(context.Background(), span)
    doWork(ctx)
}

func doWork(ctx context.Context) {
    span, ctx := opentracing.StartSpanFromContext(ctx, "do-work")
    defer span.Finish()

    // ... your code ...
}
```

### Python

```python
from jaeger_client import Config
from opentracing import tracer

def init_tracer(service_name):
    config = Config(
        config={
            'sampler': {
                'type': 'probabilistic',
                'param': 0.5,
            },
            'local_agent': {
                'reporting_host': 'jaeger-agent',
                'reporting_port': 6831,
            },
            'logging': True,
        },
        service_name=service_name,
    )
    return config.initialize_tracer()

# Initialize
tracer = init_tracer('my-python-service')

# Create span
with tracer.start_active_span('operation-name') as scope:
    scope.span.set_tag('http.method', 'POST')
    scope.span.set_tag('user.id', 123)
    scope.span.log_kv({'event': 'processing', 'details': 'user data'})

    # Nested span
    with tracer.start_active_span('database-query', child_of=scope.span) as child_scope:
        child_scope.span.set_tag('db.type', 'postgresql')
        # ... query database ...
```

### Node.js

```javascript
const initJaegerTracer = require('jaeger-client').initTracer;

function initTracer(serviceName) {
  const config = {
    serviceName: serviceName,
    sampler: {
      type: 'probabilistic',
      param: 0.5,
    },
    reporter: {
      agentHost: 'jaeger-agent',
      agentPort: 6831,
      logSpans: true,
    },
  };

  return initJaegerTracer(config);
}

// Initialize
const tracer = initTracer('my-node-service');

// Create span
const span = tracer.startSpan('operation-name');
span.setTag('http.method', 'GET');
span.setTag('http.url', '/api/products');

// Log event
span.log({
  event: 'processing',
  product_id: 456,
});

// Create child span
const childSpan = tracer.startSpan('database-query', {
  childOf: span.context(),
});
childSpan.setTag('db.type', 'mongodb');

// ... do work ...

childSpan.finish();
span.finish();
```

### Java

```java
import io.jaegertracing.Configuration;
import io.opentracing.Span;
import io.opentracing.Tracer;
import io.opentracing.util.GlobalTracer;

public class TracingExample {
    public static void main(String[] args) {
        // Initialize tracer
        Configuration config = new Configuration("my-java-service")
            .withSampler(Configuration.SamplerConfiguration.fromEnv()
                .withType("probabilistic")
                .withParam(0.5))
            .withReporter(Configuration.ReporterConfiguration.fromEnv()
                .withLogSpans(true)
                .withSender(Configuration.SenderConfiguration.fromEnv()
                    .withAgentHost("jaeger-agent")
                    .withAgentPort(6831)));

        Tracer tracer = config.getTracer();
        GlobalTracer.registerIfAbsent(tracer);

        // Create span
        Span span = tracer.buildSpan("operation-name").start();
        span.setTag("http.method", "POST");
        span.setTag("user.id", 123);

        try {
            // Do work
            span.log("Processing request");

            // Create child span
            Span childSpan = tracer.buildSpan("database-query")
                .asChildOf(span)
                .start();
            childSpan.setTag("db.type", "mysql");

            try {
                // ... query database ...
            } finally {
                childSpan.finish();
            }
        } finally {
            span.finish();
        }
    }
}
```

## HTTP Header Propagation

### Trace Context Headers

Jaeger uses the following HTTP headers for trace context propagation:

```
uber-trace-id: {trace-id}:{span-id}:{parent-span-id}:{flags}
```

Example:
```
uber-trace-id: 1234567890abcdef:fedcba0987654321:0:1
```

### Example: Propagating Context

```bash
# Extract trace ID from response headers
TRACE_ID=$(curl -v http://user-service/api/users 2>&1 | grep -i uber-trace-id | awk '{print $3}')

# Pass to next service
curl -H "uber-trace-id: $TRACE_ID" http://order-service/api/orders
```

## Debugging

### Check if Service is Sending Traces

```bash
# Check agent metrics
kubectl exec -it $(kubectl get pod -l component=agent -o jsonpath='{.items[0].metadata.name}') \
  -- wget -qO- http://localhost:14271/metrics | grep spans_received

# Check collector metrics
kubectl port-forward svc/jaeger-collector 14269:14269
curl http://localhost:14269/metrics | grep spans_received
```

### Verify Trace Storage

```bash
# Check Elasticsearch indices
kubectl exec -it elasticsearch-0 -- curl -s http://localhost:9200/_cat/indices?v | grep jaeger

# Query recent traces
kubectl exec -it elasticsearch-0 -- curl -s "http://localhost:9200/jaeger-span-*/_search?size=1&sort=startTime:desc&pretty"
```

### Common Issues

1. **No traces appearing**: Check agent connectivity and sampling rate
2. **High latency**: Increase collector resources or enable batching
3. **Storage full**: Adjust retention policy in curator config
4. **Memory issues**: Reduce queue size and number of workers

## Best Practices

1. **Use meaningful span names**: `POST /api/orders` instead of `handle`
2. **Add relevant tags**: Include user ID, request ID, etc.
3. **Log important events**: Database queries, external API calls
4. **Propagate context**: Always pass trace context between services
5. **Monitor sampling**: Adjust based on traffic and storage capacity
6. **Handle errors**: Tag spans with error=true and log stack traces
