"""Build offline Windows x64 ZIP on Linux or Windows; never includes local .env."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.request import urlopen
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
BOOTSTRAP = '--bootstrap' in sys.argv
STAGE = OUT / ('LoongAI-Portal-Windows-x64-Setup' if BOOTSTRAP else 'LoongAI-Portal-Windows-x64')
PYTHON_VERSION = '3.13.17'
PYTHON_URL = f'https://www.python.org/ftp/python/{PYTHON_VERSION}/python-{PYTHON_VERSION}-embed-amd64.zip'
# Published by https://www.python.org/downloads/release/python-31317/
PYTHON_SHA256 = '9e35319bffedab8b36ad44d8f377cb4f1733bcec257a0b6d04d94f01486ddb38'

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    if not (ROOT / 'frontend/dist/index.html').is_file():
        raise SystemExit('Run npm ci && npm run build in frontend first.')
    OUT.mkdir(exist_ok=True)
    if STAGE.exists(): shutil.rmtree(STAGE)
    STAGE.mkdir()
    for name in ['launcher.py', 'Start-Portal.cmd', 'LOCAL_DEPLOYMENT.md', 'THIRD_PARTY_NOTICES.md']:
        if name.endswith('.cmd'):
            (STAGE / name).write_bytes((ROOT / name).read_text().replace('\n', '\r\n').encode('ascii'))
        else:
            shutil.copyfile(ROOT / name, STAGE / name)
    (STAGE / 'backend').mkdir()
    for name in ['main.py', '.env.example', 'requirements.lock']:
        shutil.copyfile(ROOT / 'backend' / name, STAGE / 'backend' / name)
    shutil.copytree(ROOT / 'frontend/dist', STAGE / 'frontend/dist')
    runtime = STAGE / '.runtime'
    runtime.mkdir()
    if not BOOTSTRAP:
        archive = OUT / f'python-{PYTHON_VERSION}-embed-amd64.zip'
        if not archive.exists():
            with urlopen(PYTHON_URL, timeout=60) as response:
                archive.write_bytes(response.read())
        if digest(archive) != PYTHON_SHA256:
            raise SystemExit('Python archive checksum mismatch; refusing to package.')
        with ZipFile(archive) as z: z.extractall(runtime)
        (runtime / 'portal-runtime-ready').write_text(PYTHON_VERSION + ' verified\n')
    (runtime / 'python313._pth').write_text('python313.zip\n.\nLib/site-packages\n..\nimport site\n')
    wheels = OUT / 'windows-wheels'
    if wheels.exists(): shutil.rmtree(wheels)
    wheels.mkdir()
    subprocess.run([sys.executable, '-m', 'pip', 'download', '--disable-pip-version-check', '--only-binary=:all:',
                    '--platform', 'win_amd64', '--python-version', '313', '--implementation', 'cp',
                    '--abi', 'cp313', '-r', str(ROOT / 'backend/requirements.lock'),
                    # pip evaluates some platform markers on the build host; click needs colorama on Windows.
                    'colorama==0.4.6', '-d', str(wheels)], check=True)
    site = runtime / 'Lib/site-packages'
    site.mkdir(parents=True)
    for wheel in sorted(wheels.glob('*.whl')):
        with ZipFile(wheel) as z:
            for entry in z.infolist():
                parts = Path(entry.filename).parts
                if any(p.endswith('.data') for p in parts):
                    raise SystemExit(f'Wheel with install relocation requires explicit support: {wheel.name}')
            z.extractall(site)
    # Retain all dependency license texts from the frontend build tree.
    licenses = STAGE / 'licenses/frontend'
    modules = ROOT / 'frontend/node_modules'
    for path in modules.rglob('*'):
        if path.is_file() and path.name.lower().startswith(('license', 'licence', 'copying', 'notice')):
            target = licenses / path.relative_to(modules)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
    manifest = {'upstream_head': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
                'python_url':PYTHON_URL, 'python_sha256':PYTHON_SHA256,
                'windows_runtime_tested':False, 'runtime_included':not BOOTSTRAP,
                'wheels': {p.name:digest(p) for p in sorted(wheels.glob('*.whl'))}}
    (STAGE / 'BUILD_INFO.json').write_text(json.dumps(manifest,indent=2)+'\n')
    hashes = {str(p.relative_to(STAGE)).replace('\\','/'):digest(p) for p in sorted(STAGE.rglob('*')) if p.is_file()}
    (STAGE / 'SHA256SUMS.json').write_text(json.dumps(hashes,indent=2)+'\n')
    package = OUT / (STAGE.name + '.zip')
    with ZipFile(package,'w',ZIP_DEFLATED) as z:
        for p in sorted(STAGE.rglob('*')):
            if p.is_file(): z.write(p,p.relative_to(OUT))
    (OUT / (package.name+'.sha256')).write_text(f'{digest(package)}  {package.name}\n')
    print(f'Built {package} ({package.stat().st_size:,} bytes)\nSHA256 {digest(package)}')

if __name__ == '__main__': main()
