import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const env=async p=>Object.fromEntries((await readFile(resolve(root,p),'utf8')).split(/\r?\n/)
  .map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')&&x.includes('='))
  .map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
const client=await env('artifacts/d8advisr/.env.staging.local'), ids=await env('.env.staging.test.local');
const url=client.VITE_SUPABASE_URL,key=client.VITE_SUPABASE_ANON_KEY;
if(!url.includes('bntxnjfftikmaqnbskkq'))throw Error('Partner revision tests refuse non-staging projects');
const assert=(v,m)=>{if(!v)throw Error(m)};
async function req(path,token=key,method='GET',body,prefer='return=representation'){
 const r=await fetch(url+path,{method,headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();let b=t;try{b=t?JSON.parse(t):null}catch{}return{r,b};
}
async function auth(email,password){const x=await req('/auth/v1/token?grant_type=password',key,'POST',{email,password});assert(x.r.ok,'auth failed');return{token:x.b.access_token,id:x.b.user.id}}
const [consumer,partner,admin]=await Promise.all([
 auth(ids.STAGING_CONSUMER_EMAIL,ids.STAGING_CONSUMER_PASSWORD),
 auth(ids.STAGING_PARTNER_EMAIL,ids.STAGING_PARTNER_PASSWORD),
 auth(ids.STAGING_ADMIN_EMAIL,ids.STAGING_ADMIN_PASSWORD),
]);
const owned=await req(`/rest/v1/venues?select=id,name,category,address,area,description,price_tier,avg_cost_pp,vibes,contact_phone,website_url,open_hours,cover_image,images,updated_at,listing_status&partner_id=eq.${partner.id}&order=created_at.desc&limit=1`,partner.token);
assert(owned.r.ok&&owned.b?.[0]?.listing_status==='live',`Staging partner needs one live owned venue: ${owned.r.status} ${JSON.stringify(owned.b)}`);
const venueId=owned.b[0].id;
const before=owned.b[0];
let temporaryApproved=false;
try{
 const marker=`partner-revision-${Date.now()}`;
 const rejectedSubmit=await req('/rest/v1/rpc/partner_submit_live_venue_revision',partner.token,'POST',{
  p_venue_id:venueId,p_expected_updated_at:before.updated_at,p_payload:{
   name:`Rejected ${marker}`,category:before.category,address:before.address,area:before.area,
   description:before.description,open_hours:before.open_hours,
   cover_image:before.cover_image,images:before.images,
  }});
 assert(rejectedSubmit.r.ok&&rejectedSubmit.b?.revision_id,'rejection proposal failed');
 const rejected=await req('/rest/v1/rpc/admin_review_partner_live_venue_revision',admin.token,'POST',{
  p_revision_id:rejectedSubmit.b.revision_id,p_decision:'rejected',p_note:'Phase 4.5 rejection smoke',
 });
 assert(rejected.r.ok&&rejected.b.status==='rejected',`admin rejection failed ${rejected.r.status} ${JSON.stringify(rejected.b)}`);
 const afterReject=(await req(`/rest/v1/venues?select=name&id=eq.${venueId}`,consumer.token)).b[0];
 assert(afterReject.name===before.name,'rejected partner change became public');
 const rejectionAudit=await req(`/rest/v1/venue_change_log?select=field_name,reverification_reason&venue_id=eq.${venueId}&field_name=eq.partner_live_revision_status&order=created_at.desc&limit=1`,admin.token);
 assert(rejectionAudit.r.ok&&rejectionAudit.b?.[0]?.reverification_reason==='Phase 4.5 rejection smoke','partner rejection was not audited');
 console.log('PASS rejected partner revision remains private and is audited');
 const invalidWebsite=await req('/rest/v1/rpc/partner_submit_live_venue_revision',partner.token,'POST',{
  p_venue_id:venueId,p_expected_updated_at:before.updated_at,p_payload:{
   website_url:'javascript:alert(1)',
  }});
 assert([400,422].includes(invalidWebsite.r.status),'unsafe partner website URL was accepted');
 console.log('PASS unsafe venue website URLs are rejected at the database boundary');
 const submit=await req('/rest/v1/rpc/partner_submit_live_venue_revision',partner.token,'POST',{
  p_venue_id:venueId,p_expected_updated_at:before.updated_at,p_payload:{
   name:`Pending ${marker}`,category:'Bar & Lounge',address:'Pending address',area:'Longacres',
   price_tier:'$$$',avg_cost_pp:12345,vibes:['Romantic','Outdoor'],
   contact_phone:'+260 211 555 010',website_url:'https://example.com/partner-venue',
   description:'Immediate description',open_hours:{Mon:'10:00-20:00'},
   cover_image:'https://example.com/pending.jpg',images:['https://example.com/pending.jpg'],
  }});
 assert(submit.r.ok&&submit.b?.revision_id,`partner submission failed ${submit.r.status} ${JSON.stringify(submit.b)}`);
 const revisionId=submit.b.revision_id;
 const pending=(await req(`/rest/v1/venues?select=name,category,address,area,description,price_tier,avg_cost_pp,vibes,contact_phone,website_url,open_hours,cover_image,images&id=eq.${venueId}`,consumer.token)).b[0];
 assert(pending.name===before.name&&pending.category===before.category&&pending.address===before.address&&pending.cover_image===before.cover_image,'high-risk fields became public before review');
 assert(pending.price_tier===before.price_tier&&pending.avg_cost_pp===before.avg_cost_pp&&JSON.stringify(pending.vibes)===JSON.stringify(before.vibes),'controlled listing fields became public before review');
 assert(pending.contact_phone===before.contact_phone&&pending.website_url===before.website_url,'contact fields became public before review');
 assert(pending.description==='Immediate description'&&pending.open_hours.Mon==='10:00-20:00','low-risk fields did not apply immediately');
 const partnerRevision=await req(`/rest/v1/venue_live_revisions?select=id,revision_source,proposed_values&id=eq.${revisionId}`,partner.token);
 assert(partnerRevision.r.ok&&partnerRevision.b?.[0]?.revision_source==='partner','partner cannot see own revision');
 const consumerRevision=await req('/rest/v1/venue_live_revisions?select=id',consumer.token);
 assert(consumerRevision.r.ok&&consumerRevision.b.length===0,'consumer can see private revision');
 const denied=await req('/rest/v1/rpc/admin_review_partner_live_venue_revision',partner.token,'POST',{p_revision_id:revisionId,p_decision:'approved',p_note:null});
 assert([400,401,403].includes(denied.r.status),'partner reviewed own revision');
 console.log('PASS high-risk partner edits stay private; low-risk edits apply and private visibility is isolated');
 const approved=await req('/rest/v1/rpc/admin_review_partner_live_venue_revision',admin.token,'POST',{p_revision_id:revisionId,p_decision:'approved',p_note:'Phase 4.5 smoke'});
 assert(approved.r.ok&&approved.b.status==='approved','admin approval failed');
 temporaryApproved=true;
 const after=(await req(`/rest/v1/venues?select=name,category,address,area,description,price_tier,avg_cost_pp,vibes,contact_phone,website_url,open_hours,cover_image,images,listing_status,verification_status&id=eq.${venueId}`,consumer.token)).b[0];
 assert(after.name===`Pending ${marker}`&&after.category==='Bar & Lounge'&&after.address==='Pending address'&&after.area==='Longacres','approved text fields not applied');
 assert(after.cover_image==='https://example.com/pending.jpg'&&after.images[0]===after.cover_image,'approved media not applied');
 assert(after.price_tier==='$$$'&&after.avg_cost_pp===12345&&after.vibes.includes('Romantic')&&after.vibes.includes('Outdoor'),'approved controlled listing fields not applied');
 assert(after.contact_phone==='+260 211 555 010'&&after.website_url==='https://example.com/partner-venue','approved contact fields not applied');
 assert(after.description==='Immediate description'&&after.listing_status==='live'&&after.verification_status==='verified','approval damaged live state');
 const approvalAudit=await req(`/rest/v1/venue_change_log?select=field_name,reverification_reason&venue_id=eq.${venueId}&reverification_reason=eq.partner_live_revision_approved`,admin.token);
 assert(approvalAudit.r.ok&&approvalAudit.b.length>=11,'approved partner high-risk fields were not audited');
 console.log('PASS admin approval atomically publishes partner high-risk proposal');
}finally{
 if(temporaryApproved){
  const currentResult=await req(`/rest/v1/venues?select=updated_at&id=eq.${venueId}`,partner.token);
  const restore=await req('/rest/v1/rpc/partner_submit_live_venue_revision',partner.token,'POST',{
   p_venue_id:venueId,p_expected_updated_at:currentResult.b[0].updated_at,p_payload:{
    name:before.name,category:before.category,address:before.address,area:before.area,
    price_tier:before.price_tier,avg_cost_pp:before.avg_cost_pp,vibes:before.vibes,
    contact_phone:before.contact_phone,website_url:before.website_url,
    description:before.description,open_hours:before.open_hours,
    cover_image:before.cover_image,images:before.images,
   }});
  assert(restore.r.ok&&restore.b?.revision_id,'restoration proposal failed');
  const restored=await req('/rest/v1/rpc/admin_review_partner_live_venue_revision',admin.token,'POST',{
   p_revision_id:restore.b.revision_id,p_decision:'approved',p_note:'Phase 4.5 smoke restoration',
  });
  assert(restored.r.ok,'restoration approval failed');
  const final=(await req(`/rest/v1/venues?select=name,category,address,area,description,price_tier,avg_cost_pp,vibes,contact_phone,website_url,open_hours,cover_image,images&id=eq.${venueId}`,partner.token)).b[0];
  for(const field of ['name','category','address','area','description','price_tier','avg_cost_pp','contact_phone','website_url','cover_image']){
   assert(JSON.stringify(final[field])===JSON.stringify(before[field]),`restoration mismatch: ${field}`);
  }
  assert(JSON.stringify(final.open_hours)===JSON.stringify(before.open_hours)&&JSON.stringify(final.images)===JSON.stringify(before.images)&&JSON.stringify(final.vibes)===JSON.stringify(before.vibes),'restoration mismatch: structured fields');
  console.log('PASS staging partner venue restored to its exact pre-test listing state');
 }
}
