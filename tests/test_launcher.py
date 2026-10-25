import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

import pytest

ROOT = Path(__file__).resolve().parents[1]

@pytest.fixture
def installation(tmp_path):
    # Real subprocess from a directory containing spaces and non-ASCII characters.
    root = tmp_path / '龙小智 local portal'
    (root / 'backend').mkdir(parents=True)
    for filename in ['main.py','.env.example']:
        shutil.copyfile(ROOT/'backend'/filename,root/'backend'/filename)
    shutil.copyfile(ROOT/'launcher.py',root/'launcher.py')
    (root/'frontend/dist').mkdir(parents=True)
    (root/'frontend/dist/index.html').write_text('<html>Portal test</html>')
    return root

def unused_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); return sock.getsockname()[1]

def run(root,port):
    env={**os.environ,'PORTAL_PORT':str(port),'PORTAL_DEMO_MODE':'true'}
    return subprocess.Popen([sys.executable,str(root/'launcher.py'),'--no-browser'],cwd=Path('/tmp') if os.name!='nt' else root,
                            env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)

def ready(port,process):
    for _ in range(100):
        if process.poll() is not None: raise AssertionError(process.communicate()[0])
        try:
            with urlopen(f'http://127.0.0.1:{port}/api/health',timeout=.2) as response:
                assert json.load(response)['app']=='loong-ai-portal'; return
        except OSError: time.sleep(.05)
    raise AssertionError('Server did not start')

def stop(process):
    process.terminate()
    try: process.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill(); process.communicate(); raise

def test_start_duplicate_and_restart_preserves_config(installation):
    port=unused_port(); first=run(installation,port)
    try:
        ready(port,first)
        config=installation/'backend/.env'
        config.write_text(config.read_text()+'\n# preserved user configuration\n')
        original=config.read_bytes()
        duplicate=run(installation,port)
        output=duplicate.communicate(timeout=10)[0]
        assert duplicate.returncode==0 and 'already running' in output
    finally: stop(first)
    restarted=run(installation,port)
    try:
        ready(port,restarted); assert config.read_bytes()==original
    finally: stop(restarted)

def test_conflicting_port_does_not_kill_other_process(installation):
    with socket.socket() as occupied:
        occupied.bind(('127.0.0.1',0)); occupied.listen()
        process=run(installation,occupied.getsockname()[1])
        output=process.communicate(timeout=10)[0]
        assert process.returncode==1 and 'occupied' in output
        assert occupied.fileno()>=0

@pytest.mark.parametrize('port',['nope','80','65536'])
def test_invalid_port_is_actionable(installation,port):
    process=run(installation,port)
    output=process.communicate(timeout=10)[0]
    assert process.returncode==1 and 'PORTAL_PORT' in output

def test_missing_build(installation):
    (installation/'frontend/dist/index.html').unlink()
    process=run(installation,unused_port())
    assert 'Frontend build missing' in process.communicate(timeout=10)[0]
    assert process.returncode==1
