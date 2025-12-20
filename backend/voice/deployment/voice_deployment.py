"""
Voice Deployment Manager for Agent Forge

Handles deploying voice agents with:
- Phone number provisioning via Twilio/Telnyx
- Webhook URL generation and configuration
- LiveKit room setup for real-time audio
- Deployment status tracking
- Agent undeployment and cleanup

Follows patterns from backend/deployment.py
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger('AgentForge.VoiceDeployment')


class VoiceDeploymentStatus(Enum):
    """Voice deployment status states"""
    PENDING = "pending"
    PROVISIONING_NUMBER = "provisioning_number"
    CONFIGURING_WEBHOOKS = "configuring_webhooks"
    SETTING_UP_LIVEKIT = "setting_up_livekit"
    DEPLOYED = "deployed"
    FAILED = "failed"
    UNDEPLOYED = "undeployed"


@dataclass
class PhoneNumberInfo:
    """Phone number provisioning result"""
    phone_number: str
    provider_sid: str
    country: str
    capabilities: List[str]
    monthly_cost: float
    voice_url: Optional[str] = None
    status_callback_url: Optional[str] = None


@dataclass
class WebhookConfig:
    """Webhook configuration for voice agent"""
    voice_url: str
    status_callback_url: str
    recording_callback_url: Optional[str] = None
    sms_url: Optional[str] = None
    amd_callback_url: Optional[str] = None


@dataclass
class LiveKitConfig:
    """LiveKit configuration for real-time audio"""
    room_name: str
    ws_url: str
    api_key: str
    api_secret: str
    room_created: bool = False


@dataclass
class VoiceDeploymentResult:
    """Result of a voice agent deployment"""
    id: str
    agent_id: str
    status: VoiceDeploymentStatus
    phone_number: Optional[PhoneNumberInfo] = None
    webhook_config: Optional[WebhookConfig] = None
    livekit_config: Optional[LiveKitConfig] = None
    deployment_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    deployed_at: Optional[datetime] = None
    error: Optional[str] = None
    logs: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'status': self.status.value,
            'phone_number': {
                'phone_number': self.phone_number.phone_number,
                'provider_sid': self.phone_number.provider_sid,
                'country': self.phone_number.country,
                'capabilities': self.phone_number.capabilities,
                'monthly_cost': self.phone_number.monthly_cost,
                'voice_url': self.phone_number.voice_url,
            } if self.phone_number else None,
            'webhook_config': {
                'voice_url': self.webhook_config.voice_url,
                'status_callback_url': self.webhook_config.status_callback_url,
                'recording_callback_url': self.webhook_config.recording_callback_url,
                'sms_url': self.webhook_config.sms_url,
            } if self.webhook_config else None,
            'livekit_config': {
                'room_name': self.livekit_config.room_name,
                'ws_url': self.livekit_config.ws_url,
                'room_created': self.livekit_config.room_created,
            } if self.livekit_config else None,
            'deployment_url': self.deployment_url,
            'created_at': self.created_at.isoformat(),
            'deployed_at': self.deployed_at.isoformat() if self.deployed_at else None,
            'error': self.error,
            'logs': self.logs,
        }


class VoiceDeploymentManager:
    """
    Manages voice agent deployments across telephony providers.

    Handles:
    - Phone number provisioning (Twilio/Telnyx)
    - Webhook configuration
    - LiveKit room setup
    - Deployment lifecycle management
    """

    def __init__(self, telephony_manager=None, livekit_manager=None):
        """
        Initialize voice deployment manager.

        Args:
            telephony_manager: TelephonyManager instance for phone operations
            livekit_manager: LiveKitManager instance for real-time audio
        """
        self.deployments: Dict[str, VoiceDeploymentResult] = {}
        self.agent_deployments: Dict[str, str] = {}  # agent_id -> deployment_id

        # Lazy import to avoid circular dependencies
        self.telephony_manager = telephony_manager
        self.livekit_manager = livekit_manager

        # Webhook base URL from environment
        self.webhook_base_url = os.getenv(
            'VOICE_WEBHOOK_BASE_URL',
            os.getenv('BACKEND_URL', 'https://your-domain.com')
        )

        # LiveKit configuration
        self.livekit_url = os.getenv('LIVEKIT_URL', '')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY', '')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET', '')

        logger.info("VoiceDeploymentManager initialized")

    def _get_telephony_manager(self):
        """Lazy load telephony manager to avoid circular imports"""
        if self.telephony_manager is None:
            from ..telephony import get_telephony_manager
            self.telephony_manager = get_telephony_manager()
        return self.telephony_manager

    def _get_livekit_manager(self):
        """Lazy load LiveKit manager to avoid circular imports"""
        if self.livekit_manager is None:
            try:
                from ..livekit import get_livekit_manager
                self.livekit_manager = get_livekit_manager()
            except ImportError:
                logger.warning("LiveKit manager not available")
                self.livekit_manager = None
        return self.livekit_manager

    async def deploy_voice_agent(
        self,
        agent_id: str,
        config: Dict[str, Any],
        phone_number: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> VoiceDeploymentResult:
        """
        Deploy a voice agent with phone number and webhooks.

        Args:
            agent_id: The voice agent to deploy
            config: Deployment configuration (area_code, capabilities, etc.)
            phone_number: Optional specific phone number to provision
            user_id: User ID for phone number ownership

        Returns:
            VoiceDeploymentResult with deployment status and details
        """
        deployment_id = str(uuid.uuid4())
        user_id = user_id or config.get('user_id', 'default')

        deployment = VoiceDeploymentResult(
            id=deployment_id,
            agent_id=agent_id,
            status=VoiceDeploymentStatus.PENDING
        )

        self.deployments[deployment_id] = deployment
        self.agent_deployments[agent_id] = deployment_id

        self._log(deployment, f"Starting voice agent deployment for {agent_id}")

        try:
            # Step 1: Provision phone number if not provided
            if not phone_number:
                deployment.status = VoiceDeploymentStatus.PROVISIONING_NUMBER
                self._log(deployment, "Provisioning phone number...")

                phone_result = await self.provision_phone_number(
                    area_code=config.get('area_code'),
                    capabilities=config.get('capabilities', ['voice']),
                    user_id=user_id,
                    agent_id=agent_id
                )

                if not phone_result or 'error' in phone_result:
                    raise Exception(f"Failed to provision phone number: {phone_result.get('error')}")

                deployment.phone_number = phone_result
                phone_number = phone_result.phone_number
                self._log(deployment, f"Provisioned number: {phone_number}")
            else:
                self._log(deployment, f"Using provided number: {phone_number}")

            # Step 2: Configure webhooks
            deployment.status = VoiceDeploymentStatus.CONFIGURING_WEBHOOKS
            self._log(deployment, "Configuring webhooks...")

            webhook_config = await self.configure_webhooks(
                agent_id=agent_id,
                phone_number=phone_number
            )

            deployment.webhook_config = webhook_config
            self._log(deployment, f"Webhooks configured at {webhook_config.voice_url}")

            # Step 3: Set up LiveKit room (if available)
            if self.livekit_url and self.livekit_api_key:
                deployment.status = VoiceDeploymentStatus.SETTING_UP_LIVEKIT
                self._log(deployment, "Setting up LiveKit room...")

                livekit_config = await self._setup_livekit_room(agent_id)
                deployment.livekit_config = livekit_config
                self._log(deployment, f"LiveKit room created: {livekit_config.room_name}")
            else:
                self._log(deployment, "LiveKit not configured, skipping room setup")

            # Step 4: Update phone number with webhook URLs
            if deployment.phone_number:
                telephony = self._get_telephony_manager()
                await telephony.configure_number(
                    provider_sid=deployment.phone_number.provider_sid,
                    voice_url=webhook_config.voice_url,
                    status_callback=webhook_config.status_callback_url
                )

            # Deployment complete
            deployment.status = VoiceDeploymentStatus.DEPLOYED
            deployment.deployed_at = datetime.now()
            deployment.deployment_url = webhook_config.voice_url

            self._log(deployment, "Voice agent deployed successfully!")
            self._log(deployment, f"Phone: {phone_number}")
            self._log(deployment, f"Webhook: {webhook_config.voice_url}")

        except Exception as e:
            deployment.status = VoiceDeploymentStatus.FAILED
            deployment.error = str(e)
            self._log(deployment, f"Deployment failed: {str(e)}")
            logger.error(f"Voice deployment failed for {agent_id}: {str(e)}")

        return deployment

    async def provision_phone_number(
        self,
        area_code: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
        user_id: str = 'default',
        agent_id: Optional[str] = None
    ) -> PhoneNumberInfo:
        """
        Provision a phone number for voice agent.

        Args:
            area_code: Desired area code (e.g., "415", "212")
            capabilities: List of capabilities ['voice', 'sms', 'mms']
            user_id: User ID for ownership
            agent_id: Agent ID to associate with number

        Returns:
            PhoneNumberInfo with provisioned number details
        """
        telephony = self._get_telephony_manager()
        capabilities = capabilities or ['voice']

        # Search for available numbers
        available = await telephony.search_available_numbers(
            country='US',
            area_code=area_code,
            capabilities=capabilities,
            limit=1
        )

        if not available:
            return {'error': f'No available numbers found in area code {area_code}'}

        # Provision the first available number
        phone_number = available[0]['phone_number']
        result = await telephony.provision_number(
            phone_number=phone_number,
            user_id=user_id,
            agent_id=agent_id,
            friendly_name=f"AgentForge-{agent_id[:8]}" if agent_id else None
        )

        if not result.get('success'):
            return {'error': result.get('error', 'Failed to provision number')}

        number_data = result['number']

        return PhoneNumberInfo(
            phone_number=number_data.phone_number,
            provider_sid=number_data.provider_sid,
            country=number_data.country,
            capabilities=number_data.capabilities,
            monthly_cost=number_data.monthly_cost,
            voice_url=number_data.voice_url
        )

    async def configure_webhooks(
        self,
        agent_id: str,
        phone_number: str
    ) -> WebhookConfig:
        """
        Configure webhook URLs for voice agent.

        Args:
            agent_id: The agent ID
            phone_number: The phone number to configure

        Returns:
            WebhookConfig with all webhook URLs
        """
        base_url = self.webhook_base_url.rstrip('/')

        # Generate webhook URLs following Twilio patterns
        voice_url = f"{base_url}/api/voice/webhooks/twilio/voice"
        status_callback_url = f"{base_url}/api/voice/webhooks/twilio/status"
        recording_callback_url = f"{base_url}/api/voice/webhooks/twilio/recording"
        sms_url = f"{base_url}/api/voice/webhooks/twilio/sms"
        amd_callback_url = f"{base_url}/api/voice/webhooks/twilio/amd"

        # Add agent_id as query parameter for routing
        voice_url += f"?agent_id={agent_id}"
        status_callback_url += f"?agent_id={agent_id}"

        return WebhookConfig(
            voice_url=voice_url,
            status_callback_url=status_callback_url,
            recording_callback_url=recording_callback_url,
            sms_url=sms_url,
            amd_callback_url=amd_callback_url
        )

    async def _setup_livekit_room(self, agent_id: str) -> LiveKitConfig:
        """
        Set up LiveKit room for real-time audio streaming.

        Args:
            agent_id: The agent ID

        Returns:
            LiveKitConfig with room details
        """
        room_name = f"agent-{agent_id}"

        livekit = self._get_livekit_manager()

        if livekit:
            # Create LiveKit room
            room = await livekit.create_room(
                room_name=room_name,
                empty_timeout=3600,  # 1 hour
                max_participants=10
            )

            return LiveKitConfig(
                room_name=room_name,
                ws_url=self.livekit_url,
                api_key=self.livekit_api_key,
                api_secret=self.livekit_api_secret,
                room_created=True
            )
        else:
            # Return config without creating room
            return LiveKitConfig(
                room_name=room_name,
                ws_url=self.livekit_url,
                api_key=self.livekit_api_key,
                api_secret=self.livekit_api_secret,
                room_created=False
            )

    async def get_deployment_status(self, agent_id: str) -> Dict[str, Any]:
        """
        Get deployment status for a voice agent.

        Args:
            agent_id: The agent ID

        Returns:
            Dictionary with deployment status and details
        """
        deployment_id = self.agent_deployments.get(agent_id)

        if not deployment_id:
            return {
                'deployed': False,
                'error': 'Agent not deployed'
            }

        deployment = self.deployments.get(deployment_id)

        if not deployment:
            return {
                'deployed': False,
                'error': 'Deployment record not found'
            }

        return {
            'deployed': deployment.status == VoiceDeploymentStatus.DEPLOYED,
            'status': deployment.status.value,
            'deployment_id': deployment.id,
            'phone_number': deployment.phone_number.phone_number if deployment.phone_number else None,
            'webhook_url': deployment.deployment_url,
            'livekit_room': deployment.livekit_config.room_name if deployment.livekit_config else None,
            'deployed_at': deployment.deployed_at.isoformat() if deployment.deployed_at else None,
            'error': deployment.error,
            'logs': deployment.logs
        }

    async def undeploy_agent(self, agent_id: str) -> bool:
        """
        Undeploy a voice agent and release resources.

        Args:
            agent_id: The agent ID to undeploy

        Returns:
            True if successful, False otherwise
        """
        deployment_id = self.agent_deployments.get(agent_id)

        if not deployment_id:
            logger.warning(f"No deployment found for agent {agent_id}")
            return False

        deployment = self.deployments.get(deployment_id)

        if not deployment:
            logger.warning(f"Deployment record not found: {deployment_id}")
            return False

        self._log(deployment, f"Undeploying voice agent {agent_id}")

        try:
            # Release phone number
            if deployment.phone_number:
                telephony = self._get_telephony_manager()
                result = await telephony.release_number(
                    phone_number=deployment.phone_number.phone_number,
                    provider_sid=deployment.phone_number.provider_sid
                )

                if result.get('success'):
                    self._log(deployment, f"Released phone number: {deployment.phone_number.phone_number}")
                else:
                    self._log(deployment, f"Failed to release number: {result.get('error')}")

            # Delete LiveKit room
            if deployment.livekit_config and deployment.livekit_config.room_created:
                livekit = self._get_livekit_manager()
                if livekit:
                    await livekit.delete_room(deployment.livekit_config.room_name)
                    self._log(deployment, f"Deleted LiveKit room: {deployment.livekit_config.room_name}")

            # Update deployment status
            deployment.status = VoiceDeploymentStatus.UNDEPLOYED
            self._log(deployment, "Voice agent undeployed successfully")

            # Remove from tracking
            del self.agent_deployments[agent_id]

            return True

        except Exception as e:
            self._log(deployment, f"Error during undeployment: {str(e)}")
            logger.error(f"Failed to undeploy agent {agent_id}: {str(e)}")
            return False

    def get_deployment(self, deployment_id: str) -> Optional[VoiceDeploymentResult]:
        """Get deployment by ID"""
        return self.deployments.get(deployment_id)

    def get_agent_deployment(self, agent_id: str) -> Optional[VoiceDeploymentResult]:
        """Get deployment for a specific agent"""
        deployment_id = self.agent_deployments.get(agent_id)
        if deployment_id:
            return self.deployments.get(deployment_id)
        return None

    def list_deployments(self) -> List[VoiceDeploymentResult]:
        """List all deployments"""
        return list(self.deployments.values())

    def _log(self, deployment: VoiceDeploymentResult, message: str):
        """Add log entry to deployment"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        deployment.logs.append(log_entry)
        logger.info(f"Deployment {deployment.id[:8]}: {message}")


