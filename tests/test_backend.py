import json
import httpx
import pytest
from fastapi.testclient import TestClient
from backend import main

@pytest.fixture(autouse=True)
def config(monkeypatch):
    for name in ['DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL', 'GEMBA_URL', 'DEEPSEEK_VERIFY_SSL']:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv('PORTAL_DEMO_MODE', 'false')
    monkeypatch.setenv('DEEPSEEK_BASE_URL', 'https://provider.example/v1')

client = TestClient(main.app)
def events(response): return [json.loads(line) for line in response.text.splitlines()]
def send(): return client.post('/api/chat', json={'messages':[{'role':'user','content':'hello'}]})

def test_missing_config():
    assert events(send())[0]['type'] == 'error'
    assert client.get('/api/health').json()['deepseek'] == 'not_configured'

@pytest.mark.parametrize('messages', [[], [{'role':'system','content':'x'}], [{'role':'user','content':''}],
    [{'role':'user','content':'x'*16001}], [{'role':'assistant','content':'x'}],
    [{'role':'user','content':'x'}]*41, [{'role':'user','content':'x'*16000}]*5,
    [{'role':'user','content':'x','secret':'not allowed'}]])
def test_validation(messages):
    assert client.post('/api/chat', json={'messages':messages}).status_code == 422

def test_body_limit():
    assert client.post('/api/chat', content=b'x'*262145).status_code == 413

def test_demo_never_calls_provider(monkeypatch):
    monkeypatch.setenv('PORTAL_DEMO_MODE','true')
    def forbidden(*args, **kwargs): raise AssertionError('external request')
    monkeypatch.setattr(main.httpx,'AsyncClient',forbidden)
    for _ in range(2):
        result=events(send())
        assert result[-1]['type']=='completed'
        assert '非真实 AI' in ''.join(e['content'] for e in result)

@pytest.mark.parametrize('url,expected', [('https://example.com/app','https://example.com/app'),('javascript:alert(1)',''),('https://user:secret@example.com',''),('file:///a','')])
def test_public_config_allowlist(monkeypatch,url,expected):
    monkeypatch.setenv('GEMBA_URL',url)
    monkeypatch.setenv('DEEPSEEK_API_KEY','SECRET_VALUE')
    response=client.get('/api/config')
    assert response.json()['links']['gemba']==expected
    assert 'SECRET_VALUE' not in response.text

