import { WSInstrumentation } from 'opentelemetry-instrumentation-ws'
import { HoneycombSDK } from '@honeycombio/opentelemetry-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

const provider = new NodeTracerProvider()
provider.register()

if (process.env.HONEYCOMB_API_KEY != null) {
  // uses the HONEYCOMB_API_KEY and OTEL_SERVICE_NAME environment variables
  console.log('starting open telemetry')
  const sdk = new HoneycombSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        },
        '@opentelemetry/instrumentation-bunyan': {
          logHook: (_span, record) => {
            record['resource.service.name'] =
              provider.resource.attributes['service.name']
          }
        }
      }),
      new WSInstrumentation()
    ]
  })
  sdk.start()
}
