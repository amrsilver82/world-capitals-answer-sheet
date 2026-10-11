#!/usr/bin/env python3
"""Build a local Natural Earth 10m country outline JSON for the WCG preview.

Source: nvkelso Natural Earth 10m via pinned mtraynham/natural-earth-topo
topology, checked for content and converted to WCG's existing polygon API.
Always retain the smaller existing map separately as the fallback.
"""
import json
import pathlib
import urllib.request
import collections
import hashlib

PIN = "39ef51425d20705c85b7e1b52edd5a84624ae371"
URL = f"https://raw.githubusercontent.com/mtraynham/natural-earth-topo/{PIN}/topojson/ne_10m_admin_0_countries.json"
OUT = pathlib.Path("pilot/location/data/world-10m.json")
REQ = urllib.request.Request(URL,headers={"User-Agent":"World-Capitals-Game-Map-Build/1.0"})
with urllib.request.urlopen(REQ,timeout=80) as resp:
    raw=resp.read()
assert len(raw)>2_000_000, "Unexpected 10m data length"
doc=json.loads(raw)
assert doc["type"]=="Topology"
obj=doc["objects"]["ne_10m_admin_0_countries"]
geoms=obj["geometries"]
tr=doc["transform"]
sx,sy=tr["scale"]
tx,ty=tr["translate"]
arcs=doc["arcs"]
cache={}
def arc(index):
    reverse=index<0
    i=(~index if reverse else index)
    if i not in cache:
        x=y=0;result=[]
        for dx,dy in arcs[i]:
            x+=dx;y+=dy
            result.append((round(x*sx+tx,4),round(y*sy+ty,4)))
        cache[i]=result
    return list(reversed(cache[i])) if reverse else cache[i]

def chain(ids):
    points=[]
    for i,index in enumerate(ids):
        part=arc(index)
        if i:part=part[1:]
        points.extend(part)
    return points

features=[]
counts=collections.Counter()
for g in geoms:
    prop=g.get("properties") or {}
    country=str(prop.get("iso_a2") or "").upper()
    if len(country)!=2 or not country.isalpha():continue
    if g["type"]=="Polygon":
        groups=[g["arcs"]]
    elif g["type"]=="MultiPolygon":
        groups=g["arcs"]
    else:continue
    polygons=[]
    for rings in groups:
        poly=[]
        for ring_ids in rings:
            coords=chain(ring_ids)
            if len(coords)>=4:poly.append(coords)
        if poly:polygons.append(poly)
    if not polygons:continue
    features.append({"id":country,"polys":polygons})
    counts[country]+=1

assert len(features)>=210,len(features)
assert counts["DE"]==1 and counts["FR"]==1 and counts["JP"]==1
original=json.loads(pathlib.Path("pilot/location/data/world.json").read_text())
existing=original["features"]
hiCodes={f["id"] for f in features}
remaining=[f for f in existing if f["id"] not in hiCodes]
# Keep 110m countries that 10m lacks, but not the entire 110m dataset twice.
features.extend(remaining)
assert len({f["id"] for f in features})==len(features),"Repeated country ID"
testCountry=next(f for f in features if f["id"]=="DE")
oldCountry=next(f for f in existing if f["id"]=="DE")
newPts=sum(len(r) for p in testCountry["polys"] for r in p)
oldPts=sum(len(r) for p in oldCountry["polys"] for r in p)
assert newPts>=oldPts*3, (newPts,oldPts)
data={"scale":"Natural Earth 1:10m","source":"mtraynham/natural-earth-topo pinned "+PIN,"sha256":hashlib.sha256(raw).hexdigest(),"fallback_110m_countries":len(remaining),"features":features}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(data,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf-8")
print(f"Built {OUT}: {OUT.stat().st_size:,} bytes, {len(features)} features, Germany vertices {oldPts} -> {newPts}, 110m fallbacks {len(remaining)}")
