import { MistNode } from '../mistlib/wrappers/web/index.js';
import { readDeviceId } from './device';

const deviceId = readDeviceId();
const sysNode = new MistNode(deviceId);
let sysNodePromise: Promise<MistNode> | null = null;

export async function getMistNode() {
  if (sysNodePromise) return sysNodePromise;

  sysNodePromise = (async () => {
    await sysNode.init();
    return sysNode;
  })();

  return sysNodePromise;
}
