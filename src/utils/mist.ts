import { DEFAULT_SIGNALING_URL, MistNode } from '../vendor/mistlib/wrappers/web/index.js';
import { readDeviceId } from './device';

const deviceId = readDeviceId();
const sysNode = new MistNode(deviceId, DEFAULT_SIGNALING_URL);

export async function getMistNode() {
  await sysNode.init();
  return sysNode;
}
