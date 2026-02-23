"""
Tests for logging_config.py - Structured Logging Configuration.
Tests formatters, log levels, and logger retrieval.
"""

import os
import json
import logging
import pytest
from io import StringIO
from unittest.mock import patch


class TestStructuredFormatter:
    """Tests for StructuredFormatter JSON output."""

    def test_formatter_outputs_json(self):
        """Test that StructuredFormatter outputs valid JSON."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=42,
            msg='Test message',
            args=(),
            exc_info=None
        )

        output = formatter.format(record)

        # Should be valid JSON
        parsed = json.loads(output)
        assert isinstance(parsed, dict)

    def test_formatter_includes_timestamp(self):
        """Test that formatter includes timestamp in ISO format."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=42,
            msg='Test message',
            args=(),
            exc_info=None
        )

        output = formatter.format(record)
        parsed = json.loads(output)

        assert 'timestamp' in parsed
        # Should end with Z for UTC
        assert parsed['timestamp'].endswith('Z')

    def test_formatter_includes_level(self):
        """Test that formatter includes log level."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()

        for level_name, level in [('debug', logging.DEBUG), ('info', logging.INFO),
                                   ('warning', logging.WARNING), ('error', logging.ERROR),
                                   ('critical', logging.CRITICAL)]:
            record = logging.LogRecord(
                name='test.logger',
                level=level,
                pathname='test.py',
                lineno=42,
                msg='Test message',
                args=(),
                exc_info=None
            )

            output = formatter.format(record)
            parsed = json.loads(output)

            assert 'level' in parsed
            assert parsed['level'] == level_name

    def test_formatter_includes_context(self):
        """Test that formatter includes logger name as context."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name='AgentForge.API',
            level=logging.INFO,
            pathname='api.py',
            lineno=42,
            msg='Test message',
            args=(),
            exc_info=None
        )

        output = formatter.format(record)
        parsed = json.loads(output)

        assert 'context' in parsed
        assert parsed['context'] == 'AgentForge.API'

    def test_formatter_includes_message(self):
        """Test that formatter includes the log message."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=42,
            msg='This is a test message with %s',
            args=('parameter',),
            exc_info=None
        )

        output = formatter.format(record)
        parsed = json.loads(output)

        assert 'message' in parsed
        assert parsed['message'] == 'This is a test message with parameter'

    def test_formatter_includes_file_info(self):
        """Test that formatter includes filename and line number."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test_file.py',
            lineno=99,
            msg='Test message',
            args=(),
            exc_info=None,
            func='test_function'
        )

        output = formatter.format(record)
        parsed = json.loads(output)

        assert 'filename' in parsed
        assert parsed['filename'] == 'test_file.py'
        assert 'lineno' in parsed
        assert parsed['lineno'] == 99
        assert 'funcName' in parsed
        assert parsed['funcName'] == 'test_function'

    def test_formatter_includes_exception_info(self):
        """Test that formatter includes exception info when present."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()

        try:
            raise ValueError("Test exception")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name='test.logger',
            level=logging.ERROR,
            pathname='test.py',
            lineno=42,
            msg='Error occurred',
            args=(),
            exc_info=exc_info
        )

        output = formatter.format(record)
        parsed = json.loads(output)

        assert 'error' in parsed
        assert 'ValueError' in parsed['error']
        assert 'Test exception' in parsed['error']

    def test_formatter_includes_extra_fields(self):
        """Test that formatter includes extra_fields when present."""
        from backend.logging_config import StructuredFormatter

        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=42,
            msg='Test message',
            args=(),
            exc_info=None
        )
        record.extra_fields = {'request_id': '12345', 'user_id': 'user_abc'}

        output = formatter.format(record)
        parsed = json.loads(output)

        assert 'request_id' in parsed
        assert parsed['request_id'] == '12345'
        assert 'user_id' in parsed
        assert parsed['user_id'] == 'user_abc'


class TestDevelopmentFormatter:
    """Tests for DevelopmentFormatter human-readable output."""

    def test_formatter_outputs_readable(self):
        """Test that DevelopmentFormatter outputs human-readable format."""
        from backend.logging_config import DevelopmentFormatter

        formatter = DevelopmentFormatter()
        record = logging.LogRecord(
            name='test.logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=42,
            msg='Test message',
            args=(),
            exc_info=None
        )

        output = formatter.format(record)

        # Should contain level and message
        assert 'INFO' in output
        assert 'Test message' in output
        assert 'test.logger' in output

    def test_formatter_includes_colors(self):
        """Test that DevelopmentFormatter includes ANSI color codes."""
        from backend.logging_config import DevelopmentFormatter

        formatter = DevelopmentFormatter()

        # Test that COLORS dict exists and has expected keys
        assert 'DEBUG' in formatter.COLORS
        assert 'INFO' in formatter.COLORS
        assert 'WARNING' in formatter.COLORS
        assert 'ERROR' in formatter.COLORS
        assert 'CRITICAL' in formatter.COLORS
        assert 'RESET' in formatter.COLORS

    def test_formatter_handles_exception(self):
        """Test that DevelopmentFormatter includes exception in output."""
        from backend.logging_config import DevelopmentFormatter

        formatter = DevelopmentFormatter()

        try:
            raise RuntimeError("Test error")
        except RuntimeError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name='test.logger',
            level=logging.ERROR,
            pathname='test.py',
            lineno=42,
            msg='Error occurred',
            args=(),
            exc_info=exc_info
        )

        output = formatter.format(record)

        assert 'RuntimeError' in output
        assert 'Test error' in output


class TestGetLogger:
    """Tests for get_logger function."""

    def test_get_logger_returns_logger(self):
        """Test that get_logger returns a Logger instance."""
        from backend.logging_config import get_logger

        logger = get_logger('test.module')

        assert isinstance(logger, logging.Logger)
        assert logger.name == 'test.module'

    def test_get_logger_same_name_returns_same_logger(self):
        """Test that get_logger with same name returns same logger."""
        from backend.logging_config import get_logger

        logger1 = get_logger('same.name')
        logger2 = get_logger('same.name')

        assert logger1 is logger2

    def test_get_logger_different_names(self):
        """Test that get_logger with different names returns different loggers."""
        from backend.logging_config import get_logger

        logger1 = get_logger('module.one')
        logger2 = get_logger('module.two')

        assert logger1 is not logger2
        assert logger1.name != logger2.name


class TestLogLevels:
    """Tests for log level configuration."""

    def test_setup_logging_sets_level(self):
        """Test that setup_logging sets the correct log level."""
        from backend.logging_config import setup_logging

        # Clear existing handlers first
        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='DEBUG', is_development=True)
        assert root_logger.level == logging.DEBUG

        setup_logging(level='WARNING', is_development=True)
        assert root_logger.level == logging.WARNING

    def test_setup_logging_case_insensitive(self):
        """Test that setup_logging handles level case insensitively."""
        from backend.logging_config import setup_logging

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='debug', is_development=True)
        assert root_logger.level == logging.DEBUG

        setup_logging(level='Info', is_development=True)
        assert root_logger.level == logging.INFO

    def test_setup_logging_development_formatter(self):
        """Test that development mode uses DevelopmentFormatter."""
        from backend.logging_config import setup_logging, DevelopmentFormatter

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='INFO', is_development=True)

        # Should have a handler with DevelopmentFormatter
        assert len(root_logger.handlers) > 0
        handler = root_logger.handlers[0]
        assert isinstance(handler.formatter, DevelopmentFormatter)

    def test_setup_logging_production_formatter(self):
        """Test that production mode uses StructuredFormatter."""
        from backend.logging_config import setup_logging, StructuredFormatter

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='INFO', is_development=False)

        # Should have a handler with StructuredFormatter
        assert len(root_logger.handlers) > 0
        handler = root_logger.handlers[0]
        assert isinstance(handler.formatter, StructuredFormatter)

    def test_debug_level_logs_debug(self):
        """Test that DEBUG level logs debug messages."""
        from backend.logging_config import setup_logging, get_logger

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='DEBUG', is_development=True)
        logger = get_logger('test.debug')

        # Capture log output
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setLevel(logging.DEBUG)
        logger.addHandler(handler)

        logger.debug('Debug message')
        logger.info('Info message')

        output = stream.getvalue()
        assert 'Debug message' in output
        assert 'Info message' in output

        # Cleanup
        logger.removeHandler(handler)

    def test_info_level_skips_debug(self):
        """Test that INFO level skips debug messages."""
        from backend.logging_config import setup_logging, get_logger

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='INFO', is_development=True)
        logger = get_logger('test.info')

        # Create a fresh logger for this test
        test_logger = logging.getLogger('test.info.only')
        test_logger.setLevel(logging.INFO)

        # Capture log output
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setLevel(logging.DEBUG)  # Handler accepts all, logger filters
        test_logger.addHandler(handler)

        test_logger.debug('Debug message')
        test_logger.info('Info message')

        output = stream.getvalue()
        assert 'Debug message' not in output
        assert 'Info message' in output

        # Cleanup
        test_logger.removeHandler(handler)

    def test_warning_level_skips_info(self):
        """Test that WARNING level skips info messages."""
        from backend.logging_config import get_logger

        # Create a fresh logger for this test
        test_logger = logging.getLogger('test.warning.only')
        test_logger.setLevel(logging.WARNING)

        # Capture log output
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setLevel(logging.DEBUG)  # Handler accepts all, logger filters
        test_logger.addHandler(handler)

        test_logger.info('Info message')
        test_logger.warning('Warning message')

        output = stream.getvalue()
        assert 'Info message' not in output
        assert 'Warning message' in output

        # Cleanup
        test_logger.removeHandler(handler)


class TestGetContextLogger:
    """Tests for get_context_logger function."""

    def test_get_context_logger_returns_adapter(self):
        """Test that get_context_logger returns a LoggerAdapter."""
        from backend.logging_config import get_context_logger, LoggerAdapter

        logger = get_context_logger('test.context', request_id='123')

        assert isinstance(logger, LoggerAdapter)

    def test_get_context_logger_includes_context(self):
        """Test that get_context_logger includes extra context."""
        from backend.logging_config import get_context_logger

        logger = get_context_logger('test.context', request_id='abc123', user_id='user_456')

        assert logger.extra == {'extra_fields': {'request_id': 'abc123', 'user_id': 'user_456'}}


class TestLoggingFileHandler:
    """Tests for file logging capability."""

    def test_setup_logging_with_file(self, tmp_path):
        """Test that setup_logging creates file handler when specified."""
        from backend.logging_config import setup_logging

        log_file = tmp_path / "test.log"

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='INFO', is_development=False, log_file=str(log_file))

        # Should have at least 2 handlers (console + file)
        assert len(root_logger.handlers) >= 2

        # Log something
        test_logger = logging.getLogger('test.file')
        test_logger.info('Test file message')

        # Check file was written
        assert log_file.exists()
        content = log_file.read_text()
        assert 'Test file message' in content


class TestThirdPartyLoggers:
    """Tests for third-party logger configuration."""

    def test_uvicorn_logger_level(self):
        """Test that uvicorn logger is set to WARNING."""
        from backend.logging_config import setup_logging

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='INFO', is_development=True)

        uvicorn_logger = logging.getLogger('uvicorn')
        assert uvicorn_logger.level == logging.WARNING

    def test_httpx_logger_level(self):
        """Test that httpx logger is set to WARNING."""
        from backend.logging_config import setup_logging

        root_logger = logging.getLogger()
        root_logger.handlers.clear()

        setup_logging(level='INFO', is_development=True)

        httpx_logger = logging.getLogger('httpx')
        assert httpx_logger.level == logging.WARNING
