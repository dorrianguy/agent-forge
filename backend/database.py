"""
Agent Forge - Database Layer
SQLite persistence for all system data
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
import logging

logger = logging.getLogger('AgentForge.Database')

# Database path
DB_PATH = os.environ.get('DATABASE_PATH', os.path.join(os.path.dirname(__file__), '..', 'data', 'agentforge.db'))


def get_db_path() -> str:
    """Get database path, creating directory if needed"""
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
    return DB_PATH


@contextmanager
def get_connection():
    """Get database connection with context manager"""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_database():
    """Initialize database schema"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # API Keys table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                key_hash TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                permissions TEXT DEFAULT '["read","write"]',
                rate_limit INTEGER DEFAULT 100,
                created_at TEXT NOT NULL,
                last_used_at TEXT,
                is_active INTEGER DEFAULT 1
            )
        ''')

        # Built Agents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                description TEXT,
                capabilities TEXT,
                system_prompt TEXT,
                knowledge_base TEXT,
                config TEXT,
                code TEXT,
                embed_code TEXT,
                api_endpoint TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                is_active INTEGER DEFAULT 1
            )
        ''')

        # Tasks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                priority TEXT NOT NULL,
                payload TEXT,
                status TEXT DEFAULT 'pending',
                result TEXT,
                error TEXT,
                worker_id TEXT,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                retry_count INTEGER DEFAULT 0
            )
        ''')

        # Learning Outcomes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_outcomes (
                id TEXT PRIMARY KEY,
                outcome_type TEXT NOT NULL,
                action TEXT NOT NULL,
                context TEXT,
                result TEXT,
                success INTEGER NOT NULL,
                score REAL,
                metadata TEXT,
                created_at TEXT NOT NULL
            )
        ''')

        # Strategies table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS strategies (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                parameters TEXT,
                performance_score REAL DEFAULT 0.5,
                usage_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')

        # Insights table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS insights (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                insight TEXT NOT NULL,
                confidence REAL NOT NULL,
                supporting_data TEXT,
                created_at TEXT NOT NULL
            )
        ''')

        # Collaborations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS collaborations (
                id TEXT PRIMARY KEY,
                collaboration_type TEXT NOT NULL,
                participants TEXT NOT NULL,
                goal TEXT,
                status TEXT DEFAULT 'active',
                messages TEXT,
                result TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT
            )
        ''')

        # Workers table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS workers (
                id TEXT PRIMARY KEY,
                worker_type TEXT NOT NULL,
                status TEXT DEFAULT 'idle',
                current_task_id TEXT,
                tasks_completed INTEGER DEFAULT 0,
                avg_task_time REAL DEFAULT 0,
                created_at TEXT NOT NULL,
                last_active_at TEXT
            )
        ''')

        # Deployments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deployments (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                target TEXT NOT NULL,
                url TEXT,
                status TEXT DEFAULT 'pending',
                config TEXT,
                logs TEXT,
                created_at TEXT NOT NULL,
                deployed_at TEXT,
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
        ''')

        # Request logs table (for analytics)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_key_id TEXT,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                status_code INTEGER,
                response_time_ms REAL,
                error TEXT,
                created_at TEXT NOT NULL
            )
        ''')

        # Customers table (Stripe integration)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                stripe_customer_id TEXT UNIQUE,
                current_plan TEXT DEFAULT 'free',
                subscription_status TEXT DEFAULT 'inactive',
                subscription_id TEXT,
                subscription_period_end TEXT,
                agents_count INTEGER DEFAULT 0,
                conversations_count INTEGER DEFAULT 0,
                conversations_reset_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        ''')

        # Subscription events table (audit trail)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS subscription_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                old_plan TEXT,
                new_plan TEXT,
                stripe_event_id TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_outcomes_type ON learning_outcomes(outcome_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_deployments_agent_id ON deployments(agent_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_subscription_events_customer ON subscription_events(customer_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON customers(stripe_customer_id)')

        logger.info('[Database] Schema initialized successfully')


# ==================== Agent Operations ====================

def save_agent(agent_data: Dict[str, Any]) -> str:
    """Save a built agent to database"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO agents
            (id, name, type, description, capabilities, system_prompt, knowledge_base,
             config, code, embed_code, api_endpoint, created_at, updated_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            agent_data['id'],
            agent_data['name'],
            agent_data['type'],
            agent_data.get('description', ''),
            json.dumps(agent_data.get('capabilities', [])),
            agent_data.get('system_prompt', ''),
            json.dumps(agent_data.get('knowledge_base', {})),
            json.dumps(agent_data.get('config', {})),
            agent_data.get('code', ''),
            agent_data.get('embed_code', ''),
            agent_data.get('api_endpoint', ''),
            agent_data.get('created_at', now),
            now
        ))

        return agent_data['id']


def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
    """Get agent by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM agents WHERE id = ? AND is_active = 1', (agent_id,))
        row = cursor.fetchone()

        if row:
            return {
                'id': row['id'],
                'name': row['name'],
                'type': row['type'],
                'description': row['description'],
                'capabilities': json.loads(row['capabilities'] or '[]'),
                'system_prompt': row['system_prompt'],
                'knowledge_base': json.loads(row['knowledge_base'] or '{}'),
                'config': json.loads(row['config'] or '{}'),
                'code': row['code'],
                'embed_code': row['embed_code'],
                'api_endpoint': row['api_endpoint'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            }
        return None


def list_agents(agent_type: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """List all agents"""
    with get_connection() as conn:
        cursor = conn.cursor()

        if agent_type:
            cursor.execute(
                'SELECT * FROM agents WHERE type = ? AND is_active = 1 ORDER BY created_at DESC LIMIT ?',
                (agent_type, limit)
            )
        else:
            cursor.execute(
                'SELECT * FROM agents WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?',
                (limit,)
            )

        return [dict(row) for row in cursor.fetchall()]


def delete_agent(agent_id: str) -> bool:
    """Soft delete an agent"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE agents SET is_active = 0 WHERE id = ?', (agent_id,))
        return cursor.rowcount > 0


# ==================== Task Operations ====================

def save_task(task_data: Dict[str, Any]) -> str:
    """Save a task"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO tasks
            (id, type, priority, payload, status, result, error, worker_id,
             created_at, started_at, completed_at, retry_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task_data['id'],
            task_data['type'],
            task_data['priority'],
            json.dumps(task_data.get('payload', {})),
            task_data.get('status', 'pending'),
            json.dumps(task_data.get('result')) if task_data.get('result') else None,
            task_data.get('error'),
            task_data.get('worker_id'),
            task_data.get('created_at', now),
            task_data.get('started_at'),
            task_data.get('completed_at'),
            task_data.get('retry_count', 0)
        ))

        return task_data['id']


def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    """Get task by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
        row = cursor.fetchone()

        if row:
            return {
                'id': row['id'],
                'type': row['type'],
                'priority': row['priority'],
                'payload': json.loads(row['payload'] or '{}'),
                'status': row['status'],
                'result': json.loads(row['result']) if row['result'] else None,
                'error': row['error'],
                'worker_id': row['worker_id'],
                'created_at': row['created_at'],
                'started_at': row['started_at'],
                'completed_at': row['completed_at'],
                'retry_count': row['retry_count']
            }
        return None


def get_pending_tasks(limit: int = 50) -> List[Dict[str, Any]]:
    """Get pending tasks ordered by priority"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM tasks
            WHERE status = 'pending'
            ORDER BY
                CASE priority
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                END,
                created_at ASC
            LIMIT ?
        ''', (limit,))

        return [dict(row) for row in cursor.fetchall()]


def update_task_status(task_id: str, status: str, result: Any = None, error: str = None):
    """Update task status"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        if status == 'running':
            cursor.execute(
                'UPDATE tasks SET status = ?, started_at = ? WHERE id = ?',
                (status, now, task_id)
            )
        elif status in ('completed', 'failed'):
            cursor.execute(
                'UPDATE tasks SET status = ?, result = ?, error = ?, completed_at = ? WHERE id = ?',
                (status, json.dumps(result) if result else None, error, now, task_id)
            )
        else:
            cursor.execute('UPDATE tasks SET status = ? WHERE id = ?', (status, task_id))


# ==================== Learning Operations ====================

def save_outcome(outcome_data: Dict[str, Any]) -> str:
    """Save a learning outcome"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        outcome_id = outcome_data.get('id', f"outcome-{datetime.now().timestamp()}")

        cursor.execute('''
            INSERT INTO learning_outcomes
            (id, outcome_type, action, context, result, success, score, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            outcome_id,
            outcome_data['outcome_type'],
            outcome_data['action'],
            json.dumps(outcome_data.get('context', {})),
            json.dumps(outcome_data.get('result', {})),
            1 if outcome_data.get('success', False) else 0,
            outcome_data.get('score', 0.0),
            json.dumps(outcome_data.get('metadata', {})),
            now
        ))

        return outcome_id


def get_outcomes(outcome_type: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Get learning outcomes"""
    with get_connection() as conn:
        cursor = conn.cursor()

        if outcome_type:
            cursor.execute(
                'SELECT * FROM learning_outcomes WHERE outcome_type = ? ORDER BY created_at DESC LIMIT ?',
                (outcome_type, limit)
            )
        else:
            cursor.execute(
                'SELECT * FROM learning_outcomes ORDER BY created_at DESC LIMIT ?',
                (limit,)
            )

        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row['id'],
                'outcome_type': row['outcome_type'],
                'action': row['action'],
                'context': json.loads(row['context'] or '{}'),
                'result': json.loads(row['result'] or '{}'),
                'success': bool(row['success']),
                'score': row['score'],
                'metadata': json.loads(row['metadata'] or '{}'),
                'created_at': row['created_at']
            })
        return results


def save_strategy(strategy_data: Dict[str, Any]) -> str:
    """Save or update a strategy"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO strategies
            (id, type, name, description, parameters, performance_score,
             usage_count, success_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            strategy_data['id'],
            strategy_data['type'],
            strategy_data['name'],
            strategy_data.get('description', ''),
            json.dumps(strategy_data.get('parameters', {})),
            strategy_data.get('performance_score', 0.5),
            strategy_data.get('usage_count', 0),
            strategy_data.get('success_count', 0),
            strategy_data.get('created_at', now),
            now
        ))

        return strategy_data['id']


def get_strategies(strategy_type: str = None) -> List[Dict[str, Any]]:
    """Get strategies"""
    with get_connection() as conn:
        cursor = conn.cursor()

        if strategy_type:
            cursor.execute(
                'SELECT * FROM strategies WHERE type = ? ORDER BY performance_score DESC',
                (strategy_type,)
            )
        else:
            cursor.execute('SELECT * FROM strategies ORDER BY performance_score DESC')

        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row['id'],
                'type': row['type'],
                'name': row['name'],
                'description': row['description'],
                'parameters': json.loads(row['parameters'] or '{}'),
                'performance_score': row['performance_score'],
                'usage_count': row['usage_count'],
                'success_count': row['success_count'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
        return results


def update_strategy_performance(strategy_id: str, success: bool):
    """Update strategy performance after use"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT usage_count, success_count FROM strategies WHERE id = ?', (strategy_id,))
        row = cursor.fetchone()

        if row:
            usage = row['usage_count'] + 1
            successes = row['success_count'] + (1 if success else 0)
            score = successes / usage if usage > 0 else 0.5

            cursor.execute('''
                UPDATE strategies
                SET usage_count = ?, success_count = ?, performance_score = ?, updated_at = ?
                WHERE id = ?
            ''', (usage, successes, score, datetime.now().isoformat(), strategy_id))


def save_insight(insight_data: Dict[str, Any]) -> str:
    """Save a learned insight"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        insight_id = insight_data.get('id', f"insight-{datetime.now().timestamp()}")

        cursor.execute('''
            INSERT INTO insights (id, category, insight, confidence, supporting_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            insight_id,
            insight_data['category'],
            insight_data['insight'],
            insight_data.get('confidence', 0.5),
            json.dumps(insight_data.get('supporting_data', {})),
            now
        ))

        return insight_id


# ==================== API Key Operations ====================

def create_api_key(key_id: str, key_hash: str, name: str, permissions: List[str] = None) -> str:
    """Create a new API key"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO api_keys (id, key_hash, name, permissions, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            key_id,
            key_hash,
            name,
            json.dumps(permissions or ['read', 'write']),
            now
        ))

        return key_id


def validate_api_key(key_hash: str) -> Optional[Dict[str, Any]]:
    """Validate API key and return key data"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1',
            (key_hash,)
        )
        row = cursor.fetchone()

        if row:
            # Update last used
            cursor.execute(
                'UPDATE api_keys SET last_used_at = ? WHERE id = ?',
                (datetime.now().isoformat(), row['id'])
            )

            return {
                'id': row['id'],
                'name': row['name'],
                'permissions': json.loads(row['permissions'] or '[]'),
                'rate_limit': row['rate_limit']
            }
        return None


def list_api_keys() -> List[Dict[str, Any]]:
    """List all API keys (without hashes)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, permissions, rate_limit, created_at, last_used_at, is_active FROM api_keys')
        return [dict(row) for row in cursor.fetchall()]


# ==================== Request Logging ====================

def log_request(api_key_id: str, endpoint: str, method: str, status_code: int,
                response_time_ms: float, error: str = None):
    """Log an API request"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO request_logs (api_key_id, endpoint, method, status_code, response_time_ms, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (api_key_id, endpoint, method, status_code, response_time_ms, error, datetime.now().isoformat()))


def get_request_stats(hours: int = 24) -> Dict[str, Any]:
    """Get request statistics"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Total requests
        cursor.execute('SELECT COUNT(*) as count FROM request_logs')
        total = cursor.fetchone()['count']

        # Requests by status
        cursor.execute('''
            SELECT status_code, COUNT(*) as count
            FROM request_logs
            GROUP BY status_code
        ''')
        by_status = {row['status_code']: row['count'] for row in cursor.fetchall()}

        # Average response time
        cursor.execute('SELECT AVG(response_time_ms) as avg_time FROM request_logs')
        avg_time = cursor.fetchone()['avg_time'] or 0

        return {
            'total_requests': total,
            'by_status': by_status,
            'avg_response_time_ms': round(avg_time, 2)
        }


# ==================== Deployment Operations ====================

def save_deployment(deployment_data: Dict[str, Any]) -> str:
    """Save a deployment record"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO deployments
            (id, agent_id, target, url, status, config, logs, created_at, deployed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            deployment_data['id'],
            deployment_data['agent_id'],
            deployment_data['target'],
            deployment_data.get('url'),
            deployment_data.get('status', 'pending'),
            json.dumps(deployment_data.get('config', {})),
            deployment_data.get('logs', ''),
            deployment_data.get('created_at', now),
            deployment_data.get('deployed_at')
        ))

        return deployment_data['id']


def get_deployment(deployment_id: str) -> Optional[Dict[str, Any]]:
    """Get deployment by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM deployments WHERE id = ?', (deployment_id,))
        row = cursor.fetchone()

        if row:
            return dict(row)
        return None


def get_agent_deployments(agent_id: str) -> List[Dict[str, Any]]:
    """Get all deployments for an agent"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM deployments WHERE agent_id = ? ORDER BY created_at DESC',
            (agent_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


# ==================== Worker Operations ====================

def save_worker(worker_data: Dict[str, Any]) -> str:
    """Save or update a worker"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO workers
            (id, worker_type, status, current_task_id, tasks_completed, avg_task_time, created_at, last_active_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            worker_data['id'],
            worker_data['worker_type'],
            worker_data.get('status', 'idle'),
            worker_data.get('current_task_id'),
            worker_data.get('tasks_completed', 0),
            worker_data.get('avg_task_time', 0),
            worker_data.get('created_at', now),
            now
        ))

        return worker_data['id']


def get_worker(worker_id: str) -> Optional[Dict[str, Any]]:
    """Get worker by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM workers WHERE id = ?', (worker_id,))
        row = cursor.fetchone()

        if row:
            return dict(row)
        return None


def list_workers(worker_type: str = None, status: str = None) -> List[Dict[str, Any]]:
    """List workers with optional filters"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = 'SELECT * FROM workers WHERE 1=1'
        params = []

        if worker_type:
            query += ' AND worker_type = ?'
            params.append(worker_type)
        if status:
            query += ' AND status = ?'
            params.append(status)

        query += ' ORDER BY created_at DESC'
        cursor.execute(query, params)

        return [dict(row) for row in cursor.fetchall()]


def update_worker_status(worker_id: str, status: str, task_id: str = None):
    """Update worker status"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            UPDATE workers
            SET status = ?, current_task_id = ?, last_active_at = ?
            WHERE id = ?
        ''', (status, task_id, now, worker_id))


def record_worker_task_completion(worker_id: str, task_time_ms: float = 0):
    """Record task completion for a worker"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('SELECT tasks_completed, avg_task_time FROM workers WHERE id = ?', (worker_id,))
        row = cursor.fetchone()

        if row:
            tasks = row['tasks_completed'] + 1
            # Rolling average
            avg = (row['avg_task_time'] * (tasks - 1) + task_time_ms) / tasks if tasks > 0 else task_time_ms

            cursor.execute('''
                UPDATE workers
                SET tasks_completed = ?, avg_task_time = ?, status = 'idle',
                    current_task_id = NULL, last_active_at = ?
                WHERE id = ?
            ''', (tasks, avg, now, worker_id))


def delete_worker(worker_id: str) -> bool:
    """Delete a worker"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM workers WHERE id = ?', (worker_id,))
        return cursor.rowcount > 0


def get_worker_stats() -> Dict[str, Any]:
    """Get workforce statistics"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Total workers
        cursor.execute('SELECT COUNT(*) as count FROM workers')
        total = cursor.fetchone()['count']

        # By status
        cursor.execute('SELECT status, COUNT(*) as count FROM workers GROUP BY status')
        by_status = {row['status']: row['count'] for row in cursor.fetchall()}

        # By type
        cursor.execute('SELECT worker_type, COUNT(*) as count FROM workers GROUP BY worker_type')
        by_type = {row['worker_type']: row['count'] for row in cursor.fetchall()}

        # Total tasks completed
        cursor.execute('SELECT SUM(tasks_completed) as total FROM workers')
        total_tasks = cursor.fetchone()['total'] or 0

        return {
            'total_workers': total,
            'by_status': by_status,
            'by_type': by_type,
            'total_tasks_completed': total_tasks
        }


# ==================== Scaling Events ====================

def save_scaling_event(event_data: Dict[str, Any]) -> str:
    """Save a scaling event"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Create table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scaling_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                trigger TEXT NOT NULL,
                action TEXT NOT NULL,
                worker_type TEXT NOT NULL,
                count INTEGER DEFAULT 1,
                reason TEXT,
                metrics_snapshot TEXT,
                created_at TEXT NOT NULL
            )
        ''')

        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO scaling_events
            (id, timestamp, trigger, action, worker_type, count, reason, metrics_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_data['id'],
            event_data['timestamp'],
            event_data['trigger'],
            event_data['action'],
            event_data['worker_type'],
            event_data.get('count', 1),
            event_data.get('reason', ''),
            json.dumps(event_data.get('metrics_snapshot', {})),
            now
        ))

        return event_data['id']


def get_scaling_events(limit: int = 50) -> List[Dict[str, Any]]:
    """Get recent scaling events"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM scaling_events
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))

        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row['id'],
                'timestamp': row['timestamp'],
                'trigger': row['trigger'],
                'action': row['action'],
                'worker_type': row['worker_type'],
                'count': row['count'],
                'reason': row['reason'],
                'metrics_snapshot': json.loads(row['metrics_snapshot'] or '{}')
            })
        return results


# ==================== Customer Operations ====================

def create_customer(customer_data: Dict[str, Any]) -> str:
    """Create a new customer"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO customers
            (id, email, name, stripe_customer_id, current_plan, subscription_status,
             agents_count, conversations_count, conversations_reset_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            customer_data['id'],
            customer_data['email'],
            customer_data.get('name'),
            customer_data.get('stripe_customer_id'),
            customer_data.get('current_plan', 'free'),
            customer_data.get('subscription_status', 'inactive'),
            customer_data.get('agents_count', 0),
            customer_data.get('conversations_count', 0),
            now,  # conversations_reset_at
            now,
            now
        ))

        return customer_data['id']


def get_customer(customer_id: str) -> Optional[Dict[str, Any]]:
    """Get customer by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM customers WHERE id = ?', (customer_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_customer_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get customer by email"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM customers WHERE email = ?', (email,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_customer_by_stripe_id(stripe_customer_id: str) -> Optional[Dict[str, Any]]:
    """Get customer by Stripe customer ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM customers WHERE stripe_customer_id = ?', (stripe_customer_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_customer(customer_id: str, updates: Dict[str, Any]) -> bool:
    """Update customer fields"""
    with get_connection() as conn:
        cursor = conn.cursor()
        updates['updated_at'] = datetime.now().isoformat()

        # Build dynamic update
        set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
        values = list(updates.values()) + [customer_id]

        cursor.execute(f'UPDATE customers SET {set_clause} WHERE id = ?', values)
        return cursor.rowcount > 0


def update_customer_subscription(
    customer_id: str,
    plan: str,
    status: str,
    subscription_id: str = None,
    period_end: str = None
):
    """Update customer subscription details"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            UPDATE customers
            SET current_plan = ?, subscription_status = ?, subscription_id = ?,
                subscription_period_end = ?, updated_at = ?
            WHERE id = ?
        ''', (plan, status, subscription_id, period_end, now, customer_id))


def increment_customer_usage(customer_id: str, agents: int = 0, conversations: int = 0):
    """Increment customer usage counters"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            UPDATE customers
            SET agents_count = agents_count + ?,
                conversations_count = conversations_count + ?,
                updated_at = ?
            WHERE id = ?
        ''', (agents, conversations, now, customer_id))


def reset_customer_conversations(customer_id: str):
    """Reset monthly conversation count"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            UPDATE customers
            SET conversations_count = 0, conversations_reset_at = ?, updated_at = ?
            WHERE id = ?
        ''', (now, now, customer_id))


def list_customers(plan: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """List customers with optional plan filter"""
    with get_connection() as conn:
        cursor = conn.cursor()

        if plan:
            cursor.execute(
                'SELECT * FROM customers WHERE current_plan = ? ORDER BY created_at DESC LIMIT ?',
                (plan, limit)
            )
        else:
            cursor.execute(
                'SELECT * FROM customers ORDER BY created_at DESC LIMIT ?',
                (limit,)
            )

        return [dict(row) for row in cursor.fetchall()]


def save_subscription_event(event_data: Dict[str, Any]) -> int:
    """Save a subscription event for audit trail"""
    with get_connection() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO subscription_events
            (customer_id, event_type, old_plan, new_plan, stripe_event_id, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_data['customer_id'],
            event_data['event_type'],
            event_data.get('old_plan'),
            event_data.get('new_plan'),
            event_data.get('stripe_event_id'),
            json.dumps(event_data.get('metadata', {})),
            now
        ))

        return cursor.lastrowid


def get_subscription_events(customer_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Get subscription events for a customer"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM subscription_events WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?',
            (customer_id, limit)
        )

        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row['id'],
                'customer_id': row['customer_id'],
                'event_type': row['event_type'],
                'old_plan': row['old_plan'],
                'new_plan': row['new_plan'],
                'stripe_event_id': row['stripe_event_id'],
                'metadata': json.loads(row['metadata'] or '{}'),
                'created_at': row['created_at']
            })
        return results


# Initialize on import
init_database()
