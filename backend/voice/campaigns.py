"""
Campaigns Manager for Agent Forge Voice

Handles batch/outbound calling campaigns with scheduling, retry logic, and contact management.
Follows the singleton manager pattern from telephony.py.
"""

import os
import csv
import io
import asyncio
import logging
from enum import Enum
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List, Callable
import uuid
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)


class CampaignStatus(Enum):
    """Campaign status states"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELED = "canceled"


class ContactStatus(Enum):
    """Contact call status"""
    PENDING = "pending"
    CALLED = "called"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class CampaignContact:
    """Represents a contact in a campaign"""
    id: str
    campaign_id: str
    phone_number: str
    name: str
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    status: str = ContactStatus.PENDING.value
    call_id: Optional[str] = None
    attempts: int = 0
    last_attempt_at: Optional[datetime] = None
    result: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        if self.last_attempt_at:
            data['last_attempt_at'] = self.last_attempt_at.isoformat()
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CampaignContact':
        """Create from dictionary"""
        if 'last_attempt_at' in data and data['last_attempt_at']:
            if isinstance(data['last_attempt_at'], str):
                data['last_attempt_at'] = datetime.fromisoformat(data['last_attempt_at'])
        if 'created_at' in data and data['created_at']:
            if isinstance(data['created_at'], str):
                data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)


@dataclass
class CallCampaign:
    """Represents a batch calling campaign"""
    id: str
    user_id: str
    agent_id: str
    name: str
    description: str
    status: str
    from_number_id: str
    schedule: Dict[str, Any]  # {start_time, end_time, timezone, days_of_week}
    concurrent_calls: int
    retry_policy: Dict[str, Any]  # {max_attempts, retry_delay_minutes}
    contacts: List[CampaignContact] = field(default_factory=list)
    stats: Dict[str, int] = field(default_factory=lambda: {
        'total': 0,
        'pending': 0,
        'completed': 0,
        'successful': 0,
        'failed': 0,
        'skipped': 0
    })
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['contacts'] = [c.to_dict() for c in self.contacts]
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        if self.started_at:
            data['started_at'] = self.started_at.isoformat()
        if self.completed_at:
            data['completed_at'] = self.completed_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CallCampaign':
        """Create from dictionary"""
        contacts_data = data.pop('contacts', [])
        contacts = [CampaignContact.from_dict(c) for c in contacts_data]

        # Parse datetime fields
        for field_name in ['created_at', 'updated_at', 'started_at', 'completed_at']:
            if field_name in data and data[field_name]:
                if isinstance(data[field_name], str):
                    data[field_name] = datetime.fromisoformat(data[field_name])

        campaign = cls(**data)
        campaign.contacts = contacts
        return campaign

    def update_stats(self):
        """Recalculate campaign statistics"""
        self.stats['total'] = len(self.contacts)
        self.stats['pending'] = sum(1 for c in self.contacts if c.status == ContactStatus.PENDING.value)
        self.stats['completed'] = sum(1 for c in self.contacts if c.status == ContactStatus.COMPLETED.value)
        self.stats['failed'] = sum(1 for c in self.contacts if c.status == ContactStatus.FAILED.value)
        self.stats['skipped'] = sum(1 for c in self.contacts if c.status == ContactStatus.SKIPPED.value)

        # Successful = completed with positive result
        self.stats['successful'] = sum(
            1 for c in self.contacts
            if c.status == ContactStatus.COMPLETED.value and c.result in ['answered', 'completed', 'success']
        )


class CampaignManager:
    """
    Manages batch/outbound calling campaigns.

    Supports scheduling, retry logic, concurrent call management, and CSV contact imports.
    Follows the singleton pattern from telephony.py.
    """

    _instance: Optional['CampaignManager'] = None

    def __init__(self):
        # In-memory campaign storage (in production, use database)
        self._campaigns: Dict[str, CallCampaign] = {}

        # Active campaign loops
        self._campaign_tasks: Dict[str, asyncio.Task] = {}

        # Active call semaphores for concurrent call limiting
        self._call_semaphores: Dict[str, asyncio.Semaphore] = {}

        # Callbacks
        self._on_campaign_started: Optional[Callable] = None
        self._on_campaign_completed: Optional[Callable] = None
        self._on_contact_called: Optional[Callable] = None

        logger.info("CampaignManager initialized")

    # ==================== Campaign CRUD ====================

    async def create_campaign(
        self,
        user_id: str,
        campaign_data: Dict[str, Any]
    ) -> CallCampaign:
        """Create a new campaign"""
        campaign_id = str(uuid.uuid4())

        # Default schedule
        default_schedule = {
            'start_time': '09:00',
            'end_time': '17:00',
            'timezone': 'America/New_York',
            'days_of_week': [0, 1, 2, 3, 4]  # Monday-Friday
        }

        # Default retry policy
        default_retry_policy = {
            'max_attempts': 3,
            'retry_delay_minutes': 60
        }

        campaign = CallCampaign(
            id=campaign_id,
            user_id=user_id,
            agent_id=campaign_data['agent_id'],
            name=campaign_data['name'],
            description=campaign_data.get('description', ''),
            status=CampaignStatus.DRAFT.value,
            from_number_id=campaign_data['from_number_id'],
            schedule=campaign_data.get('schedule', default_schedule),
            concurrent_calls=campaign_data.get('concurrent_calls', 1),
            retry_policy=campaign_data.get('retry_policy', default_retry_policy),
        )

        self._campaigns[campaign_id] = campaign
        logger.info(f"Created campaign: {campaign_id} - {campaign.name}")

        return campaign

    async def get_campaign(self, campaign_id: str) -> Optional[CallCampaign]:
        """Get campaign by ID"""
        return self._campaigns.get(campaign_id)

    async def list_campaigns(
        self,
        user_id: str,
        status: Optional[str] = None
    ) -> List[CallCampaign]:
        """List campaigns for a user"""
        campaigns = [
            c for c in self._campaigns.values()
            if c.user_id == user_id
        ]

        if status:
            campaigns = [c for c in campaigns if c.status == status]

        # Sort by created_at descending
        campaigns.sort(key=lambda c: c.created_at, reverse=True)

        return campaigns

    async def update_campaign(
        self,
        campaign_id: str,
        updates: Dict[str, Any]
    ) -> CallCampaign:
        """Update campaign details"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        # Cannot update running campaigns
        if campaign.status == CampaignStatus.RUNNING.value:
            raise ValueError("Cannot update running campaign. Pause it first.")

        # Update allowed fields
        allowed_fields = [
            'name', 'description', 'schedule', 'concurrent_calls',
            'retry_policy', 'from_number_id', 'agent_id'
        ]

        for field in allowed_fields:
            if field in updates:
                setattr(campaign, field, updates[field])

        campaign.updated_at = datetime.now()

        logger.info(f"Updated campaign: {campaign_id}")
        return campaign

    async def delete_campaign(self, campaign_id: str) -> bool:
        """Delete a campaign"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            return False

        # Cannot delete running campaigns
        if campaign.status == CampaignStatus.RUNNING.value:
            raise ValueError("Cannot delete running campaign. Cancel it first.")

        # Stop any active tasks
        if campaign_id in self._campaign_tasks:
            self._campaign_tasks[campaign_id].cancel()
            del self._campaign_tasks[campaign_id]

        del self._campaigns[campaign_id]
        logger.info(f"Deleted campaign: {campaign_id}")
        return True

    # ==================== Contact Management ====================

    async def add_contacts(
        self,
        campaign_id: str,
        contacts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Add contacts to a campaign"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        added = 0
        skipped = 0

        for contact_data in contacts:
            # Validate required fields
            if 'phone_number' not in contact_data:
                skipped += 1
                continue

            contact = CampaignContact(
                id=str(uuid.uuid4()),
                campaign_id=campaign_id,
                phone_number=contact_data['phone_number'],
                name=contact_data.get('name', ''),
                custom_fields=contact_data.get('custom_fields', {})
            )

            campaign.contacts.append(contact)
            added += 1

        campaign.update_stats()
        campaign.updated_at = datetime.now()

        logger.info(f"Added {added} contacts to campaign {campaign_id} ({skipped} skipped)")

        return {
            'added': added,
            'skipped': skipped,
            'total': len(campaign.contacts)
        }

    async def import_contacts_csv(
        self,
        campaign_id: str,
        csv_file: bytes
    ) -> Dict[str, Any]:
        """Import contacts from CSV file"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        # Parse CSV
        csv_text = csv_file.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))

        contacts = []
        for row in csv_reader:
            # Expected columns: phone_number, name, and any custom fields
            if 'phone_number' not in row:
                continue

            contact_data = {
                'phone_number': row['phone_number'],
                'name': row.get('name', ''),
                'custom_fields': {}
            }

            # All other columns become custom fields
            for key, value in row.items():
                if key not in ['phone_number', 'name']:
                    contact_data['custom_fields'][key] = value

            contacts.append(contact_data)

        # Add contacts
        result = await self.add_contacts(campaign_id, contacts)

        logger.info(f"Imported {result['added']} contacts from CSV for campaign {campaign_id}")

        return result

    # ==================== Campaign Execution ====================

    async def start_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Start a campaign"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        if campaign.status == CampaignStatus.RUNNING.value:
            return {'success': False, 'error': 'Campaign already running'}

        if len(campaign.contacts) == 0:
            return {'success': False, 'error': 'No contacts in campaign'}

        # Update status
        campaign.status = CampaignStatus.RUNNING.value
        campaign.started_at = datetime.now()
        campaign.updated_at = datetime.now()

        # Create semaphore for concurrent call limiting
        self._call_semaphores[campaign_id] = asyncio.Semaphore(campaign.concurrent_calls)

        # Start campaign loop
        task = asyncio.create_task(self._run_campaign_loop(campaign_id))
        self._campaign_tasks[campaign_id] = task

        logger.info(f"Started campaign: {campaign_id} - {campaign.name}")

        if self._on_campaign_started:
            await self._on_campaign_started(campaign)

        return {'success': True, 'campaign_id': campaign_id}

    async def pause_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Pause a running campaign"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        if campaign.status != CampaignStatus.RUNNING.value:
            return {'success': False, 'error': 'Campaign not running'}

        campaign.status = CampaignStatus.PAUSED.value
        campaign.updated_at = datetime.now()

        logger.info(f"Paused campaign: {campaign_id}")

        return {'success': True, 'campaign_id': campaign_id}

    async def resume_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Resume a paused campaign"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        if campaign.status != CampaignStatus.PAUSED.value:
            return {'success': False, 'error': 'Campaign not paused'}

        campaign.status = CampaignStatus.RUNNING.value
        campaign.updated_at = datetime.now()

        # Restart loop if not running
        if campaign_id not in self._campaign_tasks or self._campaign_tasks[campaign_id].done():
            task = asyncio.create_task(self._run_campaign_loop(campaign_id))
            self._campaign_tasks[campaign_id] = task

        logger.info(f"Resumed campaign: {campaign_id}")

        return {'success': True, 'campaign_id': campaign_id}

    async def cancel_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Cancel a campaign"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        campaign.status = CampaignStatus.CANCELED.value
        campaign.completed_at = datetime.now()
        campaign.updated_at = datetime.now()

        # Cancel task
        if campaign_id in self._campaign_tasks:
            self._campaign_tasks[campaign_id].cancel()
            del self._campaign_tasks[campaign_id]

        logger.info(f"Canceled campaign: {campaign_id}")

        return {'success': True, 'campaign_id': campaign_id}

    # ==================== Campaign Loop ====================

    async def _run_campaign_loop(self, campaign_id: str):
        """Main campaign execution loop"""
        try:
            campaign = self._campaigns.get(campaign_id)
            if not campaign:
                return

            logger.info(f"Campaign loop started: {campaign_id}")

            while campaign.status == CampaignStatus.RUNNING.value:
                # Check if we should call now (respects schedule)
                if not self._should_call_now(campaign):
                    logger.debug(f"Campaign {campaign_id} outside business hours, waiting...")
                    await asyncio.sleep(60)  # Check every minute
                    continue

                # Get pending contacts
                pending_contacts = [
                    c for c in campaign.contacts
                    if c.status == ContactStatus.PENDING.value
                    or (
                        c.status == ContactStatus.FAILED.value
                        and c.attempts < campaign.retry_policy['max_attempts']
                        and self._should_retry_contact(c, campaign)
                    )
                ]

                if not pending_contacts:
                    # Campaign completed
                    campaign.status = CampaignStatus.COMPLETED.value
                    campaign.completed_at = datetime.now()
                    campaign.update_stats()

                    logger.info(f"Campaign completed: {campaign_id}")

                    if self._on_campaign_completed:
                        await self._on_campaign_completed(campaign)

                    break

                # Process contacts with concurrency limit
                tasks = []
                for contact in pending_contacts[:campaign.concurrent_calls * 2]:  # Queue extra
                    task = asyncio.create_task(
                        self._process_contact_with_semaphore(campaign, contact)
                    )
                    tasks.append(task)

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

                # Update stats
                campaign.update_stats()

                # Small delay between batches
                await asyncio.sleep(5)

        except asyncio.CancelledError:
            logger.info(f"Campaign loop canceled: {campaign_id}")
        except Exception as e:
            logger.error(f"Campaign loop error for {campaign_id}: {e}", exc_info=True)

    async def _process_contact_with_semaphore(
        self,
        campaign: CallCampaign,
        contact: CampaignContact
    ):
        """Process a contact with semaphore for concurrency limiting"""
        semaphore = self._call_semaphores.get(campaign.id)
        if not semaphore:
            return

        async with semaphore:
            await self._process_contact(campaign, contact)

    async def _process_contact(
        self,
        campaign: CallCampaign,
        contact: CampaignContact
    ):
        """Process a single contact (make the call)"""
        try:
            logger.info(f"Calling contact {contact.id} ({contact.name}) at {contact.phone_number}")

            contact.attempts += 1
            contact.last_attempt_at = datetime.now()
            contact.status = ContactStatus.CALLED.value

            # Import telephony manager here to avoid circular imports
            from .telephony import get_telephony_manager
            telephony = get_telephony_manager()

            # Get the from_number
            # In production, look up from_number from campaign.from_number_id
            from_number = "+15555551234"  # Placeholder

            # Initiate the call
            result = await telephony.initiate_outbound_call(
                from_number=from_number,
                to_number=contact.phone_number,
                agent_id=campaign.agent_id,
                user_id=campaign.user_id,
                record=True,
                machine_detection=True
            )

            if result.get('success'):
                contact.call_id = result['call']['id']
                contact.status = ContactStatus.COMPLETED.value
                contact.result = 'called'
                logger.info(f"Successfully called {contact.phone_number}")
            else:
                contact.status = ContactStatus.FAILED.value
                contact.result = result.get('error', 'unknown_error')
                logger.error(f"Failed to call {contact.phone_number}: {contact.result}")

            if self._on_contact_called:
                await self._on_contact_called(campaign, contact, result)

        except Exception as e:
            contact.status = ContactStatus.FAILED.value
            contact.result = str(e)
            logger.error(f"Error calling contact {contact.id}: {e}", exc_info=True)

    def _should_call_now(self, campaign: CallCampaign) -> bool:
        """Check if calls should be made now based on schedule"""
        schedule = campaign.schedule

        try:
            # Get current time in campaign timezone
            tz = ZoneInfo(schedule.get('timezone', 'America/New_York'))
            now = datetime.now(tz)

            # Check day of week
            if now.weekday() not in schedule.get('days_of_week', [0, 1, 2, 3, 4]):
                return False

            # Check time of day
            start_time = schedule.get('start_time', '09:00')
            end_time = schedule.get('end_time', '17:00')

            start_hour, start_minute = map(int, start_time.split(':'))
            end_hour, end_minute = map(int, end_time.split(':'))

            current_minutes = now.hour * 60 + now.minute
            start_minutes = start_hour * 60 + start_minute
            end_minutes = end_hour * 60 + end_minute

            return start_minutes <= current_minutes < end_minutes

        except Exception as e:
            logger.error(f"Error checking schedule: {e}")
            return True  # Default to allowing calls if schedule check fails

    def _should_retry_contact(
        self,
        contact: CampaignContact,
        campaign: CallCampaign
    ) -> bool:
        """Check if a failed contact should be retried"""
        if not contact.last_attempt_at:
            return True

        retry_delay = timedelta(
            minutes=campaign.retry_policy.get('retry_delay_minutes', 60)
        )

        return datetime.now() >= contact.last_attempt_at + retry_delay

    # ==================== Statistics ====================

    async def get_campaign_stats(self, campaign_id: str) -> Dict[str, Any]:
        """Get detailed campaign statistics"""
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        campaign.update_stats()

        # Calculate additional metrics
        duration = None
        if campaign.started_at:
            end_time = campaign.completed_at or datetime.now()
            duration = (end_time - campaign.started_at).total_seconds()

        # Success rate
        success_rate = 0.0
        if campaign.stats['completed'] > 0:
            success_rate = (
                campaign.stats['successful'] / campaign.stats['completed']
            ) * 100

        # Average attempts
        total_attempts = sum(c.attempts for c in campaign.contacts)
        avg_attempts = (
            total_attempts / len(campaign.contacts)
            if campaign.contacts else 0
        )

        return {
            'campaign_id': campaign_id,
            'name': campaign.name,
            'status': campaign.status,
            'stats': campaign.stats,
            'success_rate': round(success_rate, 2),
            'avg_attempts': round(avg_attempts, 2),
            'duration_seconds': duration,
            'started_at': campaign.started_at.isoformat() if campaign.started_at else None,
            'completed_at': campaign.completed_at.isoformat() if campaign.completed_at else None,
        }

    # ==================== Event Callbacks ====================

    def on_campaign_started(self, callback: Callable):
        """Register callback for campaign started events"""
        self._on_campaign_started = callback

    def on_campaign_completed(self, callback: Callable):
        """Register callback for campaign completed events"""
        self._on_campaign_completed = callback

    def on_contact_called(self, callback: Callable):
        """Register callback for contact called events"""
        self._on_contact_called = callback


# Singleton instance
_campaign_manager: Optional[CampaignManager] = None


def get_campaign_manager() -> CampaignManager:
    """Get or create the campaign manager instance"""
    global _campaign_manager
    if _campaign_manager is None:
        _campaign_manager = CampaignManager()
    return _campaign_manager
