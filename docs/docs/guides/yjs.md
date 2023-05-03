---
sidebar_position: 1
---

# Yjs

## Introduction to Yjs

FireSync is compatible with the [Yjs library](https://github.com/yjs/yjs). Yjs provides data structures for fast and reliable collaboration and the Yjs data is syncronised between all clients by FireSync for you automatically.

The top level object in Yjs is a *doc* (`Y.Doc`) and each doc can contain [Text](#text), [Maps](#map) and [Arrays](#array). Any nested combination of these types can be used in a single doc and they will be automatically synced between FireSync and anyone else subscribed to that doc. For example:

```js
const doc = firesync.subscribe("my-document");
const ymap = doc.getMap("a");
const ytext = doc.getText("b");
const yarray = doc.getArray("c");
```

## Text

```js
const doc = firesync.subscribe("my-document");

const ytext = doc.getText("foo");

// Inserting text
ytext.insert(0, "Hello");
ytext.insert(5, "world!");

// Retrieving the text
console.log(ytext.toString()); // Output: 'Hello world!'
```

See [Y.Text](https://docs.yjs.dev/api/shared-types/y.text) in the Yjs documentation for more information.

## Map

```js
const doc = firesync.subscribe("my-document");

const ymap = doc.getMap("foo");

// Setting a value
ymap.set("key1", "value1");
ymap.set("key2", "value2");

// Retrieving a value
console.log(ymap.get("key1")); // Output: 'value1'
console.log(ymap.get("otherKey")); // Set by a different user but available here too!
```

See [Y.Map](https://docs.yjs.dev/api/shared-types/y.map) in the Yjs documentation for more information.


## Array

```js
const doc = firesync.subscribe("my-document");
const yarray = doc.getArray("foo");

// Adding elements to the array
yarray.push("element1");
yarray.push("element2");

// Retrieving an element
console.log(yarray.get(0)); // Output: 'element1'
```

See [Y.Array](https://docs.yjs.dev/api/shared-types/y.array) in the Yjs documentation for more information.


## XML

Yjs also supports XML documents, which are mostly useful for supporting some rich text which use XML as an underlying data structure. [Y.XmlFragment](https://docs.yjs.dev/api/shared-types/y.xmlfragment), [XmlText](https://docs.yjs.dev/api/shared-types/y.xmltext), and [XmlElement](https://docs.yjs.dev/api/shared-types/y.xmlelement) are the three types of xml element available. The Yjs documentation has more information on these.

## Further information

More details on the data types and Yjs can be found in the [Yjs documentation](https://docs.yjs.dev/).
