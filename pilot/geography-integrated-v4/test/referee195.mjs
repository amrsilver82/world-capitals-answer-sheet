import fs from "node:fs";
import assert from "node:assert/strict";
import {REFEREE_DRAFT_VERSION,atlasIndex,referee,nearestBorderKm,insideGeometry,distanceKm} from "../referee/scorer.mjs";
const read=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const high=read("pilot/location/data/world-10m.json");
const low=read("pilot/location/data/world.json");
const detail=read("pilot/location/data/targets.json");
const countries=read("pilot/geography-integrated-v4/data/candidate195.json");
const atlas=atlasIndex(high,low,detail);
assert.equal(countries.length,195);
assert.equal(new Set(countries.map(x=>x.iso)).size,195);
assert.equal(countries.filter(c=>c.mode==="country_pin").length,177);
assert.equal(countries.filter(c=>c.mode==="broad_area").length,18);
let covered=0,edgeAccepted=0;
for(const c of countries){
 const {feature}=atlas.find(c.iso);
 assert.ok(feature,"missing geographic shape for "+c.name+" "+c.iso);
 covered++;
 const ring=feature.polys.find(poly=>Array.isArray(poly[0])&&poly[0].length>0)[0];
 const [lon,lat]=ring[0];
 const score=referee({iso:c.iso,point:{lon,lat},mode:"country_pin",atlas});
 assert.equal(score.points,1,"Actual country border vertex must be accepted: "+c.name+" "+JSON.stringify(score));
 edgeAccepted++;
}
assert.equal(covered,195);
assert.equal(edgeAccepted,195);
const m=new Map(countries.map(x=>[x.iso,x]));
const point=(iso,p)=>referee({iso,point:p,mode:"country_pin",atlas});
const cases=[
 ["VA","Rome center accepted",{lon:12.4964,lat:41.9028},1],
 ["VA","earlier player's 100km-offset Vatican pin remains outside",{lon:13.660,lat:41.925},0],
 ["MC","Nice vicinity (approx 15km) treated as near",{lon:7.27,lat:43.7},1],
 ["SM","Rimini vicinity near San Marino",{lon:12.57,lat:44.06},1],
 ["SM","user's southern Italy San Marino pin",{lon:16.332,lat:38.627},0],
 ["MT","user's Sicily Malta pin",{lon:14.337,lat:37.263},0],
 ["KE","user's South Sudan Kenya pin",{lon:31.719,lat:5.739},0],
 ["TH","user's Andaman Thailand pin",{lon:92.717,lat:11.709},0],
 ["DE","Germany reference interior",{lon:10.5,lat:51.1},1],
 ["JP","Japan Honshu interior",{lon:139.7,lat:37.7},1],
 ["FJ","Fiji central Viti Levu",{lon:178.0,lat:-17.8},1],
 ["AU","Sydney Australia",{lon:151.2,lat:-33.9},1]
];
for(const [iso,desc,p,expected] of cases){
 const s=point(iso,p);
 assert.equal(s.points,expected,desc+" => "+JSON.stringify(s));
}
const area=(iso,choice)=>referee({iso,areaChoice:choice,mode:"broad_area",acceptedArea:m.get(iso).area,atlas});
assert.equal(area("TV","PACIFIC_OCEAN").points,1);
assert.equal(area("TV","INDIAN_OCEAN").points,0);
assert.equal(area("GD","CARIBBEAN").points,1);
assert.equal(area("NR","PACIFIC_OCEAN").points,1);
assert.equal(point("VA",null).points,null);
assert.equal(referee({iso:"ZZ",point:{lon:0,lat:0},mode:"country_pin",atlas}).result,"needs-review");
const dateline=point("FJ",{lon:-179.5,lat:-17.8});assert.ok(dateline.result!=="needs-review");
assert.ok(distanceKm({lon:179.9,lat:0},{lon:-179.9,lat:0})<30);
const proof={schema_version:1,referee_version:REFEREE_DRAFT_VERSION,atlas_coverage:covered,country_border_sanity_cases:edgeAccepted,known_user_and_region_cases:cases.length+4,
candidate_pin:177,candidate_broad:18,proposed_radius_microstate_km:20,proposed_radius_other_km:60,
unapproved:"YES: candidate tolerance and classification require user review before official scoring",
sample_results:cases.map(([iso,desc,p])=>({iso,desc,score:point(iso,p)}))};
console.log("REFEREE195_PROOF_BEGIN");
console.log(JSON.stringify(proof));
console.log("REFEREE195_PROOF_END");
console.log("PASS experimental 195-country geography referee: detailed microstates, geodesic border distances, islands/dateline, 195 border anchors, user examples, no official score changes.");
