#!/usr/bin/env python3
"""Unscored 195-country geographic referee dry run; never grade real players."""
import json,re,math
from pathlib import Path
from collections import Counter
from shapely.geometry import Polygon,MultiPolygon,Point
from shapely.ops import nearest_points
from pyproj import Geod

ROOT=Path(__file__).resolve().parents[2]
APP=(ROOT/"pilot/approx-location-area/app.js").read_text()
MAP=json.loads((ROOT/"pilot/location/data/world-10m.json").read_text())
def js_array(name):
    return json.loads(re.search(r"const "+name+r"=(\[[^;]+\]);",APP).group(1))
OFFICIAL=js_array("OFFICIAL_195_CODES")
MARKERS=js_array("MARKERS")
assert len(OFFICIAL)==len(set(OFFICIAL))==195
G=Geod(ellps="WGS84")
TIERS={"micro":650,"small":450,"medium":250,"large":120}
def norm(x):return ((x+180)%360)-180
def distance(a,b):return G.inv(norm(a[0]),a[1],norm(b[0]),b[1])[2]/1000
def ring(points):
    seq=[];prev=None
    for x,y in points:
        if prev is not None:
            while x-prev>180:x-=360
            while x-prev< -180:x+=360
        seq.append((x,y));prev=x
    return seq
def geometry(data):
    parts=[]
    for p in data["polys"]:
        if not p:continue
        rings=[ring(q) for q in p if len(q)>=4]
        if not rings:continue
        try:
            geom=Polygon(rings[0],rings[1:])
            if not geom.is_empty and geom.area>0:parts.append(geom)
        except Exception:pass
    if not parts:return None
    return MultiPolygon(parts) if len(parts)>1 else parts[0]
def area_km2(geom):
    shapes=geom.geoms if isinstance(geom,MultiPolygon) else [geom]
    area=0.
    for p in shapes:
        try:
            outer=abs(G.polygon_area_perimeter(*p.exterior.coords.xy)[0])
            holes=sum(abs(G.polygon_area_perimeter(*h.coords.xy)[0]) for h in p.interiors)
            area+=max(0,outer-holes)
        except Exception:pass
    return area/1e6
def tier(km2):
    if km2<500:return "micro"
    if km2<20000:return "small"
    if km2<200000:return "medium"
    return "large"

SOURCE={f["id"]:f for f in MAP["features"]}
ANCHORS={}
for code,lat,lon in MARKERS:ANCHORS.setdefault(code,[]).append((lon,lat))
REGISTRY={}
for code in OFFICIAL:
    geom=geometry(SOURCE[code]) if code in SOURCE else None
    anchors=ANCHORS.get(code,[])
    if geom is None and not anchors:raise ValueError("No geography for "+code)
    area=area_km2(geom) if geom is not None else 0.
    pieces=geom.geoms if isinstance(geom,MultiPolygon) else ([geom] if geom is not None else [])
    p=max(pieces,key=lambda x:x.area).representative_point() if pieces else None
    focus=(norm(p.x),p.y) if p is not None else anchors[0]
    REGISTRY[code]={"poly":geom,"area":area,"tier":tier(area),"focus":focus,"anchors":anchors}
def to_country(code,p):
    spec=REGISTRY[code];shape=spec["poly"]
    if shape is not None:
        for shift in [-360,0,360]:
            pt=Point(p[0]+shift,p[1])
            if shape.covers(pt):return 0.,True
    candidates=[]
    if shape is not None:
        for shift in [-360,0,360]:
            pt=Point(p[0]+shift,p[1])
            point=nearest_points(pt,shape)[1]
            candidates.append(distance(p,(point.x,point.y)))
    candidates.extend(distance(p,a) for a in spec["anchors"])
    return (min(candidates) if candidates else float("inf")),False
def judge(target,p):
    if not(-180<=p[0]<=180 and -90<=p[1]<=90):return ("INVALID",None)
    spec=REGISTRY[target]
    dist,inside=to_country(target,p)
    if inside:return ("DIRECT",0.)
    if dist>TIERS[spec["tier"]]:return ("WRONG",round(dist,1))
    # A nearby wrong sovereign territory is not silently credited.
    for other,item in REGISTRY.items():
        if other==target:continue
        shape=item["poly"]
        if shape is None:continue
        a,b,c,d=shape.bounds
        if b-1.5>p[1] or d+1.5<p[1]:continue
        if all(p[0]+shift<a-2 or p[0]+shift>c+2 for shift in [-360,0,360]):continue
        if any(shape.covers(Point(p[0]+shift,p[1])) for shift in [-360,0,360]):
            return ("CONTESTED",round(dist,1))
    return ("NEAR",round(dist,1))

COUNTER=Counter();TIERC=Counter();REPORT=[];failures=[]
for code,item in REGISTRY.items():
    p=item["focus"]
    correct=judge(code,p)[0]
    antipode=judge(code,(norm(p[0]+180),-p[1]))[0]
    if item["poly"] is not None and correct!="DIRECT":failures.append((code,"own land",correct))
    if item["poly"] is None and correct not in ("NEAR","CONTESTED"):failures.append((code,"own anchor",correct))
    if antipode!="WRONG":failures.append((code,"antipodal",antipode))
    lon,lat,_=G.fwd(p[0],p[1],90,300000)
    east=judge(code,(norm(lon),lat))[0]
    COUNTER[east]+=1;TIERC[item["tier"]]+=1
    REPORT.append({"iso":code,"land_area_km2":round(item["area"],1),
                   "tier":item["tier"],"tolerance_km":TIERS[item["tier"]],
                   "source":"polygon" if item["poly"] is not None else "anchor",
                   "reference":correct,"antipode":antipode,"east_300km":east})
assert not failures,failures[:12]
samples={"DE":(10.5,51),"TD":(19,16),"JP":(138,36),"NR":(166.93,-.52),
 "KI":(172.98,1.45),"TV":(179.2,-8.52),"MC":(7.425,43.738),
 "GD":(-61.68,12.12),"FJ":(178.06,-17.71),"FM":(158.18,6.92)}
stress={k:{"point":v,"result":judge(k,v)} for k,v in samples.items()}
output={"status":"SIMULATION_ONLY","official_universe":195,
 "source":MAP["source"],"map_scale":MAP["scale"],"candidate_tolerances_km":TIERS,
 "tiers":dict(TIERC),"east_300km":dict(COUNTER),"stress":stress,
 "warning":"NEAR is only a tentative category. CONTESTED needs human referee. No official scoring.",
 "countries":REPORT}
out=ROOT/"pilot/location-referee/dryrun-latest.json"
out.write_text(json.dumps(output,indent=2)+"\n")
print("REFEREE_PASS_195 "+json.dumps({k:v for k,v in output.items() if k!="countries"},separators=(",",":"))[:6500])
print("OFFICIAL_GAME_STATE_UNCHANGED")
