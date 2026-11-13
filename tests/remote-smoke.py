import urllib.request, urllib.error, http.cookiejar, json, pathlib, uuid, datetime
origin='https://jardim.migos.club'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def call(path,data=None,headers=None):
    request=urllib.request.Request(origin+path,data=data,headers={'User-Agent':'JardimSmoke/0.1',**(headers or {})})
    try:
        r=client.open(request,timeout=25);return r.status,r.read(),r.headers
    except urllib.error.HTTPError as e:return e.code,e.read(),e.headers
assert call('/v1/memories')[0]==401
assert call('/auth/login',b'password=wrong',{'Origin':origin,'Content-Type':'application/x-www-form-urlencoded'})[0]==401
password=pathlib.Path('.production-test-password').read_text().strip()
assert call('/auth/login',('password='+password).encode(),{'Origin':origin,'Content-Type':'application/x-www-form-urlencoded'})[0]==200
assert any(c.name=='__Host-jardim' and c.secure for c in jar)
assert b'type="module"' in call('/')[1]
assert call('/v1/sync/push',b'{}',{'Origin':'https://evil.example'})[0]==403
assert call('/v1/sync/push',b'{}',{'Origin':origin})[0]==400
memory={'id':str(uuid.uuid4()),'title':'[SMOKE] Jardim','body':'Registro temporário de validação da implantação.','tags':['smoke-test'],'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')}
op={'operationId':str(uuid.uuid4()),'memory':memory};payload=json.dumps({'operations':[op]}).encode()
for _ in range(2):
    code,body,_=call('/v1/sync/push',payload,{'Origin':origin,'Content-Type':'application/json'});assert code==200,(code,body);assert json.loads(body)['acknowledged']==[op['operationId']]
code,body,_=call('/v1/memories');data=json.loads(body);assert code==200;assert sum(m['id']==memory['id'] for m in data['memories'])==1
assert call('/v1/memories?cursor=-1')[0]==400
assert call('/auth/logout',b'',{'Origin':origin})[0]==200
assert call('/v1/memories')[0]==401
pathlib.Path('/tmp/jardim-smoke-id').write_text(memory['id'])
print('PASS: unauthenticated API, wrong password, login + secure cookie, protected SPA, CSRF, invalid batch, idempotent retry, D1 read, invalid cursor, logout')
