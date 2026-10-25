"""Package the committed source and the actually tested local Docker image."""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import gzip
import shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def main():
    if subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip():
        raise SystemExit('Commit the final source before packaging.')
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    container=json.loads(subprocess.check_output(['docker','inspect','loong-ai-portal-portal-1']))[0]
    if container['State'].get('Health',{}).get('Status')!='healthy':
        raise SystemExit('Acceptance container must be healthy before packaging.')
    image=container['Config']['Image']
    if not image.startswith('loong-ai-portal:0.1.0-rc.2-') or 'acceptance-' in image:
        raise SystemExit('Restore the candidate image before packaging.')
    info=json.loads(subprocess.check_output(['docker','image','inspect',image]))[0]
    assert info['Architecture']=='amd64'
    # No proxy configuration, credentials or build CA is embedded in the runtime image.
    assert not any('proxy' in v.split('=',1)[0].lower() for v in info['Config']['Env'])
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='loong-package-') as temp:
        work=Path(temp); source=work/'LoongAI-Portal-Ubuntu';source.mkdir()
        raw=work/'source.tar'
        subprocess.run(['git','archive','--format=tar','-o',str(raw),head],cwd=ROOT,check=True)
        with tarfile.open(raw) as tar: tar.extractall(source,filter='data')
        (source/'ARTIFACT_INFO.json').write_text(json.dumps({'commit':head,'image':image,'image_id':info['Id'],'architecture':'linux/amd64','provider_live_tested':False},indent=2)+'\n')
        manifest=''.join(f'{sha(p)}  {p.relative_to(source)}\n' for p in sorted(source.rglob('*')) if p.is_file())
        (source/'SOURCE_SHA256SUMS').write_text(manifest)
        src=OUT/'LoongAI-Portal-Ubuntu-RC.tar.gz'
        with tarfile.open(src,'w:gz') as tar: tar.add(source,arcname=source.name)
        images=source/'images';images.mkdir()
        archive=images/'portal-image.tar.gz'
        with archive.open('wb') as output:
            save=subprocess.Popen(['docker','save',image],stdout=subprocess.PIPE)
            with gzip.GzipFile(fileobj=output,mode='wb',compresslevel=6,mtime=0) as compressed:
                shutil.copyfileobj(save.stdout,compressed)
            if save.wait(): raise SystemExit('docker save failed')
        (images/'SHA256SUMS').write_text(f'{sha(archive)}  {archive.name}\n')
        offline=OUT/'LoongAI-Portal-Ubuntu-amd64-Offline.tar.gz'
        with tarfile.open(offline,'w:gz') as tar: tar.add(source,arcname=source.name)
        for artifact in [src,offline]:
            checksum=sha(artifact)
            artifact.with_name(artifact.name+'.sha256').write_text(f'{checksum}  {artifact.name}\n')
            print(json.dumps({'file':str(artifact),'bytes':artifact.stat().st_size,'sha256':checksum,'commit':head}))

if __name__=='__main__':main()
