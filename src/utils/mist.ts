import { MistNode } from '../mistlib/wrappers/web/index.js';
import { readDeviceId } from './device';

const deviceId = readDeviceId();
const sysNode = new MistNode(deviceId);

export async function getMistNode() {
  await sysNode.init();
  return sysNode;
}
