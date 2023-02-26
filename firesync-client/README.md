# firesync-client

A client to access collaborative data structure via firesync:

```ts
import { Connection, getDoc, Y } from 'firesync-client'

const connection = new Connection('localhost:5000', { 'my-doc': new Y.Doc() })

export const doc = getDoc('my-doc', {
  type: 'object',
  properties: {
    boolean: {
      type: 'boolean',
      default: false,
      optional: false
    },
    string: {
      type: 'string',
      default: '',
      optional: false
    },
    number: {
      type: 'number',
      default: 0,
      optional: false
    },
    text: {
      type: 'text'
    }
  }
}, connection.docPool)

doc.boolean = false
doc.string = 'foo'
doc.number = 42
doc.text.insert(0, 'foo')
```

## Building the package

```
npm install
```

To monitor and rebuild on changes:

```
npm run watch
```

To build once for release:

```
npm run build
```

