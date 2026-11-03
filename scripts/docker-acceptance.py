"""Opt-in integration checks: only run against a dedicated local test installation."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
HOME = Path(os.environ['PORTAL_HOME'])
assert HOME.name == 'portal-docker-acceptance', 'Dedicated test installation required'
ENV = {**os.environ, 'PORTAL_WAIT_TIMEOUT':'20'}
RESULTS = []
OUT = ROOT/'artifacts'
OUT.mkdir(exist_ok=True)

def run(args, ok=True, cwd=ROOT):
    result = subprocess.run(args,cwd=cwd,env=ENV,capture_output=True,text=True,timeout=180)
    with (OUT/'docker-acceptance-commands.txt').open('a') as f:
        f.write('COMMAND: '+' '.join(map(str,args))+'\n'+result.stdout+result.stderr+'\n')
    if ok and result.returncode: raise AssertionError(result.stdout+result.stderr)
    return result

def deploy(command, source=ROOT, ok=True): return run(['bash',str(source/'deploy.sh'),command],ok)
def inspect(): return json.loads(run(['docker','inspect','loong-ai-portal-portal-1']).stdout)[0]
def request(path, data=None):
    req=urllib.request.Request('http://127.0.0.1:8000'+path, data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req,timeout=5) as response: return response.read()
def events(): return [json.loads(x) for x in request('/api/chat',{'messages':[{'role':'user','content':'container acceptance'}]}).splitlines()]
def record(name, fn):
    fn(); RESULTS.append({'name':name,'status':'passed'}); print('PASS',name,flush=True)
def check(condition): assert condition

def clone(dest):
    for name in ['Dockerfile','.dockerignore','compose.yaml','VERSION','deploy.sh']:
        shutil.copyfile(ROOT/name,dest/name)
    shutil.copytree(ROOT/'backend',dest/'backend',ignore=shutil.ignore_patterns('.env','__pycache__'))
    shutil.copytree(ROOT/'frontend',dest/'frontend',ignore=shutil.ignore_patterns('node_modules','dist','.env'))
    shutil.copytree(ROOT/'deploy',dest/'deploy')

try:
    with tempfile.TemporaryDirectory(prefix='portal-no-previous-') as empty:
        record('no previous version returns a clear error',lambda: check(run(['env','PORTAL_HOME='+empty,'bash',str(ROOT/'deploy.sh'),'rollback'],ok=False).returncode != 0))
    deploy('install')
    base=(HOME/'current').resolve()
    config=HOME/'shared/portal.env'
    original=config.read_bytes()
    record('healthy nonroot readonly container / loopback binding',lambda: check(
        inspect()['State']['Health']['Status']=='healthy' and inspect()['Config']['User']=='10001:10001'
        and inspect()['HostConfig']['ReadonlyRootfs'] and inspect()['HostConfig']['PortBindings']['8000/tcp'][0]['HostIp']=='127.0.0.1'))
    record('built UI and mascot served',lambda: check(b'<html' in request('/') and request('/loong-ai-mascot.png').startswith(b'\x89PNG')))
    record('demo streaming completed without live credentials',lambda: check(events()[-1]['type']=='completed' and '非真实 AI' in ''.join(x['content'] for x in events())))
    before=inspect()['Id']; deploy('install')
    record('repeat installation reuses container and preserves config',lambda: check(inspect()['Id']==before and config.read_bytes()==original))
    # Synthetic marker only, never a real credential or a live model request.
    config.write_text(config.read_text().replace('DEEPSEEK_API_KEY=','DEEPSEEK_API_KEY=literal-$-acceptance-sentinel'))
    deploy('restart')
    run(['docker','exec','loong-ai-portal-portal-1','python','-c',"import os; assert os.environ['DEEPSEEK_API_KEY']=='literal-$-acceptance-sentinel'"])
    record('literal dollar values survive Compose env parsing',lambda: None)
    config.write_bytes(original.replace(b'PORTAL_DEMO_MODE=true',b'PORTAL_DEMO_MODE=false'))
    deploy('restart')
    record('missing live AI configuration shows an error',lambda: check(events()[0]['type']=='error'))
    config.write_bytes(original); deploy('restart')
    with tempfile.TemporaryDirectory(prefix='portal-docker-update-') as temp:
        source=Path(temp); clone(source)
        (source/'VERSION').write_text('0.1.0-rc.2-acceptance-update\n')
        deploy('update',source)
        updated=(HOME/'current').resolve()
        record('versioned update and shared config preservation',lambda: check(updated!=base and (HOME/'previous').resolve()==base and config.read_bytes()==original))
        deploy('rollback')
        record('rollback restores previous healthy release',lambda: check((HOME/'current').resolve()==base and inspect()['State']['Health']['Status']=='healthy'))
        # Build failure must not touch the current healthy container.
        (source/'VERSION').write_text('0.1.0-rc.2-acceptance-bad-build\n')
        (source/'Dockerfile').write_text((source/'Dockerfile').read_text()+'\nRUN false\n')
        before=inspect()['Id']
        result=deploy('update',source,ok=False)
        record('failed build preserves running release',lambda: check(result.returncode!=0 and inspect()['Id']==before and (HOME/'current').resolve()==base))
        shutil.copyfile(ROOT/'Dockerfile',source/'Dockerfile')
        (source/'VERSION').write_text('0.1.0-rc.2-acceptance-unhealthy\n')
        cfg=(source/'compose.yaml').read_text().replace('    restart: unless-stopped','    healthcheck:\n      test: ["CMD", "python", "-c", "raise SystemExit(1)"]\n      interval: 1s\n      timeout: 1s\n      retries: 1\n      start_period: 1s\n    restart: unless-stopped')
        (source/'compose.yaml').write_text(cfg)
        result=deploy('update',source,ok=False)
        record('unhealthy update automatically restores prior release',lambda: check(result.returncode!=0 and (HOME/'current').resolve()==base and inspect()['State']['Health']['Status']=='healthy'))
    run(['docker','restart','loong-ai-portal-portal-1'])
    for _ in range(40):
        if inspect()['State']['Health']['Status']=='healthy': break
        time.sleep(.25)
    record('container restart recovers health and configuration',lambda: check(inspect()['State']['Health']['Status']=='healthy' and config.read_bytes()==original))
    record('server config is owner-only and not baked into image',lambda: check(config.stat().st_mode & 0o777 == 0o600 and run(['docker','exec','loong-ai-portal-portal-1','python','-c',"from pathlib import Path; assert not Path('/app/backend/.env').exists()"] ).returncode==0))
finally:
    (OUT/'docker-acceptance-results.json').write_text(json.dumps(RESULTS,indent=2)+'\n')
