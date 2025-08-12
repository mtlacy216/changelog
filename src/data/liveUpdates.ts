export type UpdateHandler = (data: unknown) => void;

/**
 * Establishes a live connection using Server-Sent Events when available,
 * falling back to WebSockets. Incoming messages are forwarded to the
 * provided handler.
 */
export function connectLiveUpdates(handler: UpdateHandler) {
  if ('EventSource' in window) {
    const es = new EventSource('/live');
    es.onmessage = ev => handler(JSON.parse(ev.data));
    return es;
  }
  const ws = new WebSocket('wss://example.com/live');
  ws.onmessage = ev => handler(JSON.parse(ev.data));
  return ws;
}
