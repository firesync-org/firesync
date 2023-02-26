---
slug: an-overlooked-performance-benefit-of-crdts
title: "Scaling a collaborative app: OT vs CRDTs"
authors: [firesync]
draft: true
---

If you want to build an app with real-time collaboration then you're going to need to figure out how to resolve conflicts from two people editing the same content at the same time. You've basically got two choices of algorithm to solve this problem: Operational Transformation (OT) or Conflict-free Replicated Data Types (CRDTs). A lot of research has gone into the performance of these, both theoretical and practical [refs: diamond types, yjs performance benchmarks, sharejs performance, etc], but most of this has been focused on the behaviour of a client working with a single document. Less has been written about how to build large scalable systems which can handle millions of documents to help millions of users collaborate at the same time. For example, it's clear that the challenge in  scaling a service like Github is very different from the performance of the git client on a single repository. This post addresses some of the challenges that you might face in scaling up a back-end for a collaborative app using either OT or CRDTs.

:::note

This article is based on the experience of the Firesync team, who have experience scaling multiple collaborative apps with up to X documents, Y concurrent users and Z updates per minute. We're learned the hard way some of the things to watch out for while scaling a collaborative back-end, and are building Firesync to provide an out of the box scalable collaboration back-end based on CRDTs.

:::

## Background

If you're not familar with OT or CRDT algorithms, then I'll start with a brief overview of how they work and how they are different. You can probably skip this section if you're familiar with this sort of thing already. We'll focus on text editing, because that's generally one of the hardest but most interesting use cases of these algorithsm.

### Operational Transform

With a typical OT algorithm, the underlying data structure is just a plain document, and all of the clever collaborative logic happens when we apply updates to it. An update looks something like `insert "foo" at position 42`. The problem with concurrent edits happens if person A does `insert "foo" at position 3` while person B concurrently does `insert "bar" at position 9`. If the update from person A is applied first, then person B's update will then be inserted at the wrong position, because whatever text was at `position 9` has been shifted along by 3 character by inserting `"foo"` before it. So OT handles this by transforming the second update to take account of the concurrent update. The second update then becomes `insert "bar" at position 12`, by adding the length of `"foo"` to the position. This preserves the intention of where the text was meant to be inserted.

TODO: Diagram to illustrate this

