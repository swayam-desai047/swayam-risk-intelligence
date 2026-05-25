from fastapi import WebSocket
from typing import List
import json

class WebSocketManager:
    def __init__(self):
        # List to track all active visual client sockets
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accepts a client connection and registers it in the broadcast stream."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket client connected. Active connections count: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Deregisters a client socket upon disconnect."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket client disconnected. Active connections count: {len(self.active_connections)}")

    async def broadcast_json(self, data: dict):
        """Broadcasts a JSON payload to all currently active dashboard clients."""
        disconnected = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
                
        # Clean up any sockets that closed unexpectedly
        for conn in disconnected:
            self.disconnect(conn)

# Global singleton connection manager
ws_manager = WebSocketManager()
