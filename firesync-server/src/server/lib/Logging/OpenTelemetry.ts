import { WSInstrumentation } from 'opentelemetry-instrumentation-ws'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { HoneycombSDK } from '@honeycombio/opentelemetry-node'
import { KnexInstrumentation } from '@opentelemetry/instrumentation-knex'
import { BunyanInstrumentation } from '@opentelemetry/instrumentation-bunyan'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

if (process.env.HONEYCOMB_API_KEY != null) {
  // uses the HONEYCOMB_API_KEY and OTEL_SERVICE_NAME environment variables
  console.log('starting open telemetry')
  const sdk = new HoneycombSDK({
    instrumentations: [
      getNodeAutoInstrumentations(),
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new WSInstrumentation(),
      new KnexInstrumentation(),
      new BunyanInstrumentation()
    ]
  })
  sdk.start()
}
