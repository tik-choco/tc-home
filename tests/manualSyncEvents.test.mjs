import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EVENT_ALL_CONNECTIONS_LOST,
  EVENT_AOI_ENTERED,
  EVENT_AOI_LEFT,
  EVENT_NEIGHBORS,
  EVENT_NODE_POSITION_UPDATED,
  EVENT_PEER_CONNECTED,
  EVENT_PEER_DISCONNECTED,
  EVENT_RAW,
  EVENT_ROOM_JOINED,
} from '@tik-choco/mistlib-web';
import { createManualSyncEventHandler } from '../src/hooks/manualSyncEvents.ts';

test('routes raw, neighbor, and AOI events without confusing peer events for presence', () => {
  const calls = [];
  const handler = createManualSyncEventHandler({
    onRaw: (fromId, payload) => calls.push(['raw', fromId, payload]),
    onPresence: () => calls.push(['presence']),
    onNeighbors: () => calls.push(['neighbors']),
  });
  const message = new Uint8Array([123, 125]);

  handler(EVENT_RAW, 'peer', message);
  assert.deepEqual(calls.splice(0), [['raw', 'peer', message]]);

  handler(EVENT_NEIGHBORS, 'peer', new Uint8Array());
  assert.deepEqual(calls.splice(0), [['presence'], ['neighbors']]);

  for (const [event, payload] of [[EVENT_AOI_ENTERED, 'entered'], [EVENT_AOI_LEFT, 'left']]) {
    handler(event, 'peer', new TextEncoder().encode(payload));
    assert.deepEqual(calls.splice(0), [['presence']]);
  }

  for (const event of [EVENT_PEER_CONNECTED, EVENT_PEER_DISCONNECTED, EVENT_NODE_POSITION_UPDATED, EVENT_ALL_CONNECTIONS_LOST, EVENT_ROOM_JOINED]) {
    handler(event, 'peer', new TextEncoder().encode('joined'));
  }
  assert.deepEqual(calls, []);
});
