import re

with open('/etc/nginx/sites-enabled/kongflix', 'r') as f:
    cfg = f.read()

new_block = """location /stream/ {
    proxy_pass http://127.0.0.1:3010;
    proxy_buffering off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_cache off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}"""

cfg = re.sub(r'location /stream/ \{.*?\}', new_block, cfg, flags=re.DOTALL)

with open('/etc/nginx/sites-enabled/kongflix', 'w') as f:
    f.write(cfg)
