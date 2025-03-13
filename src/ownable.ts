/**
 * Ownable.ts - Entry point for the ownable.js build
 *
 * This file implements the communication protocol for ownables.
 * It's compiled to ownable.js and loaded in each Ownable iframe.
 */

import Listener from 'simple-iframe-rpc/listener';

// Define types for the ownable protocol
interface OwnableAttribute {
  key: string;
  value: string;
}

interface OwnableEvent {
  type: string;
  attributes: OwnableAttribute[];
}

interface OwnableResponse {
  attributes?: OwnableAttribute[];
  events?: OwnableEvent[];
  data?: unknown;
}

interface OwnableInfo {
  sender?: string;
  info?: {
    sender?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface OwnableMessage {
  [key: string]: unknown;
}

interface OwnableState {
  [key: string]: unknown;
}

interface WorkerResponse {
  get(key: string): string;
  has(key: string): boolean;
  err?: string;
}

// Global variables
let ownableId: string;
let worker: Worker;

// Set up the listener for RPC calls
const listener = new Listener({
  init,
  instantiate,
  execute,
  externalEvent,
  query,
  queryRaw,
  refresh,
});
listener.listen(window, '*');

// Handle messages from the iframe
window.addEventListener('message', (e) => {
  if (e.origin !== 'null' || '@rpc' in e.data) return;
  window.parent.postMessage(e.data, '*');
});

// Helper function to convert attributes to a dictionary
function attributesToDict(
  attributes: OwnableAttribute[],
): Record<string, string> {
  return Object.fromEntries(attributes.map((a) => [a.key, a.value]));
}

// Initialize the ownable
function init(
  id: string,
  javascript: string,
  wasm: ArrayBuffer,
): Promise<unknown> {
  ownableId = id;

  return new Promise((resolve, reject) => {
    const blob = new Blob([javascript], { type: `application/javascript` });
    const blobURL = URL.createObjectURL(blob);
    worker = new Worker(blobURL, { type: 'module' });

    worker.onmessage = (event) => {
      resolve(event.data);
    };
    worker.onerror = (err) => reject(err);
    worker.onmessageerror = (err) => reject(err);

    const buffer = wasm.buffer || wasm;
    worker.postMessage(buffer, [buffer]);
  });
}

// Helper function for worker calls
function workerCall(
  type: string,
  ownableId: string,
  msg: OwnableMessage,
  info: OwnableInfo,
  state?: OwnableState,
): Promise<{ response: OwnableResponse; state: OwnableState }> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(`Unable to ${type}: not initialized`);
      return;
    }

    worker.addEventListener(
      'message',
      (event) => {
        const data = event.data as WorkerResponse;

        if ('err' in data) {
          reject(new Error(`Ownable ${type} failed`, { cause: data.err }));
          return;
        }

        const result = data.get('result');
        const response = JSON.parse(result) as OwnableResponse;
        const nextState = data.has('mem')
          ? (JSON.parse(data.get('mem')).state_dump as OwnableState)
          : state;

        resolve({ response, state: nextState || {} });
      },
      { once: true },
    );
    worker.postMessage({
      type,
      ownable_id: ownableId,
      msg,
      info,
      mem: { state_dump: state },
    });
  });
}

// Instantiate the ownable
async function instantiate(
  msg: OwnableMessage,
  info: OwnableInfo,
): Promise<{ attributes: Record<string, string>; state: OwnableState }> {
  const { response, state } = await workerCall(
    'instantiate',
    ownableId,
    msg,
    info,
  );

  return { attributes: attributesToDict(response.attributes || []), state };
}

// Execute a message
async function execute(
  msg: OwnableMessage,
  info: OwnableInfo,
  state: OwnableState,
): Promise<unknown> {
  const { response, state: newState } = await workerCall(
    'execute',
    ownableId,
    msg,
    info,
    state,
  );
  return executeResponse(response, newState);
}

// Handle external events
async function externalEvent(
  msg: OwnableMessage,
  messageInfo: Record<string, unknown>,
  state: OwnableState,
): Promise<unknown> {
  const info = {
    info: messageInfo,
  };

  const { response, state: newState } = await workerCall(
    'external_event',
    ownableId,
    msg,
    info,
    state,
  );
  return executeResponse(response, newState);
}

// Process execute response
function executeResponse(
  response: OwnableResponse,
  state: OwnableState,
): unknown {
  return {
    attributes: attributesToDict(response.attributes || []),
    events: (response.events || []).map((event) => ({
      type: event.type,
      attributes: attributesToDict(event.attributes),
    })),
    data: response.data,
    state,
  };
}

// Raw query
async function queryRaw(
  msg: OwnableMessage,
  state: OwnableState,
): Promise<string> {
  return (await workerCall('query', ownableId, msg, {}, state))
    .response as unknown as string;
}

// Query with JSON parsing
async function query(
  msg: OwnableMessage,
  state: OwnableState,
): Promise<unknown> {
  const resultB64 = await queryRaw(msg, state);
  return JSON.parse(atob(resultB64));
}

// Refresh the widget
async function refresh(state: OwnableState): Promise<void> {
  const widgetState = await query({ get_widget_state: {} }, state);

  const iframe = document.getElementsByTagName('iframe')[0];
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { ownable_id: ownableId, state: widgetState },
      '*',
    );
  }
}
