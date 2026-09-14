/* AetherLink slide figures.
   Every slide gets a diagram, even when the deck carries no artwork for it.
   `window.FIGURES.forSlide(slide, ctx)` picks a figure kind from a small
   declarative topic registry plus the slide type, then draws an inline SVG
   from the slide's own card titles,
   so the canonical JSON never changes for looks. Colours come from the
   stylesheet through the `.fig-*` classes (see "Figures" in styles.css), so
   the same drawing works on the light and dark themes.

   Kinds
     rows   how we use it: one full-width row per card, left rail (Day 2 template)
     hub    concept definition, reference: the concept in the middle, one node per card
     flow   an explicitly ordered demo or transfer: numbered steps ending at a human decision
     cycle  practice, individual, MOB, transfer: do → evidence → check, with the block timer
     gate   review, human gate: output meets the gate, three exits (accept, park, redirect)
     arc    welcome, schedule, context: the day's slides as one typed bar with "you are here"
     close  recap, close, reflection: three overlapping circles
     pause  break, lunch: a clock with the pause length */
(function(){
  'use strict';
  const SVG='http://www.w3.org/2000/svg';
  const W=640,H=360;/* default canvas; tall kinds pass their own height */
  const el=(tag,attrs,text)=>{const e=document.createElementNS(SVG,tag);for(const k in attrs)if(attrs[k]!==undefined)e.setAttribute(k,attrs[k]);if(text!==undefined)e.textContent=text;return e;};
  const g=(cls,children)=>{const e=el('g',{class:cls});children.forEach(c=>c&&e.append(c));return e;};

  /* ---- text helpers ------------------------------------------------------ */
  const clean=t=>String(t||'').replace(/\s+/g,' ').replace(/[·:]+$/,'').trim();
  /* Card titles are shouted in the decks ("WHY THE OLD SDLC LOOKS LIKE THIS");
     figures show them in sentence case so they read as labels, not headings. */
  const sentence=t=>{const s=clean(t);if(!s)return'';const lower=s===s.toUpperCase()?s.toLowerCase():s;return lower.charAt(0).toUpperCase()+lower.slice(1);};
  function wrap(text,max,maxLines){const words=clean(text).split(' ');const lines=[];let line='';for(const w of words){const next=line?line+' '+w:w;if(next.length>max&&line){lines.push(line);line=w;}else line=next;}if(line)lines.push(line);if(lines.length>maxLines){const kept=lines.slice(0,maxLines);kept[maxLines-1]=kept[maxLines-1].replace(/[ ,;]+$/,'').slice(0,max-1)+'…';return kept;}return lines;}
  /* Multi-line, centred text block; `y` is the vertical middle of the block. */
  function label(x,y,text,opts={}){const {cls='fig-label',max=16,lines:maxLines=3,lh=17,anchor='middle',weight}=opts;const lines=wrap(text,max,maxLines);const t=el('text',{class:cls,x,y:y-((lines.length-1)*lh)/2,'text-anchor':anchor,'font-weight':weight});lines.forEach((ln,i)=>t.append(el('tspan',{x,dy:i===0?0:lh},ln)));return t;}
  const svgRoot=(kind,desc,h=H)=>{const s=el('svg',{viewBox:`0 0 ${W} ${h}`,class:'fig kind-'+kind,role:'img','aria-label':desc});const d=el('defs');const m=el('marker',{id:'fig-head-'+kind,viewBox:'0 0 10 10',refX:'8',refY:'5',markerWidth:'7',markerHeight:'7',orient:'auto-start-reverse'});m.append(el('path',{d:'M0 0 L10 5 L0 10 z',class:'fig-head'}));d.append(m);s.append(d);return s;};
  const arrow=(kind,d,cls='fig-line')=>el('path',{class:cls,d,'marker-end':`url(#fig-head-${kind})`});
  const node=(x,y,w,h,text,cls='fig-node',max=16)=>g('fig-box '+cls,[el('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:12}),label(x,y,text,{max,lines:3,cls:'fig-box-label'})]);
  const titles=s=>(s.cards||[]).map(c=>sentence(c.title)).filter(Boolean);
  const kickerTail=s=>{const parts=String(s.kicker||'').split('·').map(x=>x.trim()).filter(Boolean);return parts.length>1?parts[parts.length-1]:'';};
  const minutesOf=s=>s.timer||Number(String(s.kicker||'').match(/(\d+)\s*MIN/i)?.[1])||0;
  const timeRange=s=>String(s.kicker||'').match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  /* "What is intent.md?" → "intent.md"; otherwise the kicker tail ("SUBAGENTS"). */
  const conceptName=s=>{const t=clean(s.title);const m=t.match(/^what (?:is|are) (?:an? |the )?(.+?)\??$/i);if(m)return sentence(m[1]);const tail=kickerTail(s);if(tail&&!/\d/.test(tail))return sentence(tail);return sentence(t.split('·')[0]);};
  /* Keep generated diagrams factual: show the source card titles and leave
     their full explanations in the adjacent cards. */
  const cardLabels=s=>(s.cards||[]).slice(0,4).map(c=>sentence(c.title)).filter(Boolean);
  const titleKey=t=>clean(t).toLowerCase();
  const cardTitleKeys=s=>(s.cards||[]).map(c=>titleKey(c.title));
  const titleSet=(s,expected)=>{const got=cardTitleKeys(s);return got.length===expected.length&&expected.every((t,i)=>got[i]===titleKey(t));};
  const titleSetAny=(s,sets)=>sets.some(expected=>titleSet(s,expected));
  const orderedCards=s=>titleSetAny(s,[['Install','Invoke','Verify'],['Trainer says','Agent returns','Human gate'],['Plan','Proof','Pause'],['Analyst','Developer','Tester'],['Write together','Review with an agent','Agree and commit']]);

  /* Topic selection is declarative: each rule names the factual relationship
     the drawing is allowed to show. Order is intentional for overlapping terms. */
  const TOPIC_REGISTRY=[
    {id:'tests',kind:'comparison',priority:true,types:['practice','concept','review'],titleSets:[['Rewrite','Positive','Negative'],['Positive','Negative','Result'],['Inputs','Two positive checks','Two negative checks']],aria:'Positive and negative checks compared with their recorded result',caption:'Positive and negative checks protect the same stated behavior.'},
    {id:'intent',kind:'comparison',types:['concept'],titleSets:[['What','Why','Boundaries']],aria:'The intent facets: what, why and boundaries',caption:'Intent keeps what, why and boundaries visible.'},
    {id:'proof-handoff',kind:'handoff',types:['concept'],titleSets:[['Write together','Review with an agent','Agree and commit']],aria:'A proof document moves through review into intent.md in GitLab',caption:'Proof draft → human review → approved Markdown in intent.md.'},
    {id:'roles-handoff',kind:'handoff',priority:true,types:['concept','review','practice','context'],titleSets:[['Analyst','Developer','Tester']],aria:'Analyst, developer and tester pass one packet between stages',caption:'Analyst → developer → tester: the same packet is checked at each stage.'},
    {id:'agent-tools',kind:'layers',types:['concept'],titleSets:[['The contract','The adapters','The checker']],aria:'Agent system parts shown as source cards: contract, adapters and checker',caption:'Contract → adapters → checker: the three named system parts.'},
    {id:'subagents',kind:'layers',types:['concept'],titleSets:[['Parallel session','Subagent',"The engineer's job"]],aria:'Parallel session, subagent and engineer roles shown as source cards',caption:'Parallel session · subagent · engineer: three distinct scopes.'},
    {id:'sdlc-stages',kind:'layers',types:['concept'],titleSets:[['Early','Middle','Later']],aria:'AI-native SDLC stages: early, middle and later evidence',caption:'Early → middle → later stages of the SDLC.'},
    {id:'sdlc-principles',kind:'layers',types:['concept'],titleSets:[['From line to loop','AI at every point','Same controls, new enforcement']],aria:'AI-native SDLC principles: line to loop, AI at every point, same controls',caption:'Line to loop · AI at every point · same controls.'}
  ];
  const topicFor=(s,type)=>TOPIC_REGISTRY.find(topic=>(!topic.types||topic.types.includes(type))&&titleSetAny(s,topic.titleSets));

  /* ---- hub: the concept in the middle, one node per card -------------- */
  function hub(s){const names=titles(s).slice(0,4);const n=names.length||3;const h=440;const svg=svgRoot('hub',conceptName(s)+' with '+names.join(', '),h);const cx=W/2,cy=h/2+10;
    const layout=n===2?[[cx,110],[cx,h-110]]:n===3?[[cx,96],[110,h-110],[W-110,h-110]]:[[130,100],[W-130,100],[130,h-96],[W-130,h-96]];
    layout.forEach(([x,y])=>svg.append(el('line',{class:'fig-line',x1:cx,y1:cy,x2:x,y2:y})));
    svg.append(g('fig-hub',[el('circle',{cx,cy,r:72}),label(cx,cy,conceptName(s),{cls:'fig-hub-label',max:13,lines:3,lh:19})]));
    layout.forEach(([x,y],i)=>svg.append(node(x,y,210,92,names[i]||'…',i%2?'fig-node alt':'fig-node',20)));
    return svg;}

  /* ---- flow: numbered steps ending at a human decision ------------------ */
  function flow(s){const names=titles(s).slice(0,4);const n=Math.max(names.length,2);const h=400;const svg=svgRoot('flow','Steps '+names.join(' → ')+' → you decide',h);const y=150,left=70,right=W-130,gap=(right-left)/Math.max(n,1);
    svg.append(el('rect',{class:'fig-rail',x:left-10,y:y-5,width:right-left+20,height:10,rx:5}));
    for(let i=0;i<n;i++){const cx=left+gap*(i+.5);svg.append(g('fig-step'+(i===n-1?' last':''),[el('circle',{cx,cy:y,r:30}),el('text',{class:'fig-step-num',x:cx,y:y+9,'text-anchor':'middle'},String(i+1)),label(cx,y+72,names[i]||'…',{max:15,lines:3,lh:16})]));}
    const gx=right+40;svg.append(arrow('flow',`M${right+2} ${y} H${gx-30}`));
    svg.append(g('fig-box fig-human',[el('rect',{x:gx-30,y:y-30,width:100,height:60,rx:12}),label(gx+20,y,'You decide',{cls:'fig-box-label',max:10,lines:2})]));
    svg.append(el('text',{class:'fig-caption',x:W/2,y:h-22,'text-anchor':'middle'},'Small steps · evidence at each one · a person accepts the result'));
    return svg;}

  /* ---- cycle: do → evidence → check, with the timer in the middle ------- */
  function cycle(s){const names=titles(s);const labels=[names[0]||'Do the step',names[1]||'Record evidence',names[2]||'Check the result'];const h=440;const svg=svgRoot('cycle',labels.join(' → ')+', repeated',h);const cx=W/2,cy=h/2+4;
    const pts=[[cx,92],[W-118,h-118],[118,h-118]];
    for(let i=0;i<3;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%3];const dx=x2-x1,dy=y2-y1;const len=Math.hypot(dx,dy);const ux=dx/len,uy=dy/len;const mx=(x1+x2)/2,my=(y1+y2)/2;const inset=112;svg.append(arrow('cycle',`M${x1+ux*inset} ${y1+uy*inset} Q${mx-uy*34} ${my+ux*34} ${x2-ux*inset} ${y2-uy*inset}`,'fig-line fig-curve'));}
    pts.forEach(([x,y],i)=>svg.append(node(x,y,206,88,labels[i],i===1?'fig-node alt':'fig-node',20)));
    const m=minutesOf(s);svg.append(g('fig-hub',[el('circle',{cx,cy,r:56}),el('text',{class:'fig-hub-label',x:cx,y:cy+(m?-2:7),'text-anchor':'middle','font-size':m?'26':'17'},m?String(m):'loop'),m?el('text',{class:'fig-hub-sub',x:cx,y:cy+22,'text-anchor':'middle'},'min'):null]));
    svg.append(el('text',{class:'fig-caption',x:W/2,y:h-14,'text-anchor':'middle'},m?'Individual block · '+m+' minutes · then groups':'Repeat until the checkpoint holds'));
    return svg;}

  /* ---- gate: output meets the human gate, three exits ------------------ */
  function gate(s){const names=titles(s).slice(0,3);const h=440;const svg=svgRoot('gate','Output and evidence reach the human gate; exits are accept, park, redirect',h);const gx=330,top=64,bottom=h-96;
    const inputs=names.length?names:['Output','Evidence','Contract'];const rowY=i=>110+i*94;
    inputs.forEach((t,i)=>{const y=rowY(i);svg.append(node(122,y,196,72,t,i%2?'fig-node alt':'fig-node',20));svg.append(arrow('gate',`M222 ${y} H${gx-24}`));});
    svg.append(g('fig-gate',[el('rect',{x:gx-18,y:top,width:14,height:bottom-top,rx:5}),el('rect',{x:gx+4,y:top,width:14,height:bottom-top,rx:5}),el('rect',{x:gx-34,y:top-16,width:68,height:16,rx:5}),el('text',{class:'fig-gate-label',x:gx,y:bottom+32,'text-anchor':'middle'},'HUMAN GATE')]));
    [['Accept','fig-exit ok'],['Park','fig-exit'],['Redirect','fig-exit warn']].forEach(([t,cls],i)=>{const y=rowY(i);svg.append(arrow('gate',`M${gx+22} ${y} H428`));svg.append(g('fig-box '+cls,[el('rect',{x:430,y:y-30,width:172,height:60,rx:30}),el('text',{class:'fig-box-label',x:516,y:y+7,'font-size':'16','text-anchor':'middle'},t)]));});
    svg.append(el('text',{class:'fig-caption',x:W/2,y:h-12,'text-anchor':'middle'},'Silence is not approval · quote the evidence, not the platform'));
    return svg;}

  /* ---- arc: the whole day as one typed bar ------------------------------ */
  function arc(s,ctx){const slides=ctx.slides||[],type=ctx.slideType||(()=>'context'),cur=ctx.current||0;const h=440;const svg=svgRoot('arc','The day as one bar of slide types, current slide marked',h);const left=40,right=W-40,y=150,bh=110;const n=Math.max(slides.length,1),w=(right-left)/n;
    slides.forEach((sl,i)=>{const t=type(sl);svg.append(el('rect',{class:'fig-seg'+(i===cur?' current':''),'data-type':t,x:left+i*w+1.5,y:i===cur?y-14:y,width:Math.max(w-3,2),height:i===cur?bh+28:bh,rx:8}));});
    const mx=left+cur*w+w/2;svg.append(el('path',{class:'fig-marker',d:`M${mx-11} ${y-48} L${mx} ${y-26} L${mx+11} ${y-48} Z`}));
    svg.append(el('text',{class:'fig-marker-label',x:Math.min(Math.max(mx,120),W-120),y:y-62,'font-size':'15','text-anchor':'middle'},'You are here · '+(cur+1)+' / '+n));
    const range=timeRange(s);if(range){svg.append(el('text',{class:'fig-time',x:left,y:y+bh+34,'text-anchor':'start'},range[1]));svg.append(el('text',{class:'fig-time',x:right,y:y+bh+34,'text-anchor':'end'},range[2]));}
    const counts={};slides.forEach(sl=>{const t=type(sl);counts[t]=(counts[t]||0)+1;});const order=['practice','concept','review','recap','pause','context'];const names={practice:'Practice',concept:'Concept',review:'Review',recap:'Recap',pause:'Break',context:'Context'};const present=order.filter(t=>counts[t]);
    const cols=Math.min(present.length,3),lw=(right-left)/cols;
    present.forEach((t,i)=>{const x=left+(i%cols)*lw,ly=y+bh+92+Math.floor(i/cols)*38;svg.append(g('fig-legend',[el('rect',{class:'fig-seg','data-type':t,x,y:ly-15,width:19,height:19,rx:6}),el('text',{class:'fig-legend-label',x:x+30,y:ly,'font-size':'14'},counts[t]+' '+names[t])]));});
    return svg;}

  /* ---- close: three overlapping circles --------------------------------- */
  function close(s){const names=titles(s);const labels=[names[0]||'Made',names[1]||'Learned',names[2]||'Can do'];const h=440;const svg=svgRoot('close',labels.join(', ')+' overlap in transfer',h);const cx=W/2,cy=h/2+6,r=118;
    const pts=[[cx-96,cy-52],[cx+96,cy-52],[cx,cy+74]];
    pts.forEach(([x,y],i)=>svg.append(el('circle',{class:'fig-venn v'+i,cx:x,cy:y,r})));
    pts.forEach(([x,y],i)=>svg.append(label(x+(i===0?-64:i===1?64:0),y+(i===2?70:-62),labels[i],{cls:'fig-venn-label',max:14,lines:2,lh:18})));
    svg.append(el('text',{class:'fig-venn-core',x:cx,y:cy+4,'text-anchor':'middle'},'transfer'));
    svg.append(el('text',{class:'fig-caption',x:W/2,y:h-12,'text-anchor':'middle'},'One line each · a fresh reader can pick it up tomorrow'));
    return svg;}

  /* ---- pause: a clock with the break length ----------------------------- */
  function pause(s){const range=timeRange(s);let mins=minutesOf(s);if(!mins&&range){const [h1,m1]=range[1].split(':').map(Number),[h2,m2]=range[2].split(':').map(Number);mins=(h2*60+m2)-(h1*60+m1);}const h=440;const svg=svgRoot('pause','Break'+(mins?' of '+mins+' minutes':''),h);const cx=W/2,cy=h/2-14,r=140;
    svg.append(el('circle',{class:'fig-clock',cx,cy,r}));
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;svg.append(el('line',{class:'fig-tick'+(i%3?'':' major'),x1:cx+(r-18)*Math.cos(a),y1:cy+(r-18)*Math.sin(a),x2:cx+(r-(i%3?8:3))*Math.cos(a),y2:cy+(r-(i%3?8:3))*Math.sin(a)}));}
    const frac=Math.min((mins||15)/60,1);const a1=-Math.PI/2+frac*Math.PI*2;const x1=cx+(r-32)*Math.cos(a1),y1=cy+(r-32)*Math.sin(a1);
    svg.append(el('path',{class:'fig-wedge',d:`M${cx} ${cy} L${cx} ${cy-(r-32)} A${r-32} ${r-32} 0 ${frac>.5?1:0} 1 ${x1} ${y1} Z`}));
    svg.append(el('line',{class:'fig-hand',x1:cx,y1:cy,x2:cx,y2:cy-(r-52)}),el('line',{class:'fig-hand thin',x1:cx,y1:cy,x2:x1,y2:y1}),el('circle',{class:'fig-hand-pin',cx,cy,r:8}));
    svg.append(el('text',{class:'fig-caption strong',x:W/2,y:h-24,'font-size':'18','text-anchor':'middle'},range?'Back at '+range[2]:mins?mins+' minutes':'Take a break'));
    return svg;}

  /* ---- comparison: parallel facts, with no implied order ---------------- */
  function comparison(s,ctx={}){const cards=cardLabels(s);const n=Math.max(cards.length,2),h=440;const topic=ctx.topic||{};const svg=svgRoot('comparison',topic.aria||'Comparison of '+cards.join(', '),h);const gap=16,margin=24;
    const cols=2,rows=Math.ceil(n/cols),pw=(W-margin*2-gap*(cols-1))/cols,ph=(h-104-gap*(rows-1))/rows;
    cards.forEach((c,i)=>{const col=i%cols,row=Math.floor(i/cols);const x=margin+col*(pw+gap),y=52+row*(ph+gap);const panel=g('fig-compare-panel '+(i%2?'alt':''),[el('rect',{x,y,width:pw,height:ph,rx:16}),el('circle',{class:'fig-compare-dot',cx:x+pw/2,cy:y+ph*.32,r:9}),label(x+pw/2,y+ph*.64,c,{cls:'fig-panel-title',max:18,lines:2,lh:28})]);svg.append(panel);});
    if(topic.id==='tests'){svg.append(g('fig-compare-mark',[el('circle',{cx:W/2,cy:27,r:18}),el('text',{class:'fig-compare-mark-label',x:W/2,y:33,'text-anchor':'middle'},'VS')]));}
    svg.append(label(W/2,h-20,topic.caption||'Compare the relationships stated in the cards',{cls:'fig-caption',max:50,lines:2,lh:18}));return svg;}

  /* ---- layers: source cards shown as a stack, useful for systems ---------- */
  function layers(s,ctx={}){const cards=cardLabels(s);const n=Math.max(cards.length,2),h=440;const topic=ctx.topic||{};const svg=svgRoot('layers',topic.aria||'Layered view of '+cards.join(', '),h);const top=42,lh=Math.min(82,(h-104)/n),x=54;
    cards.forEach((c,i)=>{const y=top+i*(lh+8),w=532-i*26;const item=g('fig-layer l'+i,[el('rect',{x,y,width:w,height:lh,rx:14}),el('rect',{class:'fig-layer-index',x,y,width:10,height:lh,rx:5}),label(x+28,y+lh/2,c,{anchor:'start',cls:'fig-panel-title',max:30,lines:2,lh:28})]);svg.append(item);});
    svg.append(label(W/2,h-20,topic.caption||'System parts named by the source cards',{cls:'fig-caption',max:50,lines:2,lh:18}));return svg;}

  /* ---- handoff: a document packet moving between named stages ------------ */
  function handoff(s,ctx={}){const cards=cardLabels(s);const n=Math.max(cards.length,2),h=400;const topic=ctx.topic||{};const svg=svgRoot('handoff',topic.aria||'Document handoff through '+cards.join(', '),h);const gap=18,margin=24,pw=(W-margin*2-gap*(n-1))/n,y=86;
    cards.forEach((c,i)=>{const x=margin+i*(pw+gap);if(i){svg.append(arrow('handoff',`M${x-12} ${y+72} H${x-3}`,'fig-line fig-handoff-line'));}const fold=Math.min(17,pw*.18);const doc=g('fig-doc '+(i%2?'alt':''),[el('rect',{x,y,width:pw,height:144,rx:12}),el('path',{class:'fig-doc-fold',d:`M${x+pw-fold} ${y} L${x+pw} ${y+fold} H${x+pw-fold} Z`}),label(x+pw/2,y+72,c,{cls:'fig-panel-title',max:12,lines:3,lh:28})]);svg.append(doc);});
    svg.append(label(W/2,h-23,topic.caption||'The named packet moves to the next stage',{cls:'fig-caption',max:50,lines:2,lh:18}));return svg;}

  /* ---- rows: one full-width row per card, left rail and a tag (Day 2 template) -- */
  function rows(s){const cards=(s.cards||[]).slice(0,3);const H2=400;const svg=svgRoot('rows',(s.title||'')+': '+cards.map(c=>clean(c.title)).join(', '),H2);
    const x=20,w=W-40,h=104,gap=18,top=(H2-(cards.length*h+(cards.length-1)*gap))/2;
    cards.forEach((c,i)=>{const y=top+i*(h+gap);const cls=i===2?'alt':'';
      const row=g('fig-row '+cls,[el('rect',{class:'fig-row-bg',x,y,width:w,height:h,rx:14}),el('rect',{class:'fig-row-rail',x,y,width:12,height:h,rx:6})]);
      row.append(label(x+34,y+h/2,sentence(c.title),{cls:'fig-row-title',max:18,lines:2,lh:18,anchor:'start'}));
      row.append(label(x+220,y+h/2,c.body,{cls:'fig-row-body',max:38,lines:3,lh:17,anchor:'start'}));
      svg.append(row);});
    return svg;}

  /* ---- picker ------------------------------------------------------------ */
  function kindFor(s,type){const head=String(s.kicker||'').split('·')[0].trim().toLowerCase();const title=String(s.title||'').toLowerCase();const topic=topicFor(s,type);
    if(/break|lunch/.test(head)||/^break|^lunch/.test(title))return'pause';
    if(type==='recap')return'close';
    if(type==='review'&&!topic?.priority)return'gate';
    if(type==='practice'&&!topic?.priority)return'cycle';
    if(topic)return topic.kind;
    if(/how we use/.test(head))return'rows';
    if(orderedCards(s)&&(/demo|example|theory|transfer/.test(head)||/demo|transfer|handoff|route from/.test(title)))return'flow';
    if(/concept definition|reference|glossary/.test(head)||/^what (is|are)/.test(title))return'hub';
    if(type==='context'&&(/schedule|route|rhythm|wave|day \d|welcome|context/.test(head)||/route|rhythm|welcome|schedule/.test(title)))return'arc';
    if(type==='context')return(s.cards||[]).length>=3?'hub':'arc';
    return(s.cards||[]).length>=2?'hub':'flow';}
  const DRAW={hub,flow,cycle,gate,arc,close,pause,rows,comparison,layers,handoff};
  function forSlide(s,ctx={}){const type=ctx.type||'context';const topic=topicFor(s,type);const kind=ctx.kind||kindFor(s,type);const draw=DRAW[kind]||hub;const svg=draw(s,{...ctx,topic});svg.dataset.kind=kind;return svg;}
  window.FIGURES={forSlide,kindFor};
})();
