/**
 * World Capitals Game — experimental 195-country geography referee.
 * ISOLATED from scored V3/V4 sessions and the official 390/390.
 *
 * Edges: Natural Earth 1:10m geometry, with detailed official-pilot supplements
 * for VA/MC/SM. Distances are geodesic cross-track, not map-pixel measurements.
 * The microstate 20 km and normal-country 60 km values are design proposals,
 * NOT user-approved official thresholds.
 */
export const REFEREE_DRAFT_VERSION="195-geometry-fairness-proposal-1";
export const NEAR_BORDER_KM_DRAFT=60;
export const COMPACT_MICROSTATE_KM_DRAFT=20;
export const MICROSTATES_WITH_DETAILED_OUTLINES=["VA","MC","SM"];
const MICRO=new Set(MICROSTATES_WITH_DETAILED_OUTLINES);
const R=6371.0088,rad=Math.PI/180;
const toRad=x=>x*rad, clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const wrap=x=>((x+180)%360+360)%360-180;
function angDist(a,b){
 const φ1=toRad(a.lat),φ2=toRad(b.lat),dφ=φ2-φ1,dλ=toRad(wrap(b.lon-a.lon));
 const h=Math.sin(dφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
 return 2*Math.atan2(Math.sqrt(clamp(h,0,1)),Math.sqrt(clamp(1-h,0,1)));
}
export function distanceKm(a,b){return R*angDist(a,b)}
function bearing(a,b){
 const φ1=toRad(a.lat),φ2=toRad(b.lat),dλ=toRad(wrap(b.lon-a.lon));
 return Math.atan2(Math.sin(dλ)*Math.cos(φ2),Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(dλ));
}
function segmentDistanceKm(p,a,b){
 const d12=angDist(a,b);
 if(d12<1e-13)return distanceKm(p,a);
 const d13=angDist(a,p),θ12=bearing(a,b),θ13=bearing(a,p);
 const sinCross=clamp(Math.sin(d13)*Math.sin(θ13-θ12),-1,1);
 const cross=Math.asin(sinCross);
 const along=Math.atan2(Math.sin(d13)*Math.cos(θ13-θ12),Math.cos(d13));
 if(along<0)return distanceKm(p,a);
 if(along>d12)return distanceKm(p,b);
 return Math.abs(cross)*R;
}
// Unwrap polygon rings to minimize dateline-crossing discontinuities.
const ringCache=new WeakMap();
function prepare(ring){
 let z=ringCache.get(ring);if(z)return z;
 const pts=[];let prev=null,minLon=Infinity,maxLon=-Infinity,minLat=Infinity,maxLat=-Infinity;
 for(const [rawLon,lat] of ring){
  let lon=rawLon;
  if(prev!==null){while(lon-prev>180)lon-=360;while(lon-prev< -180)lon+=360}
  prev=lon;pts.push([lon,lat]);minLon=Math.min(minLon,lon);maxLon=Math.max(maxLon,lon);minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat);
 }
 z={pts,minLon,maxLon,minLat,maxLat};ringCache.set(ring,z);return z;
}
function insideRing(point,ring){
 const z=prepare(ring);
 if(point.lat<z.minLat||point.lat>z.maxLat)return false;
 for(let shift=-1;shift<=1;shift++){
  const testLon=point.lon+360*shift;if(testLon<z.minLon||testLon>z.maxLon)continue;
  let inside=false;
  for(let i=0,j=z.pts.length-1;i<z.pts.length;j=i++){
   const a=z.pts[i],b=z.pts[j];
   if((a[1]>point.lat)!==(b[1]>point.lat)){
    const intersect=a[0]+(b[0]-a[0])*(point.lat-a[1])/(b[1]-a[1]);
    if(testLon<intersect)inside=!inside;
   }
  }
  if(inside)return true;
 }
 return false;
}
export function insideGeometry(point,feature){
 return !!feature&&feature.polys.some(poly=>{
  if(!poly.length||!insideRing(point,poly[0]))return false;
  for(let i=1;i<poly.length;i++)if(insideRing(point,poly[i]))return false;
  return true;
 });
}
export function nearestBorderKm(point,feature,stopAtKm=-1){
 if(!feature)return Infinity;
 let distance=Infinity;
 for(const poly of feature.polys)for(const ring of poly){
  for(let i=0;i<ring.length;i++){
   const [lon,lat]=ring[i],next=ring[(i+1)%ring.length];
   const d=segmentDistanceKm(point,{lon,lat},{lon:next[0],lat:next[1]});
   if(d<distance)distance=d;
   if(stopAtKm>=0&&distance<=stopAtKm)return distance;
  }
 }
 return distance;
}
export function atlasIndex(hi,lo,supplement){
 const high=new Map(hi.features.map(f=>[f.id,f])),low=new Map(lo.features.map(f=>[f.id,f])),detail=new Map(supplement.features.map(f=>[f.id,f]));
 return {
  highCount:high.size,lowCount:low.size,detailCount:detail.size,
  find(iso){
   // Some 10m reduced-resolution outlines are much too large for tiny
   // Vatican/Monaco/San Marino; use more detailed purpose-made features.
   if(MICRO.has(iso)&&detail.has(iso))return {feature:detail.get(iso),source:"microstate-detailed"};
   if(high.has(iso))return {feature:high.get(iso),source:"high-resolution-10m"};
   if(detail.has(iso))return {feature:detail.get(iso),source:"detail-supplement"};
   if(low.has(iso))return {feature:low.get(iso),source:"world-fallback"};
   return {feature:null,source:"missing"};
  }
 };
}
export function referee({iso,point,areaChoice,mode,acceptedArea,atlas}){
 if(mode==="broad_area"){
  if(typeof areaChoice!=="string")return {result:"unanswered",points:null,source:"region",reason:"Broad area not provided"};
  const correct=areaChoice===acceptedArea;
  return {result:correct?"correct-area":"wrong-area",points:correct?1:0,source:"region",reason:correct?"Correct broad area":"Other broad area"};
 }
 if(mode!=="country_pin")return {result:"needs-review",points:null,reason:"Unrecognized assessment mode"};
 if(!point||!Number.isFinite(point.lon)||!Number.isFinite(point.lat)||Math.abs(point.lon)>180||Math.abs(point.lat)>90)
  return {result:"unanswered",points:null,reason:"No valid map pin"};
 const {feature,source}=atlas.find(iso);
 if(!feature)return {result:"needs-review",points:null,source,reason:"No authoritative outline"};
 const allowedKm=MICRO.has(iso)?COMPACT_MICROSTATE_KM_DRAFT:NEAR_BORDER_KM_DRAFT;
 if(insideGeometry(point,feature))return {result:"inside",points:1,source,nearBorderKm:0,allowedKm};
 const d=nearestBorderKm(point,feature);
 const rounded=Math.round(d*10)/10;
 const positive=d<=allowedKm;
 return{result:positive?"near-border":"outside",points:positive?1:0,source,nearBorderKm:rounded,allowedKm};
}
