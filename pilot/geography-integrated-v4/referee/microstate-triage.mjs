/**
 * Experimental microstate FAIRNESS TRIAGE ONLY.
 *
 * This is not an official scoring rubric and does not change any V3/V4
 * historical grades or authorize a new championship.
 *
 * For Monaco, Vatican City, San Marino:
 * - inside / <=20km: candidate near-country placement (provisionally 1)
 * - (20,60]km: BORDERLINE, defer to human/user referee (points=null)
 * - >60km: candidate outside (provisionally 0), NOT an official ruling
 *
 * Both 20km and 60km are UNAPPROVED trial values. These windows are a
 * confidence triage, never permission to credit a distant location.
 * Underlying geometry uses actual detailed country outlines.
 */
import {referee} from "./scorer.mjs";

export const MICROSTATE_REVIEW_VERSION="microstate-triage-draft-1";
export const MICROSTATE_AUTO_CREDIT_KM_DRAFT=20;
export const MICROSTATE_REVIEW_CEILING_KM_DRAFT=60;
export const MICROSTATE_ISOS=Object.freeze(["MC","VA","SM"]);
const MICRO=new Set(MICROSTATE_ISOS);

export function triageMicrostate({iso,point,atlas}){
 if(!MICRO.has(iso))return {result:"needs-review",points:null,
  label:"not-microstate",reason:"Special microstate triage only applies to MC, VA and SM",
  thresholdsApproved:false};
 const score=referee({iso,point,atlas,mode:"country_pin"});
 const common={
  source:score.source||"unavailable",nearBorderKm:score.nearBorderKm??null,
  draftCreditKm:MICROSTATE_AUTO_CREDIT_KM_DRAFT,
  draftReviewCeilingKm:MICROSTATE_REVIEW_CEILING_KM_DRAFT,
  thresholdsApproved:false,iso
 };
 if(score.result==="unanswered"||score.result==="needs-review")
  return {...common,result:score.result,points:null,label:"missing-or-unavailable",reason:score.reason};
 if(score.result==="inside"||score.result==="near-border")
  return {...common,result:"provisional-near",points:1,label:"draft-near",
   reason:score.result==="inside"?"Point lies inside detailed national geometry":
   "Point falls within draft 20 km near-border allowance"};
 if(typeof score.nearBorderKm==="number"&&score.nearBorderKm>MICROSTATE_AUTO_CREDIT_KM_DRAFT&&
    score.nearBorderKm<=MICROSTATE_REVIEW_CEILING_KM_DRAFT)
  return {...common,result:"manual-review",points:null,label:"borderline",reason:"Between draft 20 km and 60 km: require user referee decision; never auto-award or auto-fail"};
 return {...common,result:"provisional-outside",points:0,label:"draft-outside",
  reason:"More than 60 km from detailed microstate geometry; not within provisional review band"};
}