Finding (and proving) that an OT algorithm is consistent when running between only two nodes is relatively straightfoward. This just requires that for any two operations, you can transform one to take into account the other one being applied concurrently. So long as you have a central server that all clients connect to, then this is fine, since each client only needs to talk to the central server. This is the model used by libraries like [ShareDB](https://github.com/share/sharedb) which is only mature library that we're aware of for adding OT based collaboration to an app.

However, finding an algorithm that generalises to an arbitrary peer to peer (P2P) network is much harder. This requires that you can transform and apply any 3 operations in any order with the same final document state. There have been a lot of mistakes made in trying to find algorithms that satisfy this property and I'm not aware of any well developed library which provides an implementation of this stronger form of OT. In this article I'm interested in what you can actually build with today, so for the rest of it I'll be assuming that OT algorithms are being used with a central server rather than P2P.

### CRDTs

Unlike OT, the underlying CRDT data structure is generally not a plain representation of the document, but rather a collection of all the updates that were applied to get into the latest state. Think of it like a stack of lots of small diffs that you need to apply to get the final document. An update tends to look like `insert "foo" after previous update X`. By referencing previous updates in an update, the position that the text is inserted is independent of other updates that might have been applied concurrently (so long as you have rules for consistently ordering updates applied concurrently at the same position). The underlying representation of the document is then a directed graph of inserts, with an algorithm to resolve it into a linear ordered text if you need the plain text representation.

TODO: Diagram to illustrate this

CRDTs are much easier to generalise to a P2P network, and generally their design makes it much easier to prove that they always end up with the same document state regardless of the order of updates recieved. If updates build a directed graph, then you only need to show that your algorithm for flattening this graph to a linear document will always produce the same result.

This is only a very high level overview of how modern CRDTs for text tend to work, and isn't the only way to create a CRDT algorithm. However, it's how the mature CRDT implementations that are available for use in your app do it, although they each have their own variations on the details: [Y.js](https://github.com/yjs/yjs), [Automerge](https://github.com/automerge/automerge) and [Diamond Types (WIP, but one to watch)](https://github.com/josephg/diamond-types).

## Scaling a collaborative backend

### Compute complexity

**Winner: CRDTs**

#### OT

Resolving concurrent updates has the potential to get computationally expensive with OT, as the compute complexity scales as `O(NM)` where `N` and `M` are the number of concurrent updates by each client respectively. For each of the `N` updates from a client, you need to transform it to take into account each of the `M` updates that may have come into the server concurrently. In practice, `N` and `M` are typically small, especially if clients are online and sending updates as they are are created on the client side.

However, this `O(NM)` behaviour can have significant implications if clients are permitted to go offline for long periods of time and continue to edit. Then `N` and `M` could both potentially grow large, and transforming all the updates to take account of other updates that happened while the client was offline can get expensive. In our experience with running backends based on OT, there is always going to be a tension off between sensible limits that protect against unbounded compute time and permitting your users to work offline (which is really just a point on the same spectrum as being robust to not losing work on an intermittant connection).

#### CRDTs

In principle CRDTs can also display `O(NM)` behaviour, but in practice applying concurrent updates looks more like `O(N + M)`. This is because for usual text editing behaviour, people aren't working on exactly the same part of the document, and so updates are mostly independent from each other. Applying updates in CRDT algorithms are generally independent of other updates, unless another update was concurrently inserted at *exactly the same position*. This is different from OT where updates need to consider *all other concurrent updates*.

### Storage



#### OT

The content of an OT document at any given point in time is just a plain representation of the text it contains, so its memory usage is a 1:1 map of the 

#### CRDTs

The underlying data structure of CRDTs is as a connected graph of updates so the memory usage of CRDTs is ever growing, even as content is deleted from the current state of the document.

### Bandwidth

#### OT

#### CRDTs

### Offline Editing

#### OT

#### CRDTs

### Redundancy and scaling

#### OT

#### CRDTs

----


So, how do OT and CRDT algorithms compare when it comes to scaling and performance?

One of the key differences is in CPU usage. With OT, the processing can be O(NM) where N and M are the size of the concurrent operations. This is assuming OT1, where there is a central node which all other peers talk to. On the other hand, CRDTs do not require any processing on the server.

Another important aspect to consider is bandwidth usage. CRDTs do not pose a problem here, as they are inherently a peer-to-peer protocol and allow for offline editing. However, with OT, there is a risk of losing the ability to garbage collect on the server if there are long-term offline clients, since all possible concurrent operations need to be stored. Additionally, when offline clients come back online, there is an expensive O(NM) merge operation that needs to be performed.

When it comes to memory usage, CRDTs require storing all operations forever, while OT is easy to garbage collect.

Finally, in terms of redundancy and scaling, OT has a single bottleneck, while CRDTs can be distributed.

In conclusion, while both OT and CRDT algorithms have their own strengths and weaknesses, CRDTs are better suited for collaborative apps running at scale due to their ability to handle offline editing and distributed architecture. However, it's important to consider the specific requirements of your application before making a decision on which algorithm to use.


Title:
An Overlooked Performance Benefit of CRDTs
or Scaling CRDTs

- If you're going to create a collaborative app, you're going to need to resolve conflicts
- The algorithms available are either OR or CRDTs
- A lot of theoretical and practical research has gone into assessing the performance of different OT and CRDT algorithms
- However, most of this work has been focused on clients processing a single document
- The challenges faced by someone running an app at scale, with a central server for all documents, are quite different. Like Github scaling challenges vs git client performance.
- How do OT and CRDT algorithms compare in this context?
- CPU
  - OT can be O(NM) where N and M are the size of the concurrent ops. (This is assuming OT1, where there is a central node which all other peers talk to)
  - CRDT needs no processing on the server
- Bandwidth
  - CRDTs, not problem, it's inherently a P2P protocol, and so you can edit offline as long as you like
- Offline editing
  - CRDTs, not problem, it's inherently a P2P protocol, and so you can edit offline as long as you like
  - Same is true of OT in principle, except you lose the ability to garbage collect on the server if you have long term offline clients, since you need store all possible concurrent ops. You also face an expensive O(NM) merge operation when they come back online.
- Memory
  - Need to store all operations forever with a CRDT
  - OT is easy to garbage collect
- Redundancy and scaling
  - Single bottleneck with OT
  - CRDT can be distributed




Conflict-free Replicated Data Types (CRDTs) are a class of data structure which guarantee that all clients in a distributed system eventually end up with the same data regardless of the order of they recieved updates in. This means that concurrent peer-to-peer editing 'just works' if you're using a CRDT. Now that might sound a bit like magic and like all our concurrent editing woes are solved, but designing and implementing a CRDT isn't exactly *easy*.

One of the questions that always comes up with CRDTs is performance. A lot of work both theoretical and practical has gone into assessing the performance of CRDTs in the context of applying concurrent operations to a single document as if all clients are only sharing a few CRDTs at most. However, in practice, collaborative systems very often have a central server that has to process many order of magnitudes more documents than any individual client. The scaling challenges faced by these central services are very different from most client-focused performance research. It's the difference between scaling GitHub as a SAAS compared to the performance of the git client.

An alternative approach to automatically resolving conflicts in concurrent editing is using a class of algorithms known as Operational Transform (OT). With OT each operation depends on the document state that it was applied to. If concurrent operations happen, then you need to 'transform' one of the operations to instead act on the state of the document after the other operation has been applied. Don't worry if that didn't make too much sense - the important thing to note is that 

* Perhaps not considered because a lot of CRDT work is interested in P2P use cases

----