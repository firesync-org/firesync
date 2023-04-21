import { expect } from 'chai'
import Firesync, { Y, chaosMonkey } from '@firesync/client'
import { tryUntil, testWrapper, getClient } from './utils'
import { nTimes } from '../utils/utils'

describe('Packing Updates', () => {
  test(
    'simple case',
    testWrapper({}, async ({ client, ydoc, server, docKey }) => {
      const PACK_AFTER_N_UPDATES = 5
      const UPDATE_COUNT = 10

      await server.setConfig({
        packAfterNUpdates: PACK_AFTER_N_UPDATES,
        waitSecondsBeforePacking: 0
      })

      await nTimes(UPDATE_COUNT, async () => {
        await applyRandomUpdateAndWaitForAck(ydoc.getMap('a'), client)
      })

      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        expect(updates.length).to.be.lessThan(UPDATE_COUNT)
      })
    })
  )

  test(
    'concurrent updates',
    testWrapper(
      {},
      async ({ client: client1, ydoc: ydoc1, server, docKey, token }) => {
        const PACK_AFTER_N_UPDATES = 5
        const WAIT_SECONDS_BEFORE_PACKING = 50 / 1000 // 50ms
        const UPDATE_COUNT = 10

        const client2 = server.getClient({ token })
        const ydoc2 = client2.subscribe(docKey)
        const client3 = server.getClient({ token })
        const ydoc3 = client3.subscribe(docKey)

        await server.setConfig({
          packAfterNUpdates: PACK_AFTER_N_UPDATES,
          waitSecondsBeforePacking: WAIT_SECONDS_BEFORE_PACKING
        })

        await nTimes(UPDATE_COUNT, async (n) => {
          await Promise.all([
            applyRandomUpdateAndWaitForAck(ydoc1.getMap('a'), client1),
            applyRandomUpdateAndWaitForAck(ydoc2.getMap('a'), client2),
            applyRandomUpdateAndWaitForAck(ydoc3.getMap('a'), client3)
          ])
        })

        await tryUntil(async () => {
          const updates = await server.getDocUpdates(docKey)
          expect(updates.length).to.be.lessThan(UPDATE_COUNT * 3)
        })

        client2.disconnect()
        client3.disconnect()
      }
    )
  )

  test(
    'concurrent packing',
    testWrapper({}, async ({ client, ydoc, server, docKey }) => {
      const UPDATE_COUNT = 10

      // Don't pack any updates yet
      await server.setConfig({ packAfterNUpdates: 10000 })

      await nTimes(UPDATE_COUNT, async () => {
        await applyRandomUpdateAndWaitForAck(ydoc.getMap('a'), client)
      })

      // Now pack the updates all in one go
      await server.setConfig({
        packAfterNUpdates: 5,
        waitSecondsBeforePacking: 0
      })
      await Promise.all([
        // Trigger concurrent packs
        server.packUpdates(docKey),
        server.packUpdates(docKey),
        server.packUpdates(docKey)
      ])

      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        // We should end up with one pack with all the updates
        // If we have more, something is wrong with the locking
        expect(updates.length).to.equal(1)
      })
    })
  )

  test(
    'wait before packing',
    testWrapper({}, async ({ client, ydoc, server, docKey }) => {
      const UPDATE_COUNT = 10

      // Don't pack any updates yet
      await server.setConfig({ packAfterNUpdates: 10000 })

      await nTimes(UPDATE_COUNT, async () => {
        await applyRandomUpdateAndWaitForAck(ydoc.getMap('a'), client)
      })

      // Packing with long wait time shouln't do anything
      await server.setConfig({
        packAfterNUpdates: 5,
        waitSecondsBeforePacking: 100
      })
      await server.packUpdates(docKey)
      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        expect(updates.length).to.equal(UPDATE_COUNT)
      })

      // Packing with short wait time should pack all
      await server.setConfig({
        packAfterNUpdates: 5,
        waitSecondsBeforePacking: 0
      })
      await server.packUpdates(docKey)
      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        expect(updates.length).to.equal(1)
      })
    })
  )
})

const applyRandomUpdateAndWaitForAck = async (
  ymap: Y.Map<any>,
  client: Firesync
) => {
  const waitForAck = new Promise<void>((resolve) =>
    client.once('updateAcked', () => {
      resolve()
    })
  )
  chaosMonkey.applyRandomUpdate(ymap)
  await waitForAck
}
