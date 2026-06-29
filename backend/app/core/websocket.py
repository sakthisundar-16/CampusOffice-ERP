from fastapi import WebSocket
from typing import Dict, Optional, Set
import logging
from ..database import SessionLocal
from ..models import User
from .security import verify_token

logger = logging.getLogger("uvicorn.error")

class ConnectionManager:
    def __init__(self):
        # Maps user_id (int) -> WebSocket connection
        self.active_connections: Dict[int, WebSocket] = {}
        # Maps role (str) -> Set of user_ids (int)
        self.connections_by_role: Dict[str, Set[int]] = {
            "student": set(),
            "staff": set(),
            "admin": set()
        }

    async def connect(self, websocket: WebSocket, token: str) -> Optional[User]:
        await websocket.accept()
        token_data = verify_token(token)
        if not token_data or not token_data.sub:
            await websocket.close(code=4003, reason="Invalid token")
            return None
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == token_data.sub).first()
            if not user:
                await websocket.close(code=4003, reason="User not found")
                return None
            
            user_id = user.id
            role = user.role.value if hasattr(user.role, "value") else str(user.role)
            
            # Save connection
            self.active_connections[user_id] = websocket
            if role in self.connections_by_role:
                self.connections_by_role[role].add(user_id)
            else:
                self.connections_by_role[role] = {user_id}
                
            logger.info(f"WebSocket connected: User {user_id} ({role})")
            return user
        finally:
            db.close()

    def disconnect(self, user_id: int, role: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if role in self.connections_by_role and user_id in self.connections_by_role[role]:
            self.connections_by_role[role].remove(user_id)
        logger.info(f"WebSocket disconnected: User {user_id} ({role})")

    async def send_notification_to_user(self, user_id: int, message: dict):
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending WebSocket message to user {user_id}: {e}")

    async def broadcast_to_role(self, role: str, message: dict):
        user_ids = self.connections_by_role.get(role, set())
        for user_id in list(user_ids):
            await self.send_notification_to_user(user_id, message)

    async def broadcast_to_all(self, message: dict):
        for user_id in list(self.active_connections.keys()):
            await self.send_notification_to_user(user_id, message)

websocket_manager = ConnectionManager()
