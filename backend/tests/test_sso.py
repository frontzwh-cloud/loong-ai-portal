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

    def test_invalid_workflow_response_denied(self):
        class FakeResponse:
            def raise_for_status(self): pass
            def json(self): return {"uid": "different", "active": True}

        class FakeClient:
            async def __aenter__(self): return self
            async def __aexit__(self, *_): pass
            async def get(self, *_): return FakeResponse()

        with patch.dict(os.environ, {"WORKFLOW_USER_URL": "https://workflow.example.internal/user?uid={uid}"}):
            with patch.object(sso.httpx, "AsyncClient", return_value=FakeClient()):
                with self.assertRaises(HTTPException):
                    asyncio.run(sso._workflow_user("u123"))

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
