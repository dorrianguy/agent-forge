"""
Agent Forge Voice - Versioning Manager

Handles voice agent versioning for safe deployments, rollbacks, and A/B testing.
Each version is a complete snapshot of agent configuration at a point in time.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import threading
import copy
import json


class VersionStatus(Enum):
    """Version deployment status"""
    DRAFT = "draft"  # Created but not deployed
    ACTIVE = "active"  # Currently deployed to phone numbers
    ARCHIVED = "archived"  # Previously deployed, now superseded
    DEPRECATED = "deprecated"  # Marked for deletion


@dataclass
class AgentVersion:
    """
    Complete snapshot of a voice agent configuration at a specific version.

    Immutable once created - changes require creating a new version.
    """
    id: str
    agent_id: str
    version_number: int
    voice_config: Dict[str, Any]  # Complete voice settings (provider, voice_id, speed, etc)
    state_machine: Dict[str, Any]  # Complete conversation flow definition
    functions: List[str]  # List of enabled function names
    is_active: bool
    is_deployed: bool
    deployed_to: List[str]  # List of phone number IDs using this version
    created_at: datetime
    deployed_at: Optional[datetime]
    notes: str = ""
    status: VersionStatus = VersionStatus.DRAFT
    created_by: Optional[str] = None  # User ID who created this version
    metadata: Dict[str, Any] = field(default_factory=dict)  # Additional metadata

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/serialization"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['deployed_at'] = self.deployed_at.isoformat() if self.deployed_at else None
        data['status'] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentVersion':
        """Create from dictionary"""
        data = copy.deepcopy(data)
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        if data.get('deployed_at'):
            data['deployed_at'] = datetime.fromisoformat(data['deployed_at'])
        data['status'] = VersionStatus(data['status'])
        return cls(**data)

    def is_deployable(self) -> bool:
        """Check if this version can be deployed"""
        return self.status in [VersionStatus.DRAFT, VersionStatus.ARCHIVED]

    def is_deletable(self) -> bool:
        """Check if this version can be safely deleted"""
        return not self.is_deployed and len(self.deployed_to) == 0


@dataclass
class VersionDiff:
    """Represents differences between two versions"""
    from_version: int
    to_version: int
    voice_config_changes: Dict[str, Any]
    state_machine_changes: Dict[str, Any]
    functions_added: List[str]
    functions_removed: List[str]
    has_breaking_changes: bool
    summary: str


class AgentVersionManager:
    """
    Manages agent versions with safe deployment, rollback, and comparison.

    Thread-safe singleton pattern ensures consistent version management.
    """

    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        """Initialize version manager"""
        # In-memory storage: {agent_id: {version_number: AgentVersion}}
        self._versions: Dict[str, Dict[int, AgentVersion]] = {}

        # Active version tracking: {agent_id: version_number}
        self._active_versions: Dict[str, int] = {}

        # Phone number to version mapping: {phone_number_id: (agent_id, version_number)}
        self._number_mappings: Dict[str, tuple] = {}

        # Lock for thread-safe operations
        self._operation_lock = threading.Lock()

        # Version counter per agent: {agent_id: next_version_number}
        self._version_counters: Dict[str, int] = {}

    def create_version(
        self,
        agent_id: str,
        voice_config: Dict[str, Any],
        state_machine: Dict[str, Any],
        functions: List[str],
        notes: str = "",
        created_by: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentVersion:
        """
        Create a new version snapshot of an agent.

        Args:
            agent_id: Unique agent identifier
            voice_config: Complete voice settings
            state_machine: Complete conversation flow
            functions: List of enabled functions
            notes: Human-readable notes about this version
            created_by: User ID who created this version
            metadata: Additional metadata

        Returns:
            Newly created AgentVersion
        """
        with self._operation_lock:
            # Initialize agent if not exists
            if agent_id not in self._versions:
                self._versions[agent_id] = {}
                self._version_counters[agent_id] = 1

            # Get next version number
            version_number = self._version_counters[agent_id]
            self._version_counters[agent_id] += 1

            # Create version snapshot
            version = AgentVersion(
                id=f"{agent_id}_v{version_number}",
                agent_id=agent_id,
                version_number=version_number,
                voice_config=copy.deepcopy(voice_config),
                state_machine=copy.deepcopy(state_machine),
                functions=list(functions),  # Copy to prevent external modifications
                is_active=False,
                is_deployed=False,
                deployed_to=[],
                created_at=datetime.utcnow(),
                deployed_at=None,
                notes=notes,
                status=VersionStatus.DRAFT,
                created_by=created_by,
                metadata=metadata or {}
            )

            # Store version
            self._versions[agent_id][version_number] = version

            return version

    def get_version(self, agent_id: str, version_number: int) -> Optional[AgentVersion]:
        """Get a specific version of an agent"""
        with self._operation_lock:
            if agent_id not in self._versions:
                return None
            return self._versions[agent_id].get(version_number)

    def get_latest_version(self, agent_id: str) -> Optional[AgentVersion]:
        """Get the most recently created version (may not be active)"""
        with self._operation_lock:
            if agent_id not in self._versions or not self._versions[agent_id]:
                return None

            latest_version_num = max(self._versions[agent_id].keys())
            return self._versions[agent_id][latest_version_num]

    def get_active_version(self, agent_id: str) -> Optional[AgentVersion]:
        """Get the currently active/deployed version"""
        with self._operation_lock:
            if agent_id not in self._active_versions:
                return None

            active_version_num = self._active_versions[agent_id]
            return self._versions[agent_id].get(active_version_num)

    def list_versions(
        self,
        agent_id: str,
        status_filter: Optional[VersionStatus] = None
    ) -> List[AgentVersion]:
        """
        List all versions for an agent, optionally filtered by status.

        Returns versions sorted by version number (newest first).
        """
        with self._operation_lock:
            if agent_id not in self._versions:
                return []

            versions = list(self._versions[agent_id].values())

            # Apply status filter
            if status_filter:
                versions = [v for v in versions if v.status == status_filter]

            # Sort by version number descending
            versions.sort(key=lambda v: v.version_number, reverse=True)

            return versions

    def activate_version(self, agent_id: str, version_number: int) -> bool:
        """
        Activate a version and deploy it to all previously attached phone numbers.

        Deactivates the current active version if one exists.

        Args:
            agent_id: Agent identifier
            version_number: Version to activate

        Returns:
            True if activation successful, False otherwise
        """
        with self._operation_lock:
            # Validate version exists and is deployable
            version = self.get_version(agent_id, version_number)
            if not version or not version.is_deployable():
                return False

            # Deactivate current active version
            if agent_id in self._active_versions:
                old_active_num = self._active_versions[agent_id]
                old_version = self._versions[agent_id].get(old_active_num)
                if old_version:
                    old_version.is_active = False
                    old_version.status = VersionStatus.ARCHIVED

            # Get all phone numbers currently assigned to this agent
            agent_numbers = [
                phone_id for phone_id, (aid, _) in self._number_mappings.items()
                if aid == agent_id
            ]

            # Activate new version
            version.is_active = True
            version.is_deployed = True
            version.deployed_to = agent_numbers
            version.deployed_at = datetime.utcnow()
            version.status = VersionStatus.ACTIVE

            # Update active version tracking
            self._active_versions[agent_id] = version_number

            # Update phone number mappings
            for phone_id in agent_numbers:
                self._number_mappings[phone_id] = (agent_id, version_number)

            return True

    def rollback_to_version(self, agent_id: str, version_number: int) -> bool:
        """
        Quick rollback to a previous version.

        This is just an alias for activate_version with explicit rollback semantics.

        Args:
            agent_id: Agent identifier
            version_number: Version to roll back to

        Returns:
            True if rollback successful, False otherwise
        """
        version = self.get_version(agent_id, version_number)
        if not version:
            return False

        # Add rollback note to metadata
        if 'rollback_history' not in version.metadata:
            version.metadata['rollback_history'] = []

        version.metadata['rollback_history'].append({
            'timestamp': datetime.utcnow().isoformat(),
            'from_version': self._active_versions.get(agent_id)
        })

        return self.activate_version(agent_id, version_number)

    def attach_number_to_version(
        self,
        phone_number_id: str,
        agent_id: str,
        version_number: Optional[int] = None
    ) -> bool:
        """
        Attach a phone number to a specific version.

        If version_number is None, uses the currently active version.

        Args:
            phone_number_id: Phone number identifier
            agent_id: Agent identifier
            version_number: Specific version (or None for active version)

        Returns:
            True if attachment successful, False otherwise
        """
        with self._operation_lock:
            # If no version specified, use active version
            if version_number is None:
                if agent_id not in self._active_versions:
                    return False
                version_number = self._active_versions[agent_id]

            # Validate version exists
            version = self.get_version(agent_id, version_number)
            if not version:
                return False

            # Update number mapping
            self._number_mappings[phone_number_id] = (agent_id, version_number)

            # Update version's deployed_to list
            if phone_number_id not in version.deployed_to:
                version.deployed_to.append(phone_number_id)
                version.is_deployed = True

                if not version.deployed_at:
                    version.deployed_at = datetime.utcnow()

            return True

    def detach_number(self, phone_number_id: str) -> bool:
        """
        Detach a phone number from its current version.

        Args:
            phone_number_id: Phone number identifier

        Returns:
            True if detachment successful, False if number wasn't attached
        """
        with self._operation_lock:
            if phone_number_id not in self._number_mappings:
                return False

            # Get current assignment
            agent_id, version_number = self._number_mappings[phone_number_id]
            version = self.get_version(agent_id, version_number)

            # Remove from version's deployed_to list
            if version and phone_number_id in version.deployed_to:
                version.deployed_to.remove(phone_number_id)

                # If no more numbers deployed, mark as not deployed
                if len(version.deployed_to) == 0:
                    version.is_deployed = False

            # Remove mapping
            del self._number_mappings[phone_number_id]

            return True

    def compare_versions(
        self,
        agent_id: str,
        version1: int,
        version2: int
    ) -> Optional[VersionDiff]:
        """
        Compare two versions and return detailed differences.

        Args:
            agent_id: Agent identifier
            version1: First version number (typically older)
            version2: Second version number (typically newer)

        Returns:
            VersionDiff object describing changes, or None if versions don't exist
        """
        with self._operation_lock:
            v1 = self.get_version(agent_id, version1)
            v2 = self.get_version(agent_id, version2)

            if not v1 or not v2:
                return None

            # Compare voice config
            voice_changes = self._compare_dicts(v1.voice_config, v2.voice_config)

            # Compare state machine
            state_changes = self._compare_dicts(v1.state_machine, v2.state_machine)

            # Compare functions
            funcs1 = set(v1.functions)
            funcs2 = set(v2.functions)
            funcs_added = list(funcs2 - funcs1)
            funcs_removed = list(funcs1 - funcs2)

            # Detect breaking changes
            breaking_changes = self._detect_breaking_changes(
                voice_changes, state_changes, funcs_removed
            )

            # Generate summary
            summary = self._generate_diff_summary(
                voice_changes, state_changes, funcs_added, funcs_removed
            )

            return VersionDiff(
                from_version=version1,
                to_version=version2,
                voice_config_changes=voice_changes,
                state_machine_changes=state_changes,
                functions_added=funcs_added,
                functions_removed=funcs_removed,
                has_breaking_changes=breaking_changes,
                summary=summary
            )

    def delete_version(self, agent_id: str, version_number: int) -> bool:
        """
        Delete a version if it's safe to do so.

        A version can only be deleted if:
        - It's not currently deployed
        - It has no phone numbers attached
        - It's not the active version

        Args:
            agent_id: Agent identifier
            version_number: Version to delete

        Returns:
            True if deletion successful, False otherwise
        """
        with self._operation_lock:
            version = self.get_version(agent_id, version_number)

            if not version or not version.is_deletable():
                return False

            # Remove version
            del self._versions[agent_id][version_number]

            return True

    def get_version_for_number(self, phone_number_id: str) -> Optional[AgentVersion]:
        """
        Get the version currently assigned to a phone number.

        Args:
            phone_number_id: Phone number identifier

        Returns:
            AgentVersion or None if number not assigned
        """
        with self._operation_lock:
            if phone_number_id not in self._number_mappings:
                return None

            agent_id, version_number = self._number_mappings[phone_number_id]
            return self.get_version(agent_id, version_number)

    def get_deployment_status(self, agent_id: str) -> Dict[str, Any]:
        """
        Get comprehensive deployment status for an agent.

        Returns:
            Dictionary with deployment information including:
            - active_version
            - total_versions
            - deployed_phone_numbers
            - version_history
        """
        with self._operation_lock:
            if agent_id not in self._versions:
                return {
                    'agent_id': agent_id,
                    'active_version': None,
                    'total_versions': 0,
                    'deployed_phone_numbers': [],
                    'version_history': []
                }

            active_version = self.get_active_version(agent_id)
            versions = self.list_versions(agent_id)

            # Get all phone numbers for this agent
            deployed_numbers = [
                phone_id for phone_id, (aid, _) in self._number_mappings.items()
                if aid == agent_id
            ]

            return {
                'agent_id': agent_id,
                'active_version': active_version.version_number if active_version else None,
                'total_versions': len(versions),
                'deployed_phone_numbers': deployed_numbers,
                'version_history': [
                    {
                        'version': v.version_number,
                        'status': v.status.value,
                        'created_at': v.created_at.isoformat(),
                        'deployed_at': v.deployed_at.isoformat() if v.deployed_at else None,
                        'notes': v.notes
                    }
                    for v in versions
                ]
            }

    # Private helper methods

    def _compare_dicts(self, dict1: Dict, dict2: Dict) -> Dict[str, Any]:
        """
        Compare two dictionaries and return changes.

        Returns dict with 'added', 'removed', 'modified' keys.
        """
        changes = {
            'added': {},
            'removed': {},
            'modified': {}
        }

        # Find added and modified keys
        for key, value in dict2.items():
            if key not in dict1:
                changes['added'][key] = value
            elif dict1[key] != value:
                changes['modified'][key] = {
                    'old': dict1[key],
                    'new': value
                }

        # Find removed keys
        for key, value in dict1.items():
            if key not in dict2:
                changes['removed'][key] = value

        return changes

    def _detect_breaking_changes(
        self,
        voice_changes: Dict,
        state_changes: Dict,
        funcs_removed: List[str]
    ) -> bool:
        """
        Detect if version changes include breaking changes.

        Breaking changes include:
        - Removing functions
        - Changing voice provider
        - Removing critical state machine nodes
        """
        # Removing functions is breaking
        if funcs_removed:
            return True

        # Changing voice provider is breaking
        if 'provider' in voice_changes.get('modified', {}):
            return True

        # Removing state machine nodes is potentially breaking
        if state_changes.get('removed'):
            return True

        return False

    def _generate_diff_summary(
        self,
        voice_changes: Dict,
        state_changes: Dict,
        funcs_added: List[str],
        funcs_removed: List[str]
    ) -> str:
        """Generate human-readable summary of changes"""
        parts = []

        # Voice config changes
        if any(voice_changes.values()):
            count = sum(len(v) for v in voice_changes.values())
            parts.append(f"{count} voice configuration change(s)")

        # State machine changes
        if any(state_changes.values()):
            count = sum(len(v) for v in state_changes.values())
            parts.append(f"{count} conversation flow change(s)")

        # Function changes
        if funcs_added:
            parts.append(f"{len(funcs_added)} function(s) added")
        if funcs_removed:
            parts.append(f"{len(funcs_removed)} function(s) removed")

        if not parts:
            return "No changes detected"

        return ", ".join(parts)

    def export_version(self, agent_id: str, version_number: int) -> Optional[str]:
        """
        Export a version as JSON for backup or migration.

        Args:
            agent_id: Agent identifier
            version_number: Version to export

        Returns:
            JSON string or None if version doesn't exist
        """
        version = self.get_version(agent_id, version_number)
        if not version:
            return None

        return json.dumps(version.to_dict(), indent=2)

    def import_version(self, json_data: str) -> Optional[AgentVersion]:
        """
        Import a version from JSON.

        Args:
            json_data: JSON string from export_version

        Returns:
            Imported AgentVersion or None if import failed
        """
        with self._operation_lock:
            try:
                data = json.loads(json_data)
                version = AgentVersion.from_dict(data)

                # Ensure agent exists
                if version.agent_id not in self._versions:
                    self._versions[version.agent_id] = {}
                    self._version_counters[version.agent_id] = 1

                # Store imported version
                self._versions[version.agent_id][version.version_number] = version

                # Update version counter if needed
                if version.version_number >= self._version_counters[version.agent_id]:
                    self._version_counters[version.agent_id] = version.version_number + 1

                return version
            except (json.JSONDecodeError, KeyError, ValueError):
                return None


# Singleton accessor
_manager_instance: Optional[AgentVersionManager] = None
_manager_lock = threading.Lock()


def get_agent_version_manager() -> AgentVersionManager:
    """
    Get the singleton AgentVersionManager instance.

    Thread-safe lazy initialization.

    Returns:
        Global AgentVersionManager instance
    """
    global _manager_instance

    if _manager_instance is None:
        with _manager_lock:
            if _manager_instance is None:
                _manager_instance = AgentVersionManager()

    return _manager_instance


# Convenience functions for common operations

def create_agent_version(
    agent_id: str,
    voice_config: Dict[str, Any],
    state_machine: Dict[str, Any],
    functions: List[str],
    notes: str = ""
) -> AgentVersion:
    """Create a new agent version (convenience wrapper)"""
    manager = get_agent_version_manager()
    return manager.create_version(agent_id, voice_config, state_machine, functions, notes)


def activate_agent_version(agent_id: str, version_number: int) -> bool:
    """Activate a version (convenience wrapper)"""
    manager = get_agent_version_manager()
    return manager.activate_version(agent_id, version_number)


def rollback_agent(agent_id: str, to_version: int) -> bool:
    """Rollback to a previous version (convenience wrapper)"""
    manager = get_agent_version_manager()
    return manager.rollback_to_version(agent_id, to_version)


def get_active_agent_version(agent_id: str) -> Optional[AgentVersion]:
    """Get active version for an agent (convenience wrapper)"""
    manager = get_agent_version_manager()
    return manager.get_active_version(agent_id)
