#!/bin/bash
#
# Script to test Jaeger trace submission
#

set -e

JAEGER_COLLECTOR=${JAEGER_COLLECTOR:-"http://localhost:14268"}
TRACE_FILE=${TRACE_FILE:-"test-trace.json"}

echo "Testing Jaeger trace submission..."
echo "Collector endpoint: $JAEGER_COLLECTOR"
echo "Trace file: $TRACE_FILE"

# Port forward Jaeger collector if running in K8s
if [ "$1" == "--k8s" ]; then
    echo "Setting up port-forward to Jaeger collector..."
    kubectl port-forward svc/jaeger-collector 14268:14268 &
    PF_PID=$!
    sleep 3
    JAEGER_COLLECTOR="http://localhost:14268"

    cleanup() {
        echo "Cleaning up port-forward..."
        kill $PF_PID 2>/dev/null || true
    }
    trap cleanup EXIT
fi

# Check if collector is reachable
echo "Checking collector health..."
if curl -sf "${JAEGER_COLLECTOR}/" > /dev/null; then
    echo "✓ Collector is healthy"
else
    echo "✗ Collector is not reachable"
    exit 1
fi

# Submit test trace
echo "Submitting test trace..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${JAEGER_COLLECTOR}/api/traces" \
    -H "Content-Type: application/json" \
    -d @"${TRACE_FILE}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "202" ]; then
    echo "✓ Trace submitted successfully (HTTP $HTTP_CODE)"

    # Extract trace ID from file
    TRACE_ID=$(grep -o '"traceID": "[^"]*"' "$TRACE_FILE" | head -1 | cut -d'"' -f4)
    echo ""
    echo "Trace ID: $TRACE_ID"
    echo "View in UI: http://localhost:16686/trace/$TRACE_ID"
    echo ""
    echo "Waiting 5 seconds for trace to be indexed..."
    sleep 5

    # Try to query the trace
    echo "Querying trace from API..."
    QUERY_RESPONSE=$(curl -s "${JAEGER_COLLECTOR%:*}:16686/api/traces/$TRACE_ID")

    if echo "$QUERY_RESPONSE" | grep -q "\"traceID\":\"$TRACE_ID\""; then
        echo "✓ Trace found in Jaeger!"
    else
        echo "⚠ Trace not yet indexed (may take a few seconds)"
    fi
else
    echo "✗ Failed to submit trace (HTTP $HTTP_CODE)"
    echo "Response: $(echo "$RESPONSE" | head -n-1)"
    exit 1
fi

echo ""
echo "Test completed successfully!"
