from flask import Flask, request, Response
import requests

app = Flask(__name__)

GOOGLE_API_KEY = "AIzaSyAYHAuZb_neKRSlejQ5qd9RRY3C4FgxAE0"

@app.route('/stream/<drive_id>')
def stream_video(drive_id):
    drive_url = (
        f"https://www.googleapis.com/drive/v3/files/{drive_id}"
        f"?alt=media&key={GOOGLE_API_KEY}&acknowledgeAbuse=true"
    )

    # Reenviar Range del navegador a Google Drive
    headers = {}
    range_header = request.headers.get('Range')
    if range_header:
        headers['Range'] = range_header

    # Petición streaming a Drive
    req = requests.get(drive_url, headers=headers, stream=True)

    # ── Headers que SÍ necesitamos pasar ──
    # content-length  → el navegador necesita saber el tamaño total
    # content-range   → respuesta 206 (parcial)
    # accept-ranges   → el navegador sabe que puede pedir rangos
    # content-type    → tipo MIME del video
    PASS_THROUGH = {
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
    }

    response_headers = {}
    for name, value in req.headers.items():
        if name.lower() in PASS_THROUGH:
            response_headers[name] = value

    # Siempre indicar que aceptamos rangos
    response_headers['Accept-Ranges'] = 'bytes'

    # CORS para el frontend
    response_headers['Access-Control-Allow-Origin'] = '*'
    response_headers['Access-Control-Allow-Headers'] = 'Range'
    response_headers['Access-Control-Expose-Headers'] = (
        'Content-Range, Accept-Ranges, Content-Length'
    )

    return Response(
        req.iter_content(chunk_size=1024 * 1024),
        status=req.status_code,
        headers=response_headers,
        direct_passthrough=True,
    )


@app.route('/stream/<drive_id>', methods=['OPTIONS'])
def stream_options(drive_id):
    """Preflight CORS para que el navegador pueda enviar Range."""
    return Response(status=204, headers={
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        'Access-Control-Max-Age': '86400',
    })


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3010)
