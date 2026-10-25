'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
test('Uncleared commercial brand is identified as a launch blocker',()=>{
 const reg=read('FORGE-IP-SECURITY-REGISTER.md');
 assert.match(reg,/UK00004378627/);
 assert.match(reg,/Nexus Capital Group Ltd/);
 assert.match(reg,/official UKIPO Trade Marks Journal/i);
 assert.match(reg,/ipo\.gov\.uk\/types\/tm\/t-os\/t-tmj/);
 assert.match(reg,/UNRESOLVED \/ HIGH RISK/);
 assert.match(reg,/written professional clearance/i);
 assert.match(reg,/Do not file FORGE or FORGE Athletics marks/i);
});
test('Copyright, registered marks and marketing watermarks are distinguished',()=>{
 const r=read('FORGE-IP-SECURITY-REGISTER.md');
 assert.match(r,/no UK copyright registry/i);
 assert.match(r,/Do not use ® without a valid registration/i);
 assert.match(r,/copyright.*automatically/i);
 assert.match(r,/© notices and watermarking do not create protection/i);
 assert.match(r,/original editable master/i);
 assert.match(r,/without confirming ownership/i);
 assert.match(r,/© 2026 \[VERIFIED LEGAL RIGHTS HOLDER\]/);
});
test('Uncleared public images are not falsely stamped as owned or registered',()=>{
 const r=read('FORGE-IP-SECURITY-REGISTER.md');
 assert.match(r,/Publicly posted promotional renders/i);
 assert.match(r,/Never watermark original SVG masters/i);
 assert.match(r,/forge-icon.svg/);
 assert.match(r,/forge-art-train.svg/);
 assert.match(r,/icon-192.png/);
 assert.match(r,/public/);
 assert.match(r,/access-controlled backup storage/i);
});
test('Public project docs do not encourage unverified commercial rollout',()=>{
 const readme=read('README.md'),phase=read('FORGE-PHASE-2-ROADMAP.md');
 assert.match(readme,/FORGE-IP-SECURITY-REGISTER\.md/);
 assert.match(phase,/FORGE-IP-SECURITY-REGISTER\.md/);
 assert.match(readme,/not cleared/i);
 assert.match(phase,/not been cleared/i);
});
