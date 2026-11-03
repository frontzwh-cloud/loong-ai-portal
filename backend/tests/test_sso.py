"""Security-focused regression tests; run: python -m unittest discover -s backend/tests"""
import asyncio
import os
import time
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from backend import sso


class SsoTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            "SSO_ENABLED": "true",
            "PORTAL_PUBLIC_URL": "https://portal.example.internal",
            "SSO_APPS_JSON": '{"gemba":{"callback":"https://gemba.example.internal/auth/callback","secret":"0123456789abcdef0123456789abcdef"}}',
        })
        self.env.start()
        sso._codes.clear()
        sso._pending.clear()
        sso._sessions.clear()

    def tearDown(self):
        self.env.stop()

    def test_only_registered_application_can_receive_code(self):
        with self.assertRaises(HTTPException):
            asyncio.run(sso._authorize("unknown", {"uid": "u123"}))

    def test_code_is_single_use_and_bound_to_app(self):
        response = asyncio.run(sso._authorize("gemba", {"uid": "u123", "name": "User"}))
        self.assertTrue(response.headers["location"].startswith("https://gemba.example.internal/auth/callback?code="))
        from urllib.parse import parse_qs, urlsplit
        code = parse_qs(urlsplit(response.headers["location"]).query)["code"][0]
        payload = sso.VerifyRequest(app_id="gemba", secret="0123456789abcdef0123456789abcdef", code=code)
        with self.assertRaises(HTTPException):
            asyncio.run(sso.verify(sso.VerifyRequest(app_id="other", secret=payload.secret, code=code)))
        result = asyncio.run(sso.verify(payload))
        self.assertIn(b'"uid":"u123"', result.body)
        with self.assertRaises(HTTPException):
            asyncio.run(sso.verify(payload))

    def test_expired_code_rejected(self):
        sso._codes["expired"] = (time.time() - 1, "gemba", {"uid": "u123"})
        with self.assertRaises(HTTPException):
            asyncio.run(sso.verify(sso.VerifyRequest(
                app_id="gemba", secret="0123456789abcdef0123456789abcdef", code="expired")))

    def test_workflow_query_parameterized_and_validated(self):
        from unittest.mock import MagicMock
        fake_connection = MagicMock()
        fake_cursor = fake_connection.__enter__.return_value.cursor.return_value.__enter__.return_value
        fake_cursor.fetchone.side_effect = [
            {"uid": "u123", "name": "Test User", "department": "IT", "active": 1}, None
        ]
        with patch.dict(os.environ, {
            "WORKFLOW_DB_HOST": "db.internal", "WORKFLOW_DB_NAME": "Workflow",
            "WORKFLOW_DB_USER": "readonly", "WORKFLOW_DB_PASSWORD": "fake",
            "WORKFLOW_USER_SQL": "SELECT UID AS uid, Name AS name, Department AS department, Active AS active FROM dbo.Users WHERE UID = %s"
        }):
            with patch("pytds.connect", return_value=fake_connection) as connect:
                user = sso._workflow_query("u123")
                self.assertEqual(user["uid"], "u123")
                self.assertEqual(user["name"], "Test User")
                fake_cursor.execute.assert_called_once()
                self.assertEqual(fake_cursor.execute.call_args.args[1], ("u123",))
                self.assertTrue(connect.call_args.kwargs["readonly"])

    def test_sql_duplicate_user_denied(self):
        from unittest.mock import MagicMock
        fake_connection = MagicMock()
        cursor = fake_connection.__enter__.return_value.cursor.return_value.__enter__.return_value
        cursor.fetchone.side_effect = [{"uid": "u123", "active": 1}, {"uid": "u123", "active": 1}]
        with patch.dict(os.environ, {
            "WORKFLOW_DB_HOST": "db.internal", "WORKFLOW_DB_NAME": "Workflow",
            "WORKFLOW_DB_USER": "readonly", "WORKFLOW_DB_PASSWORD": "fake",
            "WORKFLOW_USER_SQL": "SELECT UID AS uid, Active AS active FROM dbo.Users WHERE UID = %s"
        }):
            with patch("pytds.connect", return_value=fake_connection):
                with self.assertRaises(HTTPException):
                    sso._workflow_query("u123")

    def test_cas_blank_account_denied(self):
        class FakeResponse:
            content = b"  "
            def raise_for_status(self): pass
        class FakeClient:
            async def __aenter__(self): return self
            async def __aexit__(self, *_): pass
            async def get(self, *_ , **__): return FakeResponse()
        with patch.dict(os.environ, {"CAS_BASE_URL": "http://W3UY084VMA:9099"}):
            with patch.object(sso.httpx, "AsyncClient", return_value=FakeClient()):
                with self.assertRaises(HTTPException):
                    asyncio.run(sso._cas_account("ticket"))


if __name__ == "__main__":
    unittest.main()
