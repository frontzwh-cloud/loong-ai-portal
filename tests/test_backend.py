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