# Singleton instance
_voice_deployment_manager: Optional[VoiceDeploymentManager] = None


def get_voice_deployment_manager(
    telephony_manager=None,
    livekit_manager=None
) -> VoiceDeploymentManager:
    """
    Get or create the voice deployment manager instance.

    Args:
        telephony_manager: Optional TelephonyManager instance
        livekit_manager: Optional LiveKitManager instance

    Returns:
        VoiceDeploymentManager singleton instance
    """
    global _voice_deployment_manager
    if _voice_deployment_manager is None:
        _voice_deployment_manager = VoiceDeploymentManager(
            telephony_manager=telephony_manager,
            livekit_manager=livekit_manager
        )
    return _voice_deployment_manager


# CLI for testing
async def main():
    """Test voice deployment manager"""
    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║     🎙️  AGENT FORGE - Voice Deployment Manager 🎙️            ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)

    manager = get_voice_deployment_manager()

    # Test deployment
    test_agent_id = "voice-agent-test-123"

    print("Testing voice agent deployment...\n")

    deployment = await manager.deploy_voice_agent(
        agent_id=test_agent_id,
        config={
            'user_id': 'test-user',
            'area_code': '415',
            'capabilities': ['voice', 'sms']
        }
    )

    print(f"Deployment ID: {deployment.id}")
    print(f"Status: {deployment.status.value}")

    if deployment.phone_number:
        print(f"Phone Number: {deployment.phone_number.phone_number}")

    if deployment.webhook_config:
        print(f"Voice URL: {deployment.webhook_config.voice_url}")

    if deployment.error:
        print(f"Error: {deployment.error}")

    print("\nDeployment Logs:")
    for log in deployment.logs:
        print(f"  {log}")

    # Get status
    print("\nChecking deployment status...")
    status = await manager.get_deployment_status(test_agent_id)
    print(f"Deployed: {status['deployed']}")
    print(f"Status: {status['status']}")

    # Undeploy
    print("\nUndeploying agent...")
    success = await manager.undeploy_agent(test_agent_id)
    print(f"Undeploy successful: {success}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
