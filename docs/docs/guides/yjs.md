---
sidebar_position: 1
---

# Yjs - Data Types

## Introduction to Y.js

FireSync is built upon the [y.js library](https://github.com/yjs/yjs). Y. gives us data structures allowing for fast and reliable collaboration, these data structures will be syncronised between all clients by firesync for you automatically.

The three main datatypes available in Y.js are [Maps](#ymap), [Text](#ytext), [Arrays](#yarray). Any combination of these types can be taken from a single document, they will all be automatically synced between firesync and anyone else subscribed to that doc. For example:

```js
const doc = firesync.subscribe("my-document");
const ymap = doc.getMap("a");
const ytext = doc.getText("b");
const yarray = doc.getArray("c");
```

## Y.Map

```js
const doc = firesync.subscribe("my-document");

const ymap = doc.getMap("bar");

// Setting a value
ymap.set("key1", "value1");
ymap.set("key2", "value2");

// Retrieving a value
console.log(ymap.get("key1")); // Output: 'value1'
console.log(ymap.get("otherKey")); // Set by a different user but available here too!
```

## Y.Text

```js
const doc = firesync.subscribe("my-document");

const ytext = doc.getText("bar");

// Inserting text
ytext.insert(0, "Hello");
ytext.insert(5, "world!");

// Retrieving the text
console.log(ytext.toString()); // Output: 'Hello world!'
```

## Y.Array

```js
const doc = firesync.subscribe("my-document");
const ytext = doc.getArray("bar");

// Adding elements to the array
yarray.push("element1");
yarray.push("element2");

// Retrieving an element
console.log(yarray.get(0)); // Output: 'element1'
```

## XML

Yjs also supports XML documents, this can be espeically for bindings to cetain libraries. XmlFragment, XmlText, and XmlElement are the three types of xml element available.

```js

```

## Further information

More details on the data types can be found in the [Y.js documentation](https://github.com/yjs/yjs#shared-types), basic usage examples are shown below.
