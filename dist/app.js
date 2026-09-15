'use strict';
const params=new URLSearchParams(location.search);
const dayKey=params.get('day');
const lessonKey=params.get('lesson');
const selectedSquad=Number(params.get('squad')??params.get('crew'))===2?2:1;
const decks={1:window.DAYS,2:window.SQUAD2};
const day=lessonKey?window.LESSONS?.[lessonKey]:decks[selectedSquad]?.['day'+dayKey];
const slides=day?day.slides:window.TRAINING;
const $=id=>document.getElementById(id);
let current=0,phase=0,lastFocus=null,toastTimer;
const panel=$('panel');
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function announce(text){$('announcement').textContent=text;}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function openPanel(title,content,opts={}){lastFocus=document.activeElement;if(lastFocus instanceof HTMLElement)lastFocus.setAttribute('aria-expanded','true');$('panel-title').textContent=title;$('panel-body').replaceChildren(content);panel.setAttribute('aria-labelledby','panel-title');panel.classList.toggle('wide',!!opts.wide);panel.showModal();$('close-panel').focus();}
function closePanel(){panel.close();lastFocus?.setAttribute('aria-expanded','false');lastFocus?.focus();}
function showGlossary(){const wrap=node('div');const grid=node('div','glossary-grid');(window.GLOSSARY||[]).forEach((item,i)=>{const card=node('article','glossary-item');card.style.setProperty('--i',i);card.append(node('h3',null,item.term),node('p',null,item.definition));grid.append(card);});const link=node('a','guide-link','Open full glossary page ↗');link.href='glossary.html';link.target='_blank';link.rel='noopener noreferrer';link.style.marginTop='1rem';wrap.append(grid,link);openPanel('Glossary · return here anytime',wrap);}
$('close-panel').addEventListener('click',closePanel);
panel.addEventListener('cancel',e=>{e.preventDefault();closePanel();});
$('glossary').addEventListener('click',showGlossary);
function showPrompt(custom){const s=slides[current],wrap=node('div');wrap.append(node('p','prompt-intro','Replace the bracketed context with your task. Review the scope before running the prompt.'));const area=node('textarea','prompt-text');area.value=custom||s.prompt;area.readOnly=true;area.setAttribute('aria-label','Copy-ready example prompt');wrap.append(area);const row=node('div','prompt-copy'),copy=node('button','prompt-button','Copy prompt');copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(area.value);notify('Prompt copied');copy.textContent='Copied ✓';}catch{area.focus();area.select();notify('Select and copy the prompt manually.');}});row.append(copy);const link=node('a',null,'All example prompts');link.href=day?day.guideUrl:'https://github.com/RyanLisse/claude-code-skills-pack/blob/main/examples/training-prompts.md';link.target='_blank';link.rel='noopener noreferrer';row.append(link);wrap.append(row);openPanel('Example prompts · '+s.title,wrap);}
function phasePrompt(){const raw=slides[6].prompt;const name=slides[6].cards[phase].title;const re=new RegExp('(?:^|\\n\\n)'+name+'\\n([\\s\\S]*?)(?=\\n\\n(?:Plan|Design|Build|Test|Deploy|Maintain)\\n|$)','i');return raw.match(re)?.[1]||raw;}
function renderPhases(container){const tabs=node('div','phase-row');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','SDLC phases');const detail=node('div','phase-panel');detail.id='phase-detail';detail.setAttribute('role','tabpanel');slides[6].cards.forEach((c,i)=>{const btn=node('button','phase-tab',c.title);btn.id='phase-'+i;btn.setAttribute('role','tab');btn.setAttribute('aria-selected',String(i===phase));btn.setAttribute('aria-controls','phase-detail');btn.tabIndex=i===phase?0:-1;btn.addEventListener('click',()=>selectPhase(i));btn.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%6;if(e.key==='ArrowLeft')n=(i+5)%6;if(e.key==='Home')n=0;if(e.key==='End')n=5;if(n!==undefined){e.preventDefault();e.stopPropagation();selectPhase(n);$('phase-'+n).focus();}});tabs.append(btn);});container.append(tabs,detail,node('p','loop-caption','Start where the evidence points. Revisit any phase when the task changes.'));fillPhase();}
function fillPhase(){const c=slides[6].cards[phase],detail=$('phase-detail');if(!detail)return;detail.setAttribute('aria-labelledby','phase-'+phase);const title=node('div');title.append(node('div','phase-number',String(phase+1).padStart(2,'0')),node('h2',null,c.title));const body=node('div');body.append(node('p',null,c.body));const btn=node('button',null,'Use this phase prompt ↗');btn.addEventListener('click',()=>showPrompt(phasePrompt()));body.append(btn);detail.replaceChildren(title,body);}
function selectPhase(n){phase=n;document.querySelectorAll('.phase-tab').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===phase));b.tabIndex=i===phase?0:-1;});fillPhase();}

