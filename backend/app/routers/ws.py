"""
routers/ws.py — WebSocket real-time messages
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
import json, asyncio
from app.utils.security import decode_token

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, username: str, ws: WebSocket):
        await ws.accept()
        if username not in self.active:
            self.active[username] = []
        self.active[username].append(ws)
        print(f"[WS] Connected: {username} (total: {sum(len(v) for v in self.active.values())})")

    def disconnect(self, username: str, ws: WebSocket):
        if username in self.active:
            self.active[username] = [c for c in self.active[username] if c != ws]
            if not self.active[username]:
                del self.active[username]
        print(f"[WS] Disconnected: {username}")

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


@router.websocket("/ws/messages")
async def websocket_messages(
    websocket: WebSocket,
    token: str = Query(...)
):
    payload = decode_token(token)
    if not payload or payload.get("type") == "refresh":
        await websocket.close(code=4001)
        return

    username = payload.get("sub")
    if not username:
        await websocket.close(code=4001)
        return

    await manager.connect(username, websocket)

    # Gửi ping mỗi 20 giây để giữ kết nối qua proxy
    async def ping_loop():
        while True:
            await asyncio.sleep(20)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    ping_task = asyncio.create_task(ping_loop())

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60)
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "pong":
                        pass  # keepalive OK
                except Exception:
                    pass
            except asyncio.TimeoutError:
                # Gửi ping nếu không có activity
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error for {username}: {e}")
    finally:
        ping_task.cancel()
        manager.disconnect(username, websocket)


async def notify_new_message(to_username: str, message_data: dict):
    await manager.send_to_user(to_username, {
        "type": "new_message",
        "data": message_data
    })

async def notify_message_read(from_username: str, message_id: str):
    await manager.send_to_user(from_username, {
        "type": "message_read",
        "data": {"message_id": message_id}
    })