const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
import { WSInstrumentation } from "opentelemetry-instrumentation-ws";
const { HoneycombSDK } = require('@honeycombio/opentelemetry-node');
const {
  getNodeAutoInstrumentations,
} = require('@opentelemetry/auto-instrumentations-node');

export const telemetry = {
  start: () => {
    if (process.env.HONEYCOMB_API_KEY != null) {
      // uses the HONEYCOMB_API_KEY and OTEL_SERVICE_NAME environment variables
      const sdk = new HoneycombSDK({
        instrumentations: [
          getNodeAutoInstrumentations(),
          new HttpInstrumentation(),
          new ExpressInstrumentation(),
          new WSInstrumentation()]
      });
      sdk.start()
    }
  }
}
