"""
Control Hub Connector for Agent Forge
Connects to centralized Control Hub for monitoring, feature flags, and remote commands.
"""

import asyncio
import hashlib
import logging
import os
from datetime import datetime
from typing import Any, Callable, Dict, Optional

import httpx

logger = logging.getLogger('AgentForge.ControlHub')


class ControlHub:
    """Singleton connector for Control Hub integration."""

    _instance: Optional['ControlHub'] = None

    def __new__(cls) -> 'ControlHub':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.app_id = os.environ.get('CONTROL_HUB_APP_ID', 'agent-forge')
        self.token = os.environ.get('CONTROL_HUB_TOKEN', '')
        self.hub_url = os.environ.get('CONTROL_HUB_URL', 'http://localhost:3847')
        self.version = os.environ.get('APP_VERSION', '1.0.0')

        self._connected = False
        self._feature_flags: Dict[str, Dict[str, Any]] = {}
        self._command_handlers: Dict[str, Callable] = {}
        self._heartbeat_task: Optional[asyncio.Task] = None

        # Metrics
        self._metrics = {
            'request_count': 0,
            'error_count': 0,
            'start_time': datetime.now()
        }

        self._register_default_handlers()
        self._initialized = True

    def _register_default_handlers(self):
        """Register built-in command handlers."""

        async def sync_features(payload: Dict) -> Dict:
            await self._fetch_feature_flags()
            return {'success': True, 'flags': list(self._feature_flags.keys())}

        async def debug(payload: Dict) -> Dict:
            action = payload.get('action')
            if action == 'inspect_env':
                return {
                    'python_version': os.sys.version,
                    'platform': os.sys.platform,
                    'uptime_seconds': self.get_uptime()
                }
            elif action == 'dump_state':
                return {
                    'connected': self._connected,
                    'feature_flags': self._feature_flags,
                    'metrics': self.get_metrics()
                }
            return {'error': 'Unknown action'}

        async def clear_cache(payload: Dict) -> Dict:
            return {'success': True}

        self._command_handlers['sync_features'] = sync_features
        self._command_handlers['debug'] = debug
        self._command_handlers['clear_cache'] = clear_cache

    async def connect(self) -> bool:
        """Connect to Control Hub and start heartbeat loop."""
        if not self.token:
            logger.warning('[ControlHub] No token configured. Running offline.')
            return False

        try:
            await self._send_heartbeat()
            await self._fetch_feature_flags()

            # Start heartbeat loop
            if not self._heartbeat_task or self._heartbeat_task.done():
                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

            self._connected = True
            logger.info(f'[ControlHub] Connected as {self.app_id}')
            return True

        except Exception as e:
            logger.error(f'[ControlHub] Connection failed: {e}')
            return False

    def disconnect(self):
        """Stop heartbeat and disconnect."""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            self._heartbeat_task = None
        self._connected = False
        logger.info('[ControlHub] Disconnected')

    def is_connected(self) -> bool:
        return self._connected

    # Feature Flags
    def is_feature_enabled(self, name: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature flag is enabled."""
        flag = self._feature_flags.get(name)
        if not flag or not flag.get('enabled'):
            return False

        rollout = flag.get('rollout_percentage', 100)
        if rollout < 100 and user_id:
            hash_val = int(hashlib.md5(f'{user_id}{name}'.encode()).hexdigest(), 16)
            return (hash_val % 100) < rollout

        return True

    def get_feature_flags(self) -> Dict[str, Dict[str, Any]]:
        return self._feature_flags.copy()

    # Command Handlers
    def on_command(self, command: str, handler: Callable):
        """Register a command handler."""
        self._command_handlers[command] = handler

    async def execute_command(self, command: str, payload: Dict) -> Any:
        """Execute a registered command."""
        handler = self._command_handlers.get(command)
        if not handler:
            return {'error': f'Unknown command: {command}'}

        try:
            if asyncio.iscoroutinefunction(handler):
                return await handler(payload)
            return handler(payload)
        except Exception as e:
            return {'error': str(e)}

    # Metrics
    def track_request(self):
        self._metrics['request_count'] += 1

    def track_error(self):
        self._metrics['error_count'] += 1

    def get_uptime(self) -> int:
        return int((datetime.now() - self._metrics['start_time']).total_seconds())

    def get_metrics(self) -> Dict[str, Any]:
        return {
            'request_count': self._metrics['request_count'],
            'error_count': self._metrics['error_count'],
            'uptime_seconds': self.get_uptime()
        }

    # Logging
    async def log(self, level: str, message: str, data: Optional[Dict] = None):
        """Send log to Control Hub."""
        if not self.token:
            return

        entry = {
            'appId': self.app_id,
            'level': level,
            'message': message,
            'data': data or {},
            'timestamp': datetime.now().isoformat()
        }

        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f'{self.hub_url}/api/logs',
                    json=entry,
                    headers={'Authorization': f'Bearer {self.token}'},
                    timeout=5.0
                )
        except Exception:
            pass  # Silent fail

    # Private methods
    async def _heartbeat_loop(self):
        """Send heartbeat every 30 seconds."""
        while True:
            try:
                await asyncio.sleep(30)
                await self._send_heartbeat()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.debug(f'[ControlHub] Heartbeat error: {e}')

    async def _send_heartbeat(self):
        """Send heartbeat to Control Hub."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.hub_url}/api/heartbeat',
                json={
                    'appId': self.app_id,
                    'version': self.version,
                    'status': 'online',
                    'metadata': self.get_metrics()
                },
                headers={'Authorization': f'Bearer {self.token}'},
                timeout=10.0
            )

            data = response.json()

            # Execute pending commands
            commands = data.get('commands', [])
            for cmd in commands:
                result = await self.execute_command(cmd.get('command'), cmd.get('payload', {}))
                await self._send_command_response(cmd.get('id'), result)

    async def _fetch_feature_flags(self):
        """Fetch feature flags from Control Hub."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f'{self.hub_url}/api/features/{self.app_id}',
                    headers={'Authorization': f'Bearer {self.token}'},
                    timeout=10.0
                )
                if response.status_code == 200:
                    self._feature_flags = response.json()
        except Exception:
            pass  # Silent fail

    async def _send_command_response(self, command_id: str, result: Any):
        """Send command response back to Control Hub."""
        if not command_id:
            return

        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f'{self.hub_url}/api/commands/{command_id}/response',
                    json={'appId': self.app_id, 'result': result},
                    headers={'Authorization': f'Bearer {self.token}'},
                    timeout=5.0
                )
        except Exception:
            pass  # Silent fail


# Singleton accessor
def get_control_hub() -> ControlHub:
    return ControlHub()


# Convenience functions
async def init_control_hub() -> bool:
    return await get_control_hub().connect()


def is_feature_enabled(name: str, user_id: Optional[str] = None) -> bool:
    return get_control_hub().is_feature_enabled(name, user_id)


def track_request():
    get_control_hub().track_request()


def track_error():
    get_control_hub().track_error()


async def log_to_hub(level: str, message: str, data: Optional[Dict] = None):
    await get_control_hub().log(level, message, data)
