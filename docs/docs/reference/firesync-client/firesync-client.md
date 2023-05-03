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
</dl>

## Typedefs

<dl>
<dt><a href="#FireSyncOptions">FireSyncOptions</a> : <code>object</code></dt>
<dd><p>Parameters used to configure a new instance of a FireSync client.</p></dd>
</dl>

<a name="FireSync"></a>

## FireSync
**Kind**: global class  

* [FireSync](#FireSync)
    * [new FireSync(options)](#new_FireSync_new)
    * [.connected](#FireSync+connected) ⇒ <code>boolean</code>
    * [.connect()](#FireSync+connect)
    * [.disconnect()](#FireSync+disconnect)
    * [.subscribe(docKey, [ydoc])](#FireSync+subscribe) ⇒ <code>Y.Doc</code>
    * [.unsubscribe(docKey)](#FireSync+unsubscribe)
    * [.awareness(docKey, [awareness])](#FireSync+awareness) ⇒ <code>Awareness</code>

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
<a name="FireSync+subscribe"></a>

### firesync.subscribe(docKey, [ydoc]) ⇒ <code>Y.Doc</code>
<p>Subscribe to changes to the given document and return the
a Yjs <a href="/guides/yjs">Y.Doc</a> which is kept in sync with the FireSync backend.</p>
<p>Any changes made locally to the Y.Doc will be sent to other subscribed clients, and
the Y.Doc will received any changes made by other clients.</p>
<p>If the doc has been previously unsubscribed then it will be resubscribed.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  

| Param | Type | Description |
| --- | --- | --- |
| docKey | <code>string</code> | <p>The key that identifies the document in the FireSync backend</p> |
| [ydoc] | <code>Y.Doc</code> | <p>An optional Y.Doc to use rather than returning a new instance</p> |

**Example**  
```js
const doc = firesync.subscribe('foo')
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
<a name="FireSync+awareness"></a>

### firesync.awareness(docKey, [awareness]) ⇒ <code>Awareness</code>
<p>Returns an Awareness instance which is synced with the FireSync backend
and will send any awareness updates to other clients and receive awareness
updates from other clients.</p>

**Kind**: instance method of [<code>FireSync</code>](#FireSync)  

| Param | Type | Description |
| --- | --- | --- |
| docKey | <code>string</code> | <p>The key that identified the document in the FireSync backend</p> |
| [awareness] | <code>Awareness</code> | <p>An optional Awareness instance to use rather than returning a new instance</p> |

<a name="FireSyncOptions"></a>

## FireSyncOptions : <code>object</code>
<p>Parameters used to configure a new instance of a FireSync client.</p>

**Kind**: global typedef  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| baseUrl | <code>string</code> |  | <p>The URL of your own firesync-server.</p> |
| projectName | <code>string</code> |  | <p>The name of your project in FireSync Cloud.</p> |
| token | <code>string</code> |  | <p>A JWT signed with your project secret with a list of docs that the client can access. See <a href="/guides/authentication">Authentication</a> for more information</p> |
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