/* ---- slide layouts (pillars, steps, compare, recap, exercise timer, tagline) ---- */
let timerHandle=null;
let slideController=null;
function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null;}}
function renderTagline(stage,s){if(s.tagline){stage.append(node('p','tagline',s.tagline));}}
function renderSteps(stage,s){const wrap=node('div','steps-wrap');const row=node('ol','steps-chain');let active=-1;const els=[];const co=s.callout;(s.items||[]).forEach((it,i)=>{const li=node('li','step-item');li.style.setProperty('--i',i);if(co&&co.at===i+1){const c=node('div','step-callout');c.append(node('span','step-callout-text',co.text),node('span','step-callout-arrow','▼'));li.append(c);}const b=node('button','step-btn');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Step '+(i+1)+': '+it.label);b.append(node('span','step-circle',String(i+1)));li.append(b,node('span','step-label',it.label));if(it.caption)li.append(node('span','step-caption',it.caption));b.addEventListener('click',()=>{active=i;els.forEach((e,k)=>{e.classList.toggle('active',k===i);e.querySelector('button').setAttribute('aria-pressed',String(k===i));});cap.textContent=it.detail||it.caption||it.label;});els.push(li);row.append(li);});const cap=node('p','steps-detail',s.detail||'');const ctrl=node('div','widget-controls');const next=node('button',null,'Reveal next →');next.addEventListener('click',()=>{if(active<els.length-1){els[active+1].querySelector('button').click();}});const all=node('button','secondary','Show all');all.addEventListener('click',()=>{els.forEach(e=>{e.classList.add('active');e.querySelector('button').setAttribute('aria-pressed','true');});active=els.length-1;cap.textContent=s.detail||'';});ctrl.append(next,all);if(co&&co.at){els[co.at-1].classList.add('highlight');}wrap.append(row,cap,ctrl);stage.append(wrap);}
function renderRecap(stage,s){const list=node('ul','recap-list');const items=s.items||[];items.forEach((it,i)=>{const li=node('li','recap-item hidden-item');li.setAttribute('aria-hidden','true');li.append(node('span','recap-check',String(i+1)),node('span','recap-text',it.label+(it.caption?' — '+it.caption:'')));list.append(li);});let shown=0;const ctrl=node('div','widget-controls');const btn=node('button',null,'Reveal ('+items.length+')');btn.addEventListener('click',()=>{if(shown<items.length){const li=list.children[shown];li.classList.remove('hidden-item');li.removeAttribute('aria-hidden');li.querySelector('.recap-check').textContent='✓';announce(li.textContent);shown++;btn.textContent=shown<items.length?'Reveal ('+(items.length-shown)+' left)':'All shown';}});ctrl.append(btn);stage.append(list,ctrl);}
function renderTimer(stage,s){const m=s.timer||Number((s.kicker||'').match(/(\d+)\s*MIN/i)?.[1]);if(!m)return;let left=m*60;const box=node('div','timer');const face=node('div','timer-face',String(m).padStart(2,'0')+':00');const bar=node('div','timer-bar');const fill=node('div','timer-fill');bar.append(fill);const ctrl=node('div','widget-controls');const start=node('button',null,'Start '+m+' min');const reset=node('button','secondary','Reset');function paint(){face.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');fill.style.width=(100*(1-left/(m*60)))+'%';box.classList.toggle('timer-late',left<=60);}start.addEventListener('click',()=>{if(timerHandle){stopTimer();start.textContent='Resume';announce('Timer paused');return;}start.textContent='Pause';announce('Timer started');timerHandle=setInterval(()=>{if(left>0){left--;paint();}else{stopTimer();face.textContent='TIME';notify('Time is up — individual block ends');}},1000);});reset.addEventListener('click',()=>{stopTimer();left=m*60;paint();start.textContent='Start '+m+' min';announce('Timer reset');});ctrl.append(start,reset);box.append(face,bar,ctrl);stage.append(box);}

/* ---- learning-experience layer: slide types, checklist memory, day progress ---- */
const TYPE_LABEL={practice:'Practice',concept:'Concept',review:'Review',recap:'Recap',pause:'Break',context:'Context'};
function slideType(s){const head=(s.kicker||'').split('·')[0].trim().toLowerCase();const title=(s.title||'').toLowerCase();const timed=!!s.timer||/\bmin\b/.test((s.kicker||'').toLowerCase());const byHead=h=>{if(/practice|individual|transfer|hands-on|^test$|^mob/.test(h))return'practice';if(/recap|close|wrap|check out/.test(h))return'recap';if(/break|lunch/.test(h))return'pause';if(/review|\bgate\b|comparison|compare/.test(h))return'review';if(/concept|beeld|theory|demo|definition|visual|how we use|example/.test(h))return"concept";return null;};const byTitle=t=>{if(/^welcome/.test(t))return'context';if(/^break|^lunch/.test(t))return'pause';if(/^recap|^close|wrap-up|check-out|reflection|transfer/.test(t))return'recap';if(/review|human gate|^gate|compar/.test(t))return'review';if(/practice|individual|hands-on|exercise|your turn|guided|group|\bpass\b|handoff/.test(t))return'practice';if(/demo|theory|concept|loop|sdlc|what is/.test(t))return'concept';return null;};if(s.layout==='exercise')return'practice';if(s.layout==='recap')return'recap';return byHead(head)||(s.widget||s.layout==='image'?'concept':null)||byTitle(title)||(timed?'practice':'context');}
const stateKey=()=>{const t=slides[current].title;const nth=slides.slice(0,current).filter(x=>x.title===t).length;return'al:'+(lessonKey?'lesson:'+lessonKey:selectedSquad+':'+(dayKey||'fw'))+':'+t+(nth?'#'+nth:'');};
function loadState(){try{return JSON.parse(sessionStorage.getItem(stateKey())||'{}')||{};}catch{return{};}}
function saveState(st){try{sessionStorage.setItem(stateKey(),JSON.stringify(st));}catch{}}
/* The "Do this now" checklist, expected result and checkpoint. Since 2026-09-14 this
   lives in the facilitator-notes dialog, not on the slide: the room sees the concept and
   the figure, the facilitator reads the steps. State still lives in sessionStorage. */
function renderInstructions(s){const box=node('section','exercise-instructions');const st=loadState();const steps=s.steps||[];if(steps.length){const head=node('div','do-head');head.append(node('h3',null,'Do this now'));const count=node('span','do-count');head.append(count);box.append(head);const list=node('ol','do-list');const done=Array.isArray(st.done)?st.done.slice(0,steps.length):[];steps.forEach((step,i)=>{const li=node('li','do-item');const label=node('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!done[i];label.append(cb,node('span','do-text',step));li.classList.toggle('done',cb.checked);cb.addEventListener('change',()=>{done[i]=cb.checked;li.classList.toggle('done',cb.checked);saveState({...loadState(),done});paint();paintNotesButton();if(done.filter(Boolean).length===steps.length)notify('All steps done · check the checkpoint');});li.append(label);list.append(li);});const paint=()=>{const n=done.filter(Boolean).length;count.textContent=n+' / '+steps.length;box.classList.toggle('all-done',n===steps.length);};paint();box.append(list);}if(s.expected){const p=node('p','expected');p.append(node('span','field-label','Expected result'),node('span',null,s.expected));box.append(p);}if(s.check){const cp=node('div','checkpoint');const passed=!!st.passed;cp.classList.toggle('passed',passed);const top=node('div','checkpoint-top');top.append(node('span','field-label','Checkpoint'));const toggle=node('button','checkpoint-toggle',passed?'Passed ✓':'Mark passed');toggle.setAttribute('aria-pressed',String(passed));toggle.addEventListener('click',()=>{const next=!(loadState().passed);saveState({...loadState(),passed:next});cp.classList.toggle('passed',next);toggle.textContent=next?'Passed ✓':'Mark passed';toggle.setAttribute('aria-pressed',String(next));paintNotesButton();announce(next?'Checkpoint marked as passed':'Checkpoint reopened');});top.append(toggle);cp.append(top,node('p',null,s.check));box.append(cp);}return box.childNodes.length?box:null;}
/* Footer button: "Facilitator notes · 2/4 ✓" so the facilitator sees the room's state without opening the dialog. */
function paintNotesButton(){const s=slides[current];const btn=$('notes');const st=loadState();const steps=s.steps||[];const n=Array.isArray(st.done)?st.done.filter(Boolean).length:0;btn.replaceChildren(node('span','notes-label','Facilitator notes'));if(steps.length){const badge=node('span','notes-badge',n+'/'+steps.length);badge.classList.toggle('complete',n===steps.length);btn.append(badge);}if(s.check&&st.passed)btn.append(node('span','notes-passed','✓'));btn.classList.toggle('has-steps',steps.length>0);btn.setAttribute('aria-label','Facilitator notes'+(steps.length?', '+n+' of '+steps.length+' steps done':'')+(s.check&&st.passed?', checkpoint passed':''));}
function showNotes(){const s=slides[current];const wrap=node('div','notes-grid');const left=node('section','notes-col');left.append(node('h3','notes-heading','Notes'),node('div','notes-text',s.notes||'No notes for this slide.'));if(s.prompt){const row=node('div','notes-actions');const b=node('button','prompt-button','Example prompt ↗');b.addEventListener('click',()=>showPrompt());row.append(b);left.append(row);}wrap.append(left);const instructions=renderInstructions(s);if(instructions){wrap.append(instructions);wrap.classList.add('two');}openPanel('Facilitator notes · '+s.title,wrap,{wide:!!instructions});}
function renderProgress(){const bar=$('progress');const hadFocus=bar.contains(document.activeElement);bar.replaceChildren();slides.forEach((s,i)=>{const seg=node('button','seg');seg.dataset.type=slideType(s);seg.classList.toggle('done',i<current);seg.classList.toggle('current',i===current);seg.tabIndex=i===current?0:-1;if(i===current)seg.setAttribute('aria-current','step');seg.setAttribute('aria-label',String(i+1)+'. '+s.title);seg.title=s.title;seg.addEventListener('click',()=>go(i));bar.append(seg);});if(hadFocus)bar.querySelector('.seg.current')?.focus();}

/* One slide = heading, one body template, an optional timer, the takeaway band.
   Every arrangement lives in templates.js, so render() only routes. */
function slideBody(s,type){
  if(s.widget&&window.WIDGETS&&window.WIDGETS[s.widget])return window.WIDGETS[s.widget]({signal:slideController.signal});
  /* The deck's own steps and recap layouts carry reveal controls; keep them. */
  if(s.layout==='steps'&&s.items?.length){const box=node('div','tpl tpl-steps');box.dataset.template='steps';renderSteps(box,s);return box;}
  if(s.layout==='recap'&&s.items?.length){const box=node('div','tpl tpl-recap');box.dataset.template='recap';renderRecap(box,s);return box;}
  if(!window.TEMPLATES)return null;
  return window.TEMPLATES.render(s,{type,slides,current,isDay:!!day,slideType,onZoom:zoomImage});
}
function zoomImage(s,img){const wrap=node('div');const big=node('img','full-image');big.src=img.src;big.alt=img.alt;wrap.append(big);if(s.imageCaption)wrap.append(node('p','figure-caption',s.imageCaption));openPanel(s.title,wrap,{wide:true});}
function render(){
  slideController?.abort();slideController=new AbortController();stopTimer();
  const s=slides[current],type=slideType(s);
  document.body.classList.toggle('dark',s.dark);document.body.dataset.type=type;document.title=s.title+' · AetherLink';
  const stage=$('stage');stage.replaceChildren();
  const head=node('section','heading'),top=node('div','heading-top'),eyebrow=node('p','eyebrow');
  const parts=(s.kicker||'').split('·').map(x=>x.trim());
  let chip=TYPE_LABEL[type];
  if(parts[0]&&parts[0].toLowerCase().startsWith(chip.toLowerCase()))chip=parts.shift();
  eyebrow.append(node('span','type-chip',chip),node('span','kicker-text',parts.join(' · ')));
  top.append(eyebrow,node('p','slide-count',String(current+1)+' / '+slides.length));
  head.append(top,node('h1',null,s.title),node('p','subtitle',s.subtitle));
  stage.append(head);
  const body=node('div','slide-body');stage.append(body);
  const framework=!day;
  if(framework&&current===6)renderPhases(body);
  else if(framework&&current===7)body.append(adoptionDiagram(s));
  else{const tpl=slideBody(s,type);if(tpl)body.append(tpl);else body.append(node('p','empty-note','This section has no cards yet. Use the facilitator notes for the talk track.'));}
  if(day)renderTimer(body,s);
  if(day)renderTagline(stage,s);
  $('count').textContent=String(current+1).padStart(2,'0')+' / '+slides.length;
  renderProgress();paintNotesButton();
  $('prev').disabled=current===0;$('next').disabled=current===slides.length-1;
  announce('Section '+(current+1)+' of '+slides.length+': '+s.title);
}
/* Framework deck only: the Anthropic adoption image beside its legend cards. */
function adoptionDiagram(s){
  const layout=node('div','diagram-layout'),col=node('div'),zoom=node('button','diagram-button');
  zoom.setAttribute('aria-label','Enlarge the SDLC adoption diagram');
  const img=node('img');img.src='assets/adoption.png';
  img.alt='SDLC adoption dependencies: foundational practices connect to skills, subagents, evals, requirements, PR review, CI/CD and feedback. Readable row labels are in the adjacent legend.';
  zoom.append(img,node('span','zoom-label','Enlarge ↗'));
  zoom.addEventListener('click',()=>{const big=node('img','full-image');big.src=img.src;big.alt=img.alt;openPanel('Adoption dependencies',big,{wide:true});});
  const source=node('p','source'),link=node('a',null,'Source: Anthropic · AI-native SDLC playbook');
  link.href='https://claude.com/blog/the-ai-native-sdlc-playbook#sd-c2';link.target='_blank';link.rel='noopener noreferrer';
  source.append(link);col.append(zoom,source);
  layout.append(col,window.TEMPLATES.render(s,{template:'stack'}));
  return layout;
}
function go(n){if(n<0||n>=slides.length)return;location.hash=String(n+1);}
function fromHash(){if(location.hash==='#stage'){$('stage').focus();return;}const n=Number(location.hash.slice(1));current=Number.isInteger(n)&&n>=1&&n<=slides.length?n-1:0;render();window.scrollTo({top:0,behavior:'instant'});}
$('prev').addEventListener('click',()=>go(current-1));$('next').addEventListener('click',()=>go(current+1));$('prompt').addEventListener('click',()=>showPrompt());$('notes').addEventListener('click',showNotes);
$('chapters').addEventListener('click',()=>{const list=node('nav','chapter-list');list.setAttribute('aria-label','All training sections');slides.forEach((s,i)=>{const b=node('button','chapter-link');b.dataset.type=slideType(s);b.append(node('span',null,String(i+1).padStart(2,'0')),node('strong',null,s.title),node('em','chapter-type',TYPE_LABEL[slideType(s)]));b.setAttribute('aria-current',String(i===current));b.addEventListener('click',()=>{closePanel();go(i);});list.append(b);});openPanel('Chapters',list);});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('Fullscreen is unavailable in this browser.');}});
document.addEventListener('fullscreenchange',()=>$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
/* Keys: arrows and Page keys navigate; N notes, P prompt, G glossary, C chapters, F fullscreen, ? help. */
document.addEventListener('keydown',e=>{if(panel.open||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.closest('[role=tablist]'))return;const k=e.key.toLowerCase();if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();go(current+1);}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(current-1);}else if(e.key==='Home'){e.preventDefault();go(0);}else if(e.key==='End'){e.preventDefault();go(slides.length-1);}else if(k==='n'){showNotes();}else if(k==='p'&&slides[current].prompt){showPrompt();}else if(k==='g'){showGlossary();}else if(k==='c'){$('chapters').click();}else if(k==='f'){$('fullscreen').click();}else if(e.key==='?'){notify('← → navigate · N notes · P prompt · G glossary · C chapters · F fullscreen');}});
$('day-guide').href=day?day.guideUrl:'https://github.com/RyanLisse/aetherlink-training-template';
$('presentations').textContent=day?(lessonKey?'Guided lesson · '+lessonKey.replace(/-/g,' ')+' · Change':'Squad '+selectedSquad+' · Day '+dayKey+' · Change'):'Choose session';
$('presentations').addEventListener('click',()=>{const list=node('nav','chapter-list');list.setAttribute('aria-label','Training presentations');const options=[[null,null,'Daily framework · reusable'],[1,'3','Wave 2 · Squad 1 · Day 3'],[1,'4','Wave 2 · Squad 1 · Day 4'],[1,'5','Wave 2 · Squad 1 · Day 5'],[1,'1','Squad 1 · Day 1 · Reference'],[1,'2','Squad 1 · Day 2 · Reference'],...['1','2','3','4','5'].map(key=>[2,key,'Squad 2 · New training · Day '+key]),['lesson','daily-brief','Guided lesson · Daily brief agent']];for(const [squad,key,label] of options){const a=node('a','chapter-link',label);a.href=squad==='lesson'?'?lesson='+key+'#1':squad?'?squad='+squad+'&day='+key+'#1':'./#1';if((squad==='lesson'&&key===lessonKey)||(squad!=='lesson'&&squad===selectedSquad&&key===dayKey&&!lessonKey)||(!squad&&!day))a.setAttribute('aria-current','page');list.append(a);}openPanel('Choose a presentation',list);});
window.addEventListener('pagehide',()=>{slideController?.abort();stopTimer();});
window.addEventListener('hashchange',fromHash);fromHash();
