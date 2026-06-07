import json
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # conv_id → list of websockets (customer + possibly owner watching that conv)
        self.conversation_sockets: Dict[str, List[WebSocket]] = {}
        # Dashboard owner sockets
        self.dashboard_sockets: Set[WebSocket] = set()

    async def connect_conversation(self, conv_id: str, ws: WebSocket):
        await ws.accept()
        if conv_id not in self.conversation_sockets:
            self.conversation_sockets[conv_id] = []
        self.conversation_sockets[conv_id].append(ws)

    def disconnect_conversation(self, conv_id: str, ws: WebSocket):
        if conv_id in self.conversation_sockets:
            try:
                self.conversation_sockets[conv_id].remove(ws)
            except ValueError:
                pass

    async def connect_dashboard(self, ws: WebSocket):
        await ws.accept()
        self.dashboard_sockets.add(ws)

    def disconnect_dashboard(self, ws: WebSocket):
        self.dashboard_sockets.discard(ws)

    async def send_to_conversation(self, conv_id: str, data: dict):
        payload = json.dumps(data)
        dead = []
        for ws in self.conversation_sockets.get(conv_id, []):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_conversation(conv_id, ws)

    async def broadcast_to_dashboard(self, data: dict):
        payload = json.dumps(data)
        dead = []
        for ws in list(self.dashboard_sockets):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_dashboard(ws)

    async def broadcast_conversation_update(self, conv_id: str, event: str, data: dict):
        """Notify dashboard about a conversation state change."""
        await self.broadcast_to_dashboard({
            "event": event,
            "conversation_id": conv_id,
            **data,
        })


ws_manager = ConnectionManager()
