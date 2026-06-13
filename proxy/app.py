from flask import Flask, request, Response, redirect
import json
import os
import threading
import requests as http_requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

app = Flask(__name__)

CREDENTIALS_PATH = '/root/projects/agentes-office/data/json/credentials.json'
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
CACHE_DIR = '/root/kongflix-proxy/cache'
os.makedirs(CACHE_DIR, exist_ok=True)

_lock = threading.Lock()
_creds = None
_downloading = set()

def cleanup_cache(max_gb=40):
    try:
        files = []
        total_size = 0
        for f in os.listdir(CACHE_DIR):
            if f.endswith('.mp4'):
                p = os.path.join(CACHE_DIR, f)
                sz = os.path.getsize(p)
                files.append((p, os.path.getatime(p), sz))
                total_size += sz
        
        limit = max_gb * 1024 * 1024 * 1024
        if total_size > limit:
            files.sort(key=lambda x: x[1])
            for p, atime, sz in files:
                os.remove(p)
                total_size -= sz
                print(f"[PROXY] Evicted {p} to free space")
                if total_size <= limit:
                    break
    except Exception as e:
        print(f"[PROXY] Cleanup error: {e}")

def background_cache(did):
    if did in _downloading: return
    _downloading.add(did)
    token = get_token()
    url = f"https://www.googleapis.com/drive/v3/files/{did}?alt=media&acknowledgeAbuse=true"
    headers = {'Authorization': f'Bearer {token}'}
    try:
        print(f"[PROXY] Starting background cache for {did}")
        r = http_requests.get(url, headers=headers, stream=True, timeout=(10, 600))
        if r.status_code == 200:
            tmp_path = cache_path(did) + ".tmp"
            with open(tmp_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    if chunk: f.write(chunk)
            os.rename(tmp_path, cache_path(did))
            print(f"[PROXY] Successfully cached {did}")
            cleanup_cache()
        else:
            print(f"[PROXY] Failed to cache {did}, status {r.status_code}")
    except Exception as e:
        print(f"[PROXY] Exception caching {did}: {e}")
    finally:
        if did in _downloading: _downloading.remove(did)
        tmp_path = cache_path(did) + ".tmp"
        if os.path.exists(tmp_path): os.remove(tmp_path)

def get_token():
    global _creds
    with _lock:
        if _creds and _creds.token and _creds.valid:
            return _creds.token
        if _creds and _creds.expired:
            _creds.refresh(Request())
            return _creds.token
        _creds = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
        _creds.refresh(Request())
        print(f"[PROXY] SA: {_creds.service_account_email}")
        return _creds.token

def cache_path(did):
    return os.path.join(CACHE_DIR, f"{did}.mp4")

def serve_from_cache(did):
    path = cache_path(did)
    fsize = os.path.getsize(path)
    rng = request.headers.get('Range')
    if rng:
        parts = rng.replace('bytes=', '').split('-')
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else fsize - 1
        end = min(end, fsize - 1)
        length = end - start + 1
        def gen():
            with open(path, 'rb') as f:
                f.seek(start)
                rem = length
                while rem > 0:
                    data = f.read(min(1024*1024, rem))
                    if not data: break
                    rem -= len(data)
                    yield data
        return Response(gen(), status=206, headers={'Content-Type':'video/mp4','Content-Length':str(length),'Content-Range':f'bytes {start}-{end}/{fsize}','Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Range','Access-Control-Expose-Headers':'Content-Range, Accept-Ranges, Content-Length'}, direct_passthrough=True)
    else:
        def gen():
            with open(path, 'rb') as f:
                while True:
                    data = f.read(1024*1024)
                    if not data: break
                    yield data
        return Response(gen(), status=200, headers={'Content-Type':'video/mp4','Content-Length':str(fsize),'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Range','Access-Control-Expose-Headers':'Content-Range, Accept-Ranges, Content-Length'}, direct_passthrough=True)

def stream_from_drive(did):
    token = get_token()
    url = f"https://www.googleapis.com/drive/v3/files/{did}?alt=media&acknowledgeAbuse=true"
    headers = {'Authorization': f'Bearer {token}'}
    rng = request.headers.get('Range')
    if rng:
        headers['Range'] = rng
    r = http_requests.get(url, headers=headers, stream=True, timeout=(10, 600))
    if r.status_code >= 400:
        body = r.text[:500]
        print(f"[PROXY] Drive {r.status_code} for {did[:10]}: {body}")
        if r.status_code == 401:
            with _lock:
                global _creds
                _creds = None
        return Response(json.dumps({'error':f'drive_{r.status_code}','detail':body}), status=r.status_code, content_type='application/json')
    KEEP = {'content-type','content-length','content-range','accept-ranges'}
    out = {}
    for k, v in r.headers.items():
        if k.lower() in KEEP: out[k] = v
    out['Accept-Ranges'] = 'bytes'
    out['Access-Control-Allow-Origin'] = '*'
    out['Access-Control-Allow-Headers'] = 'Range'
    out['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Length'
    return Response(r.iter_content(chunk_size=1024*1024), status=r.status_code, headers=out, direct_passthrough=True)

@app.route('/stream/<did>')
def stream_video(did):
    if os.path.exists(cache_path(did)):
        return serve_from_cache(did)
        
    if did not in _downloading:
        threading.Thread(target=background_cache, args=(did,), daemon=True).start()
        
    try:
        return stream_from_drive(did)
    except Exception as e:
        return Response(json.dumps({'error':'stream_failed','detail':str(e)}), status=502, content_type='application/json')

@app.route('/stream/<did>', methods=['DELETE'])
def stream_delete(did):
    try: os.remove(cache_path(did))
    except OSError: pass
    return Response(json.dumps({'status':'ok'}), content_type='application/json')

@app.route('/stream/<did>', methods=['OPTIONS'])
def stream_options(did):
    return Response(status=204, headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, DELETE, OPTIONS','Access-Control-Allow-Headers':'Range','Access-Control-Expose-Headers':'Content-Range, Accept-Ranges, Content-Length','Access-Control-Max-Age':'86400'})

@app.route('/health')
def health():
    try:
        token = get_token()
        email = _creds.service_account_email if _creds else '?'
        return Response(json.dumps({'status':'ok','sa':email}), content_type='application/json')
    except Exception as e:
        return Response(json.dumps({'status':'error','detail':str(e)}), status=500, content_type='application/json')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3010)
