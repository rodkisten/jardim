"""Read-only production smoke: never plant or delete real memories."""
import http.cookiejar
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

origin = os.environ.get('TEST_ORIGIN', 'https://jardim.migos.club').rstrip('/')
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def call(path, data=None, headers=None):
    request = urllib.request.Request(
        origin + path,
        data=data,
        headers={'User-Agent': 'JardimSmoke/0.2', **(headers or {})},
    )
    try:
        response = client.open(request, timeout=25)
        return response.status, response.read(), response.headers
    except urllib.error.HTTPError as error:
        return error.code, error.read(), error.headers


assert call('/v2/sync/pull')[0] == 401
password = Path('.production-test-password').read_text().strip()
assert call(
    '/auth/login',
    urllib.parse.urlencode({'password': password}).encode(),
    {'Origin': origin, 'Content-Type': 'application/x-www-form-urlencoded'},
)[0] == 200
assert any(cookie.name == '__Host-jardim' and cookie.secure for cookie in jar)
code, shell, headers = call('/')
assert code == 200 and headers.get('X-Jardim-Shell') == '1'
assert b'type="module"' in shell
for path in ['/theme.js', '/theme.css', '/sw.js', '/v2/sync/pull', '/v2/capsules', '/v2/integrations']:
    code, body, _ = call(path)
    assert code == 200, (path, code)
    if path.startswith('/v2/'):
        json.loads(body)
assert call('/v2/sync/mutate', b'{}', {'Origin': 'https://evil.example'})[0] == 403
assert call('/auth/logout', b'', {'Origin': origin})[0] == 200
assert call('/v2/sync/pull')[0] == 401
print('PASS: private API, login, secure cookie, shell, themes, offline script, v2 reads, CSRF and logout; no memory writes')
