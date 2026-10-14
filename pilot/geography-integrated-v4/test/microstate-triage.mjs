import fs from "node:fs";
import assert from "node:assert/strict";
import {atlasIndex} from "../referee/scorer.mjs";
import {triageMicrostate,MICROSTATE_ISOS,MICROSTATE_REVIEW_CEILING_KM_DRAFT} from "../referee/microstate-triage.mjs";
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const atlas=atlasIndex(load("pilot/location/data/world-10m.json"),load("pilot/location/data/world.json"),load("pilot/location/data/targets.json"));
assert.deepEqual(MICROSTATE_ISOS,["MC","VA","SM"]);
const trials=[
 {iso:"MC",test:{lon:6.209,lat:43.383},expected:"provisional-outside",near:{lon:7.05,lat:43.60}},
 {iso:"VA",test:{lon:14.462,lat:41.601},expected:"provisional-outside",near:{lon:12.8,lat:41.95}},
 {iso:"SM",test:{lon:16.089,lat:40.517},expected:"provisional-outside",near:{lon:12.1,lat:44.15}},
];
for(const t of trials){
 const measured=triageMicrostate({iso:t.iso,point:t.test,atlas});
 assert.equal(measured.result,t.expected,JSON.stringify(measured));
 assert.equal(measured.points,0);
 assert.equal(measured.thresholdsApproved,false);
 const near=triageMicrostate({iso:t.iso,point:t.near,atlas});
 assert.equal(near.result,"manual-review",t.iso+" "+JSON.stringify(near));
 assert.equal(near.points,null,"Borderline must not be scored automatically");
 assert.ok(near.nearBorderKm>20&&near.nearBorderKm<=MICROSTATE_REVIEW_CEILING_KM_DRAFT);
 const {feature,source}=atlas.find(t.iso);
 assert.equal(source,"microstate-detailed");
 const [lon,lat]=feature.polys[0][0][0];
 const inside=triageMicrostate({iso:t.iso,point:{lon,lat},atlas});
 assert.equal(inside.result,"provisional-near",JSON.stringify(inside));
 assert.equal(inside.points,1);
}
assert.equal(triageMicrostate({iso:"MC",point:null,atlas}).points,null);
assert.equal(triageMicrostate({iso:"ZZ",point:{lon:0,lat:0},atlas}).result,"needs-review");
console.log("PASS microstate trial triage MC VA SM: inside/<=20 provisional, (20,60] human review without points, >60 provisional outside; original player pins not silently scored or regraded.");
