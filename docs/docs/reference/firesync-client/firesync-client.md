---
sidebar_position: 1
---

# @firesync/client

The FireSync client can be installed with:

```sh
$ npm install --save @firesync/client
```

and included in your application with:

```js
import FireSync from '@firesync/client'
```
## Classes

<dl>
<dt><a href="#FireSync">FireSync</a></dt>
<dd></dd>
<dt><a href="#FireSyncMonacoBinding">FireSyncMonacoBinding</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#FireSyncOptions">FireSyncOptions</a> : <code>object</code></dt>
<dd><p>Parameters used to configure a new instance of a FireSync client.</p></dd>
<dt><a href="#SubscribeYDocOptions">SubscribeYDocOptions</a> : <code>object</code></dt>
<dd><p>Options for firesync.subscribeYDoc</p></dd>
<dt><a href="#SubscribeAwarenessOptions">SubscribeAwarenessOptions</a> : <code>object</code></dt>
<dd><p>Options for firesync.subscribeAwareness</p></dd>
<dt><a href="#FireSyncMonacoBindingOptions">FireSyncMonacoBindingOptions</a> : <code>object</code></dt>
<dd><p>Options for FireSyncMonacoBinding</p></dd>
</dl>

<a name="FireSync"></a>

## FireSync
**Kind**: global class  

