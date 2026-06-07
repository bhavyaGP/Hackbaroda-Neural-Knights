import { useEffect, useRef, useCallback } from "react";
import { createWS } from "../lib/api";

export function useWebSocket(path, onMessage, deps = []) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    if (!path) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = createWS(path);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch {}
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [path, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect, ...deps]);

  return wsRef;
}
