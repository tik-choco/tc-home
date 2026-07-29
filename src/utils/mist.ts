import { MistNode } from '../vendor/mistlib/wrappers/web/index.js';
import { readDeviceId } from './device';
import { mistSignalingConfig } from '../lib/mistSignaling';

const deviceId = readDeviceId();
// inviteSalt/inviteCode scope peer discovery to the tik-choco family
// namespace — without them this node can't find any other app's peers.
const sysNode = new MistNode(deviceId, mistSignalingConfig());

export async function getMistNode() {
  await sysNode.init();
  return sysNode;
}