* [FireSync](#FireSync)
    * [new FireSync(options)](#new_FireSync_new)
    * [.connected](#FireSync+connected) ⇒ <code>boolean</code>
    * [.connect()](#FireSync+connect)
    * [.disconnect()](#FireSync+disconnect)
    * [.subscribeYDoc(docKey, options)](#FireSync+subscribeYDoc) ⇒ <code>Y.Doc</code>
    * [.unsubscribe(docKey)](#FireSync+unsubscribe)
    * [.subscribeAwareness(docKey, [awareness])](#FireSync+subscribeAwareness) ⇒ <code>Awareness</code>

<a name="new_FireSync_new"></a>

### new FireSync(options)
<p>Create a new instance of a FireSync client. You will typically need one instance per client
in your application.</p>


| Param | Type |
| --- | --- |
| options | [<code>FireSyncOptions</code>](#FireSyncOptions) | 

**Example**  
```js
import FireSync from '@firesync/client'
const firesync = new FireSync({
  // If using FireSync cloud:
  projectName: 'acme-dev',
  // Or if using a local firesync-server:
  // baseUrl: 'http://localhost:5000',

  // A JWT token signed with your project secret
  token: 'my-token',

  // Whether to connect to the server immediately
  connect: true
})
```
<a name="FireSync+connected"></a>

### firesync.connected ⇒ <code>boolean</code>
<p>Returns true if the client is connected to the server, and false otherwise</p>

**Kind**: instance property of [<code>FireSync</code>](#FireSync)  
**Read only**: true  
<a name="FireSync+connect"></a>

### firesync.connect()
<p>Attempt to connect to the server.</p>
<p>The FireSync client will attempt to connect to the server when first initialized, although
this default behaviour can be overriden by passing <code>connect: false</code> when initializing.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  
**Example**  
```js
const firesync = new FireSync({
  // ...
  connect: false
})
// Connect manually later
firesync.connect()
```
<a name="FireSync+disconnect"></a>

### firesync.disconnect()
<p>Disconnect from the server.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  
**Example**  
```js
firesync.disconnect()
```
<a name="FireSync+subscribeYDoc"></a>

### firesync.subscribeYDoc(docKey, options) ⇒ <code>Y.Doc</code>
<p>Subscribe to changes to the given document and return the
a Yjs <a href="/guides/yjs">Y.Doc</a> which is kept in sync with the FireSync backend.</p>
<p>Any changes made locally to the Y.Doc will be sent to other subscribed clients, and
the Y.Doc will received any changes made by other clients.</p>
<p>If the doc has been previously unsubscribed then it will be resubscribed.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  

| Param | Type | Description |
| --- | --- | --- |
| docKey | <code>string</code> | <p>The key that identifies the document in the FireSync backend</p> |
| options | [<code>SubscribeYDocOptions</code>](#SubscribeYDocOptions) |  |

**Example**  
```js
const doc = firesync.subscribeYDoc('foo')
doc.on('update', () => {
  // Will recieve local changes and changes from
  // other subscribed clients
  console.log('Doc was updated')
})
doc.getMap('user').set('name', 'Bob')
```
<a name="FireSync+unsubscribe"></a>

### firesync.unsubscribe(docKey)
<p>Unsubscribe from the given document. The doc will no longer recieve changes made by other
clients or send changes made locally to the server.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  

| Param | Type | Description |
| --- | --- | --- |
| docKey | <code>string</code> | <p>The key that identifies the document in the FireSync backend</p> |

**Example**  
```js
firesync.unsubscribe('foo')
```
<a name="FireSync+subscribeAwareness"></a>

### firesync.subscribeAwareness(docKey, [awareness]) ⇒ <code>Awareness</code>
<p>Returns an Awareness instance which is synced with the FireSync backend
and will send any awareness updates to other clients and receive awareness
updates from other clients.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  

| Param | Type | Description |
| --- | --- | --- |
| docKey | <code>string</code> | <p>The key that identified the document in the FireSync backend</p> |
| [awareness] | <code>Awareness</code> | <p>An optional Awareness instance to use rather than returning a new instance</p> |

<a name="FireSyncMonacoBinding"></a>

## FireSyncMonacoBinding
**Kind**: global class  

* [FireSyncMonacoBinding](#FireSyncMonacoBinding)
    * [new FireSyncMonacoBinding(firesync, docKey, editor, [options])](#new_FireSyncMonacoBinding_new)
    * [.destroy()](#FireSyncMonacoBinding+destroy)

<a name="new_FireSyncMonacoBinding_new"></a>

### new FireSyncMonacoBinding(firesync, docKey, editor, [options])
<p>Create a new instance of FireSyncMonacoBinding to connect a Monaco editor instance
to a document that is synced via FireSync.</p>


| Param | Type | Description |
| --- | --- | --- |
| firesync | [<code>FireSync</code>](#FireSync) | <p>A FireSync instance</p> |
| docKey | <code>string</code> | <p>The key of the document to bind the Monaco editor to</p> |
| editor | <code>IStandaloneCodeEditor</code> | <p>A Monaco editor instance</p> |
| [options] | [<code>FireSyncMonacoBindingOptions</code>](#FireSyncMonacoBindingOptions) | <p>Configuration options</p> |

**Example**  
```js
import { FireSyncMonacoBinding } from '@firesync/client/monaco'

const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
  value: '', // Gets overwritten when FireSync doc syncs
  language: "javascript"
})
const binding = new FireSyncMonacoBinding(firesync, 'my-doc-key', editor)
```
<a name="FireSyncMonacoBinding+destroy"></a>

### binding.destroy()
<p>Remove the connection between the Monaco editor and the FireSync document</p>

**Kind**: instance method of [<code>FireSyncMonacoBinding</code>](#FireSyncMonacoBinding)  
<a name="FireSyncOptions"></a>

## FireSyncOptions : <code>object</code>
<p>Parameters used to configure a new instance of a FireSync client.</p>

**Kind**: global typedef  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| token | <code>string</code> |  | <p>A JWT signed with your project secret with a list of docs that the client can access. See <a href="/guides/authentication">Authentication</a> for more information</p> |
| [baseUrl] | <code>string</code> |  | <p>The URL of your own firesync-server.</p> |
| [projectName] | <code>string</code> |  | <p>The name of your project in FireSync Cloud.</p> |
| [connect] | <code>boolean</code> | <code>true</code> | <p>Whether FireSync should immediately connect to the server. Defaults to <code>true</code> if not provided.</p> |
| [CustomWebSocket] | <code>WebSocket</code> | <code>window.WebSocket</code> | <p>Can be used to pass in a custom WebSocket implementation. This is useful for using a FireSync client instance on the server, where can pass in the WebSocket implementation from the <a href="https://www.npmjs.com/package/ws"><code>ws</code> library</a>.</p> |

**Example**  
```js
new FireSync({
  // If using FireSync cloud:
  projectName: 'acme-dev',
  // Or if using a local firesync-server:
  // baseUrl: 'http://localhost:5000',

  // A JWT token signed with your project secret
  token: 'my-token',

  // Whether to connect to the server immediately
  connect: true
})
```
<a name="SubscribeYDocOptions"></a>

## SubscribeYDocOptions : <code>object</code>
<p>Options for firesync.subscribeYDoc</p>

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| [ydoc] | <code>Y.Doc</code> | <p>An optional existing Y.Doc to use rather than returning a new instance</p> |
| [initialize] | <code>function</code> | <p>A method which is called with the ydoc to set some initial content. This is only called after the ydoc is synced to the server and if there is no existing data in it. Any updates are done with clientID 0, so that if multiple clients set the same content, there is no conflict. <strong>This must always be called with the same content on different clients otherwise the doc could be inconsistent if two clients try to initialize different content concurrently.</strong></p> |

**Example**  
```js
firesync.subscribeYDoc('my-doc', {
  ydoc: new Y.Doc(),
  initialize: (ydoc) => {
    ydoc.getText('foo').insert(0, 'Initial content')
    ydoc.getMap('bar').set('hello', 'world')
  }
})
```
<a name="SubscribeAwarenessOptions"></a>

## SubscribeAwarenessOptions : <code>object</code>
<p>Options for firesync.subscribeAwareness</p>

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| [awareness] | <code>Awareness</code> | <p>An optional existing Awareness instance to use rather than returning a new instance</p> |

**Example**  
```js
firesync.subscribeAwareness('my-doc', {
  awareness: new Awareness()
})
```
<a name="FireSyncMonacoBindingOptions"></a>

## FireSyncMonacoBindingOptions : <code>object</code>
<p>Options for FireSyncMonacoBinding</p>

**Kind**: global typedef  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [cursors] | <code>boolean</code> | <code>true</code> | <p>Show cursors and names of other connected clients. The name and color can be set with <code>firesync.setUserDisplayName</code> and <code>firesync.setUserColor</code> on each client</p> |
| [textKey] | <code>string</code> | <code>&quot;default&quot;</code> | <p>The key to use to get a Y.Text instance from the Y.Doc. The Monaco editor is synced to the Y.Text instance at ydoc.getText(textKey)</p> |
| [ytext] | <code>Y.Text</code> |  | <p>A Y.Text instance to bind to the Monaco editor. This is useful for Y.Text instances that are nested within your Y.Doc.</p> |
| [awareness] | <code>Awareness</code> |  | <p>An existing Awareness instance to use for sharing cursor location and names between connected clients.</p> |
| [initialValue] | <code>string</code> |  | <p>An initial value to set on the Y.Text instance. See the <code>initialize</code> function in <a href="/reference/firesync-client/#subscribeydocoptions--object">SubscribeYDocOptions</a> for more information.</p> |

**Example**  
```js
// Example with custom Y.Text instance nested with Y.Doc:
const ydoc = firesync.subscribeYDoc('my-doc-key')
const ytext = new Y.Text()
// Y.Text instance must be part of doc
ydoc.getMap('foo').set('bar', ytext)
new FireSyncMonacoBinding(firesync, 'my-doc-key', editor, {
  ytext: ytext,
  initialValue: 'Hello world',
  cursors: false
})
```
