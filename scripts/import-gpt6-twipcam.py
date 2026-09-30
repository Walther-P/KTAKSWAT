"""Import the entire documented public API without crawling individual pages."""
import json,sys,urllib.request,hashlib,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
url='https://www.twipcam.com/api/v1/cam-list.json'
if len(sys.argv)>1:raw=Path(sys.argv[1]).read_bytes()
else:
    with urllib.request.urlopen(url,timeout=45) as response:raw=response.read()
records=json.loads(raw);assert isinstance(records,list) and len(records)>10000,'Incomplete response; previous catalog preserved'
rows=[];other=[];ids=set()
for c in records:
    assert re.fullmatch(r'[a-zA-Z0-9_-]+',c['id']) and c['id'] not in ids
    ids.add(c['id']);u=urlparse(c['cam_url']);assert u.scheme=='https' and u.hostname and not u.username and not u.password
    youtube=u.hostname=='i.ytimg.com'
    snapshot=youtube or bool(re.search(r'\.(jpg|jpeg|png)(?:$|\?)|snapshot|/jpg\.php',c['cam_url'],re.I))
    row=dict(id=c['id'],lat=float(c['lat']),lng=float(c['lon']),name=c['name'],image=c['cam_url'],snapshot=snapshot,thumbnail=youtube,agency='台灣即時影像監視器 twipcam',source='https://www.twipcam.com/cam/'+c['id'])
    (rows if 20<=row['lat']<=27 and 117<=row['lng']<=124 else other).append(row)
assert len(rows)+len(other)==len(records)
meta=dict(agency='台灣即時影像監視器 twipcam',url=url,documentation='https://www.twipcam.com/api/document',updatedAt=datetime.now(timezone.utc).isoformat(),records=len(records),sha256=hashlib.sha256(raw).hexdigest())
Path('public/data/gpt6-cctv.json').write_text(json.dumps(dict(sources=[meta],cameras=rows,unlocated=other),ensure_ascii=False,separators=(',',':')))
print(json.dumps(dict(api=len(records),mapped=len(rows),unlocated=len(other)),ensure_ascii=False))
