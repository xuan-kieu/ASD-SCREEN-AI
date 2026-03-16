"""
routers/ws.py — WebSocket real-time messages
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
import json, asyncio
from app.utils.security import decode_token

router = APIRouter()


# ── Connection Manager ─────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # username -> list of WebSocket (hỗ trợ nhiều tab cùng lúc)
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, username: str, ws: WebSocket):
        await ws.accept()
        if username not in self.active:
            self.active[username] = []
        self.active[username].append(ws)

    def disconnect(self, username: str, ws: WebSocket):
        if username in self.active:
            self.active[username] = [c for c in self.active[username] if c != ws]
            if not self.active[username]:
                del self.active[username]

    async def send_to_user(self, username: str, data: dict):
        if username not in self.active:
            return
        dead = []
        for ws in self.active[username]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(username, ws)

    def is_online(self, username: str) -> bool:
        return username in self.active


manager = ConnectionManager()


# ── WebSocket Endpoint ─────────────────────────────────────────────────────

@router.websocket("/ws/messages")
async def websocket_messages(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    Client kết nối: wss://host/api/ws/messages?token=<access_token>
    """
    payload = decode_token(token)
    if not payload or payload.get("type") == "refresh":
        await websocket.close(code=4001)
        return

    username = payload.get("sub")
    if not username:
        await websocket.close(code=4001)
        return

    await manager.connect(username, websocket)

    async def ping_loop():
        while True:
            await asyncio.sleep(25)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    ping_task = asyncio.create_task(ping_loop())

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # client gửi pong để keepalive
                if msg.get("type") == "pong":
                    pass
            except Exception:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error for {username}: {e}")
    finally:
        ping_task.cancel()
        manager.disconnect(username, websocket)


# ── Helpers gọi từ messages.py ────────────────────────────────────────────

async def notify_new_message(to_username: str, message_data: dict):
    """Gọi sau INSERT message để push real-time cho người nhận"""
    await manager.send_to_user(to_username, {
        "type": "new_message",
        "data": message_data
    })

async def notify_message_read(from_username: str, message_id: str):
    """Notify người gửi biết tin đã được đọc"""
    await manager.send_to_user(from_username, {
        "type": "message_read",
        "data": {"message_id": message_id}
    })
