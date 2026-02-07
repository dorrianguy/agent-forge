"""
Tests for CORS origin parsing and validation.
Ensures origins are properly sanitized and validated.
"""

import pytest
import os


class TestCorsOriginParsing:
    """Tests for _parse_cors_origins helper."""

    def get_parser(self):
        """Import the CORS parser function."""
        from backend.api import _parse_cors_origins
        return _parse_cors_origins

    def test_basic_parsing(self):
        """Should parse comma-separated origins."""
        parse = self.get_parser()
        result = parse("http://localhost:3000,http://localhost:8000")
        assert result == ["http://localhost:3000", "http://localhost:8000"]

    def test_whitespace_trimming(self):
        """Should strip whitespace from origins."""
        parse = self.get_parser()
        result = parse("  http://localhost:3000 , http://localhost:8000  ")
        assert result == ["http://localhost:3000", "http://localhost:8000"]

    def test_trailing_slash_removed(self):
        """Should remove trailing slashes from origins."""
        parse = self.get_parser()
        result = parse("http://localhost:3000/,https://example.com/")
        assert result == ["http://localhost:3000", "https://example.com"]

    def test_empty_entries_filtered(self):
        """Should filter out empty entries from double commas."""
        parse = self.get_parser()
        result = parse("http://localhost:3000,,http://localhost:8000,")
        assert result == ["http://localhost:3000", "http://localhost:8000"]

    def test_wildcard_rejected(self):
        """Should reject wildcard '*' origin."""
        parse = self.get_parser()
        result = parse("*")
        # Should fall back to defaults since wildcard is rejected
        assert "http://localhost:3000" in result
        assert "*" not in result

    def test_invalid_origin_rejected(self):
        """Should reject origins without http:// or https://."""
        parse = self.get_parser()
        result = parse("localhost:3000,http://valid.com")
        assert "http://valid.com" in result
        assert "localhost:3000" not in result

    def test_empty_string_returns_defaults(self):
        """Empty string should return defaults."""
        parse = self.get_parser()
        result = parse("")
        assert len(result) > 0  # Should have fallback defaults

    def test_https_origins_accepted(self):
        """HTTPS origins should always be accepted."""
        parse = self.get_parser()
        result = parse("https://myapp.vercel.app,https://myapp.com")
        assert "https://myapp.vercel.app" in result
        assert "https://myapp.com" in result

    def test_mixed_valid_invalid(self):
        """Should keep valid origins and reject invalid ones."""
        parse = self.get_parser()
        result = parse("http://localhost:3000,ftp://bad.com,https://good.com,tcp://also-bad")
        assert "http://localhost:3000" in result
        assert "https://good.com" in result
        assert "ftp://bad.com" not in result
        assert "tcp://also-bad" not in result
