"""Merge licensed official municipal/water catalogs; optional local raw inputs for reproducibility.
Run after update-gpt6-cctv.py. Source imagery is fetched only by users selecting cameras.
"""
import json,re,html,sys,urllib.request,hashlib
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
sources=[('臺南市政府交通局','https://data.tainan.gov.tw/Resource/4cabeb5d-f234-4cdc-a724-0f5fac90b1de'),('經濟部水利署','https://opendata.wra.gov.tw/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0?format=JSON&sort=_importdate+asc')]
path=Path('public/data/gpt6-cctv.json');catalog=json.loads(path.read_text());added=[]
for index,(agency,url) in enumerate(sources):
    if len(sys.argv)>index+1:raw=Path(sys.argv[index+1]).read_text()
    else:
        with urllib.request.urlopen(url,timeout=30) as response:raw=response.read().decode('utf-8-sig')
    batch=[]
    if index==0:
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>',raw,re.S):
            cells=[html.unescape(re.sub('<[^>]+>','',s)).strip() for s in re.findall(r'<td[^>]*>(.*?)</td>',tr,re.S)]
            if len(cells)!=4:continue
            name,lng,lat,image=cells
            batch.append(dict(id='tn-'+hashlib.sha256(image.encode()).hexdigest()[:16],name=name,lat=lat,lng=lng,image=image,snapshot=False))
    else:
        for c in json.loads(raw):
            batch.append(dict(id='wra-'+c['cameraid'],name=c['countiesandcitieswherethemonitoringpointsarelocated']+' '+c['cameraname'],lat=c['latitude_4326'],lng=c['longitude_4326'],image=c['imageurl'],snapshot=True))
    valid=[]
    for c in batch:
        try:c['lat']=float(c['lat']);c['lng']=float(c['lng'])
        except (ValueError,TypeError):continue
        u=urlparse(c['image']);domain='.tainan.gov.tw' if index==0 else '.wra.gov.tw'
        if u.scheme!='https' or not (u.hostname or '').endswith(domain) or not (20<=c['lat']<=27 and 117<=c['lng']<=124):continue
        c.update(agency=agency,category='市區道路' if index==0 else '河川水情');valid.append(c)
    assert len(valid)>50,f'Incomplete {agency} response; original catalog preserved'
    added+=valid
    catalog['sources']=[s for s in catalog['sources'] if s['agency']!=agency]+[dict(agency=agency,url=url,updatedAt=datetime.now(timezone.utc).isoformat())]
    print(agency,len(valid))
catalog['cameras']=[c for c in catalog['cameras'] if c['agency'] not in [s[0] for s in sources]]+added
# Identical URLs are duplicates; distinct directions at the same location are retained.
unique={}
for c in catalog['cameras']:unique.setdefault(c['image'],c)
catalog['cameras']=list(unique.values())
path.write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
print('Total',len(unique))