def mock_provider(monkeypatch, body, status=200):
    monkeypatch.setenv('DEEPSEEK_API_KEY','SECRET_VALUE')
    monkeypatch.setenv('DEEPSEEK_MODEL','approved-model')
    original=httpx.AsyncClient
    def handler(request):
        assert str(request.url)=='https://provider.example/v1/chat/completions'
        assert json.loads(request.content)['messages']==[{'role':'user','content':'hello'}]
        return httpx.Response(status, text=body)
    def factory(**kwargs):
        assert kwargs.get('verify',True) is True
        return original(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(main.httpx,'AsyncClient',factory)

def test_live_stream_reasoning_and_usage(monkeypatch):
    mock_provider(monkeypatch,'data: {"choices":[]}\n\ndata: {"choices":[{"delta":{"reasoning_content":"reason","content":"answer"}}]}\n\ndata: [DONE]\n')
    result=events(send())
    assert [e['type'] for e in result]==['reasoning_delta','answer_delta','completed']

@pytest.mark.parametrize('body,status', [('SECRET_VALUE private upstream details',401),('data: {broken\n',200),('data: {"error":"SECRET_VALUE"}\n',200),('data: {"choices":[{"delta":{"content":"partial"}}]}\n',200)])
def test_provider_failure_is_visible_and_sanitized(monkeypatch,body,status):
    mock_provider(monkeypatch,body,status)
    response=send()
    assert events(response)[-1]['type']=='error'
    assert 'SECRET_VALUE' not in response.text

def test_transport_failure(monkeypatch):
    monkeypatch.setenv('DEEPSEEK_API_KEY','x')
    monkeypatch.setenv('DEEPSEEK_MODEL','x')
    class FailingClient:
        async def __aenter__(self): raise httpx.ConnectError('private TLS details')
        async def __aexit__(self,*args): pass
    monkeypatch.setattr(main.httpx,'AsyncClient',lambda **kwargs: FailingClient())
    assert 'HTTPS' in events(send())[0]['content']

def test_static_serving_and_no_env_exposure():
    assert client.get('/').status_code==200
    assert client.get('/loong-ai-mascot.png').headers['content-type']=='image/png'
    for path in ['/backend/.env','/.env','/api/unknown']:
        assert client.get(path).status_code==404


def test_internal_service_can_disable_tls_and_omit_key(monkeypatch):
    monkeypatch.setenv('DEEPSEEK_BASE_URL','https://vio.automotive-wan.com:446')
    monkeypatch.setenv('DEEPSEEK_MODEL','Loong_AI')
    monkeypatch.setenv('DEEPSEEK_VERIFY_SSL','false')
    original = httpx.AsyncClient
    def handler(request):
        assert str(request.url)=='https://vio.automotive-wan.com:446/chat/completions'
        assert 'authorization' not in request.headers
        return httpx.Response(200,text='data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n')
    def factory(**kwargs):
        assert kwargs['verify'] is False
        return original(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(main.httpx,'AsyncClient',factory)
    assert events(send())[-1]['type']=='completed'
    assert client.get('/api/health').json()['deepseek']=='configured'

def test_tls_opt_out_does_not_apply_to_other_host(monkeypatch):
    monkeypatch.setenv('DEEPSEEK_VERIFY_SSL','false')
    mock_provider(monkeypatch,'data: [DONE]\n')
    assert events(send())[-1]['type']=='completed'


def admin_headers(token="x" * 64, origin="http://127.0.0.1:8000", host="127.0.0.1:8000"):
    return {"Host": host, "Origin": origin, "Authorization": "Bearer " + token}


@pytest.fixture
def admin_registry(monkeypatch, tmp_path):
    monkeypatch.setenv("PORTAL_LINKS_FILE", str(tmp_path / "app-links.json"))
    monkeypatch.setenv("PORTAL_ADMIN_TOKEN", "x" * 64)
    yield tmp_path / "app-links.json"


def test_admin_disabled_without_key(monkeypatch):
    monkeypatch.delenv("PORTAL_ADMIN_TOKEN", raising=False)
    assert client.get("/api/admin/links", headers=admin_headers()).status_code == 503


def test_admin_rejects_remote_and_wrong_credentials(admin_registry):
    for headers, code in [
        (admin_headers(token="incorrect-token"), 401),
        (admin_headers(host="loongai"), 403),
        (admin_headers(origin="http://loongai"), 403),
    ]:
        assert client.put("/api/admin/links", headers=headers, json={"links": {}}).status_code == code
    assert not admin_registry.exists()
    response = client.get("/api/admin/links", headers={"Host":"127.0.0.1:8000", "Authorization":"Bearer " + "x"*64})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"


def test_admin_saves_meeting_download_page_without_restart(admin_registry, monkeypatch):
    monkeypatch.setenv("MEETING_DOWNLOAD_URL", "http://existing.internal/download")
    original = client.get("/api/config").json()["links"]
    assert original["meeting"] == "http://existing.internal/download"
    values = {key: "" for key in main.LINK_ENV}
    values["meeting"] = "https://download.example.test/meeting-assistant"
    values["gemba"] = "http://intranet.example.test/gemba"
    response = client.put("/api/admin/links", headers=admin_headers(), json={"links": values})
    assert response.status_code == 200
    assert response.json()["links"]["meeting"] == values["meeting"]
    assert client.get("/api/config").json()["links"]["meeting"] == values["meeting"]
    assert json.loads(admin_registry.read_text())["meeting"] == values["meeting"]
    assert admin_registry.stat().st_mode & 0o777 == 0o600
    # Read from the persistent path, rather than a module-level in-memory cache.
    assert client.get("/api/config").json()["links"]["gemba"] == values["gemba"]


@pytest.mark.parametrize("malicious", [
    "javascript:alert(1)", "file:///etc/passwd", "https://u:password@example.com/",
    "https://example.com/bad\nheader", " https://example.com/", "https://example.com/" + "x"*2100,
])
def test_admin_rejects_bad_link_without_overwriting_registry(admin_registry, malicious):
    values = {key: "" for key in main.LINK_ENV}
    values["meeting"] = malicious
    response = client.put("/api/admin/links", headers=admin_headers(), json={"links": values})
    assert response.status_code == 422
    assert not admin_registry.exists()


def test_admin_rejects_unknown_keys_and_large_payload(admin_registry):
    unknown = {key: "" for key in main.LINK_ENV}
    unknown["admin"] = "https://example.com"
    assert client.put("/api/admin/links", headers=admin_headers(), json={"links": unknown}).status_code == 422
    assert client.put("/api/admin/links", headers=admin_headers(), content=b"x"*262145).status_code == 413
    assert not admin_registry.exists()


def test_admin_does_not_serve_admin_configuration_as_static(admin_registry):
    values = {key: "" for key in main.LINK_ENV}
    values["meeting"] = "http://example.test/download"
    assert client.put("/api/admin/links", headers=admin_headers(), json={"links": values}).status_code == 200
    for name in ["/data/app-links.json", "/backend/link_registry.py", "/api/admin/links"]:
        response = client.get(name) if name != "/api/admin/links" else client.get(name, headers={"Host":"loongai"})
        assert response.status_code in (403, 404)
