import { getKnexConfig } from './config'

export default {
  development: getKnexConfig(),
  production: getKnexConfig()
}
