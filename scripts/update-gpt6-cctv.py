"""Refresh public camera positions; images are never downloaded by this script."""
import json, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse
sources=[('高速公路局','https://tisvcloud.freeway.gov.tw/history/motc20/CCTV.xml'),('公路局','https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml')]
rows=[];meta=[]
for agency,url in sources:
    with urllib.request.urlopen(url,timeout=40) as response: root=ET.fromstring(response.read())
    for el in root.iter():el.tag=el.tag.split('}')[-1]
    meta.append({'agency':agency,'url':url,'updatedAt':root.findtext('UpdateTime')})
    for el in root.findall('.//CCTV'):
        image=el.findtext('VideoImageURL') or el.findtext('VideoStreamURL') or ''
        host=urlparse(image).hostname or ''
        if not image.startswith('https://') or not (host.endswith('.thb.gov.tw') or host.endswith('.freeway.gov.tw')):continue
        try:lat=float(el.findtext('PositionLat'));lng=float(el.findtext('PositionLon'))
        except (TypeError,ValueError):continue
        if not (20<=lat<=27 and 118<=lng<=123):continue
        rows.append({'id':el.findtext('CCTVID'),'lat':lat,'lng':lng,'name':' '.join(filter(None,[el.findtext('RoadName'),el.findtext('LocationMile'),{'N':'北向','S':'南向','E':'東向','W':'西向'}.get(el.findtext('RoadDirection'),el.findtext('RoadDirection'))])),'image':image,'snapshot':bool(el.findtext('VideoImageURL')),'agency':agency})
assert len(rows)>1000,'Refusing to replace catalog with an incomplete response'
Path('public/data/gpt6-cctv.json').write_text(json.dumps({'sources':meta,'cameras':rows},ensure_ascii=False,separators=(',',':')))
print('Saved',len(rows),'official camera locations')
