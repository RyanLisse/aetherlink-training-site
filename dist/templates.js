/* AetherLink slide templates.

   Every slide in the AetherMind Day 2 deck uses the same skeleton — eyebrow,
   counter, title, subtitle, ONE body block, orange takeaway band — and the body
   is always one of a handful of arrangements. This file is those arrangements.

   They are HTML, not SVG. An SVG diagram has a fixed viewBox: on a phone it
   shrinks until the labels are unreadable. The Day 2 arrangements are all just
   blocks in a row, a column or a grid, so HTML reflows them for free: one column
   below 760px, no exceptions and no per-template mobile code.

   Templates (each traceable to a Day 2 slide)

     cover    deck opener: hero illustration + the three framing cards
     columns  2-4 equal cards side by side          (Day 2 · 3, 25, 26)
     stack    full-width rows with a coloured rail  (Day 2 · 8, 9, 10)
     chain    numbered circles on a rail            (Day 2 · 6, 7, 34)
              only when the slide declares a sequence with arrows
              (the deck's own `steps` and `recap` layouts keep their reveal
               controls in app.js; every other slide goes through a template)
     comparison parallel facts, no implied order        (registry: tests, intent)
     layers   named system parts as a stack          (registry: subagents, SDLC)
     handoff  one packet moving between stages       (registry: roles, proof)
     bars     stage blocks sized by the time they take (the bottleneck slides)
     lanes    one packet moving between two named roles, with the round count
     split    two panels, the second one dark       (Day 2 · 17, 27)
     grid     2x2 tiles                             (Day 2 · 35, 36)
     gate     inputs, the gate, three exits         (Day 2 · 34 human-in-the-loop)
     arc      the day as typed segments             (route and schedule slides)
     pause    clock with the return time            (break and lunch)
     figure   a published diagram or a widget, full width

   `TEMPLATES.pick(slide, type)` names the template, `TEMPLATES.render(...)`
   builds it. Both read only the slide's own fields, so the canonical course
   JSON never changes for looks. */
(function(){
  'use strict';

  const h=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const clean=t=>String(t||'').replace(/\s+/g,' ').trim();
  /* Deck card titles are shouted ("WHY THE OLD SDLC LOOKS LIKE THIS"); the
     templates print them as written, the CSS decides the casing. */
  const cardsOf=s=>(s.cards||[]).filter(c=>clean(c.title)||clean(c.body));
  /* A numbered chain claims the cards are a sequence. Only the author may claim
     that: an arrow in the subtitle or the tagline ("Theory → demo → review"),
     or the deck's own `steps` layout. Three unordered cards stay a stack. */
  const declaresSequence=s=>/→|->/.test(String(s.subtitle||'')+String(s.tagline||''));
  const minutesOf=s=>s.timer||Number(String(s.kicker||'').match(/(\d+)\s*MIN/i)?.[1])||0;
  const timeRange=s=>String(s.kicker||'').match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);

  const titleKey=t=>clean(t).toLowerCase();
  const titleSet=(s,expected)=>{const got=(s.cards||[]).map(c=>titleKey(c.title));return got.length===expected.length&&expected.every((t,i)=>got[i]===titleKey(t));};
  const titleSetAny=(s,sets)=>sets.some(expected=>titleSet(s,expected));
  /* Card sets the course itself orders. Ported from PR #4 together with the
     registry below: only these, or an arrow the author wrote, may be numbered. */
  const ORDERED=[['Install','Invoke','Verify'],['Trainer says','Agent returns','Human gate'],['Plan','Proof','Pause'],['Analyst','Developer','Tester'],['Write together','Review with an agent','Agree and commit']];
  const orderedCards=s=>titleSetAny(s,ORDERED);

  /* Topic selection is declarative: each rule names the exact card titles it
     recognises and the factual relationship the template is allowed to show,
     so the picker never guesses a relationship from a keyword. Ported from
     PR #4 (`TOPIC_REGISTRY` in figures.js); order matters for overlapping terms.
     `priority` lets a topic win over the slide type. */
  const TOPIC_REGISTRY=[
    {id:'tests',template:'comparison',priority:true,types:['practice','concept','review'],titleSets:[['Rewrite','Positive','Negative'],['Positive','Negative','Result'],['Inputs','Two positive checks','Two negative checks']],aria:'Positive and negative checks compared with their recorded result',caption:'Positive and negative checks protect the same stated behavior.',mark:'VS'},
    {id:'intent',template:'comparison',types:['concept'],titleSets:[['What','Why','Boundaries']],aria:'The intent facets: what, why and boundaries',caption:'Intent keeps what, why and boundaries visible.'},
    {id:'proof-handoff',template:'handoff',types:['concept'],titleSets:[['Write together','Review with an agent','Agree and commit']],aria:'A proof document moves through review into intent.md in GitLab',caption:'Proof draft → human review → approved Markdown in intent.md.'},
    {id:'roles-handoff',template:'handoff',priority:true,types:['concept','review','practice','context'],titleSets:[['Analyst','Developer','Tester']],aria:'Analyst, developer and tester pass one packet between stages',caption:'Analyst → developer → tester: the same packet is checked at each stage.'},
    {id:'agent-tools',template:'layers',types:['concept'],titleSets:[['The contract','The adapters','The checker']],aria:'Agent system parts shown as source cards: contract, adapters and checker',caption:'Contract → adapters → checker: the three named system parts.'},
    {id:'subagents',template:'layers',types:['concept'],titleSets:[['Parallel session','Subagent',"The engineer's job"]],aria:'Parallel session, subagent and engineer roles shown as source cards',caption:'Parallel session · subagent · engineer: three distinct scopes.'},
    {id:'sdlc-stages',template:'layers',types:['concept'],titleSets:[['Early','Middle','Later']],aria:'AI-native SDLC stages: early, middle and later evidence',caption:'Early → middle → later stages of the SDLC.'},
    {id:'autonomy',template:'keys',priority:true,titleSets:[['Permission','Evidence','Autonomy'],['Permission','Evidence','Boundary']],aria:'Permission and evidence together allow more autonomy',caption:'Permission without evidence is freedom without proof.'},
    /* Rows below match card sets that actually occur in these decks. */
    {id:'goal-input-result',template:'keys',titleSets:[['Goal','Input','Result']],aria:'A goal and an input produce the result',caption:'Goal plus input; the result is what you can show afterwards.'},
    {id:'evidence-rule',template:'keys',priority:true,titleSets:[['CLAIM','SOURCE + CHECK','REVIEWER']],aria:'A claim needs a source, a check and a named reviewer',caption:'A claim without a source and a named reviewer is not evidence.'},
    {id:'gate-time',template:'chain',priority:true,titleSets:[['BEFORE THE GATE','AT THE GATE','AFTER THE GATE']],aria:'Before, at and after the gate, in order',caption:'The same packet, at three moments around the gate.'},
    {id:'mob-rotation',template:'chain',priority:true,titleSets:[['START','ROTATE','PAUSE']],aria:'Start, rotate and pause, in that order',caption:'The rotation runs on the clock, not on who is loudest.'},
    {id:'record-decide',template:'chain',priority:true,titleSets:[['Record','Decide','Then']],aria:'Record, then decide, then the next step',caption:'Record before you decide; the decision is what you can quote later.'},
    {id:'bound-watch',template:'chain',titleSets:[['BOUND THE TASK','WATCH THE LOOP','INTERRUPT ON PURPOSE']],aria:'Bound the task, watch the loop, interrupt on purpose',caption:'Bound it first; interrupting is a decision, not a reflex.'},
    {id:'security-example',template:'chain',titleSets:[['THE SECURITY EXAMPLE','WHAT WE CHANGE','WHAT WE DO THIS WEEK']],aria:'From the example, to the change, to this week',caption:'From the example to the change to what we do this week.'},
    {id:'three-places',template:'comparison',titleSets:[['IN THE EVIDENCE LOG',"IN THE AGENT'S OUTPUT",'AT THE HUMAN GATE']],aria:'The same rule seen in three places',caption:'The same rule, checked in three separate places.'},
    {id:'what-changed',template:'comparison',titleSets:[['WHAT CHANGED','WHY THE OLD SDLC LOOKS LIKE THIS','THE ASSUMPTION THAT BROKE']],aria:'What changed, why it looked like that, and the assumption that broke',caption:'Three parallel readings of the same shift.'},
    {id:'scenario',template:'comparison',titleSets:[['Sources','Cutoff','Evidence'],['Outcome','Scenario','Boundary']],aria:'The framing facts of the scenario',caption:'The facts that bound today: what we use, when we stop, what we keep.'},
    {id:'practices',template:'comparison',titleSets:[['SPLIT THE WORK','TURN REPEATS INTO SUBAGENTS','GOVERN FROM THE REPO']],aria:'Three practices that stand on their own',caption:'Three practices; each one holds without the others.'},
    {id:'mob-setup',template:'layers',titleSets:[['GROUP','ROLES','AI IN THE MOB']],aria:'The group, the roles, and where AI sits in the mob',caption:'Group, roles, and where the agent sits inside them.'},
    {id:'hook-parts',template:'layers',titleSets:[['SKILL VS HOOK','WHERE IT FIRES','WHAT IT DOES']],aria:'What a hook is, where it fires and what it does',caption:'What it is, where it fires, what it does.'},
    {id:'sdlc-principles',template:'layers',types:['concept'],titleSets:[['From line to loop','AI at every point','Same controls, new enforcement']],aria:'AI-native SDLC principles: line to loop, AI at every point, same controls',caption:'Line to loop · AI at every point · same controls.'}
  ];
  const topicFor=(s,type)=>TOPIC_REGISTRY.find(t=>(!t.types||t.types.includes(type))&&titleSetAny(s,t.titleSets));
  const captionEl=topic=>topic?.caption?h('p','tpl-caption',topic.caption):null;

  /* A card body is plain text, an arrow chain, or a time list — the same three
     shapes the deck uses everywhere. `bodyEl` is shared by every template. */
  function bodyEl(text){
    const t=String(text||'');
    const parts=t.split(' · ');
    if(parts.length>=2&&parts.filter(p=>/^\d{1,2}:\d{2}/.test(p)).length>=2){
      const ul=h('ul','tl');
      parts.forEach(p=>{const m=p.match(/^(\d{1,2}:\d{2}(?:[–-]\d{1,2}:\d{2})?)\s*(.*)$/);const li=h('li');
        if(m){li.append(h('span','tl-t',m[1]),h('span','tl-l',m[2]));}else li.append(h('span','tl-l',p));ul.append(li);});
      return ul;
    }
    const arrows=t.split(/\s*(?:→|->)\s*/);
    if(arrows.length>=3&&t.length<200){
      const row=h('p','pills');
      arrows.forEach((a,i)=>{row.append(h('span','pill'+(i===0?' first':''),a.trim()));if(i<arrows.length-1)row.append(h('span','pill-arrow','→'));});
      return row;
    }
    return h('p',null,t);
  }

  /* ---- cover: the deck opener ------------------------------------------- */
  function cover(s){
    const box=h('section','tpl tpl-cover');
    const art=h('div','cover-art');
    const img=h('img');img.src='assets/bot-builder.jpg';img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';
    art.append(img);
    const list=h('div','cover-cards');
    cardsOf(s).forEach(c=>{const item=h('div','cover-card');item.append(h('span','tag',c.title),bodyEl(c.body));list.append(item);});
    box.append(art,list);
    return box;
  }

  /* ---- columns: 2-4 equal cards side by side ---------------------------- */
  function columns(s,items){
    const cards=items||cardsOf(s).map(c=>({title:c.title,body:c.body}));
    const box=h('section','tpl tpl-columns');
    box.dataset.count=String(Math.min(cards.length,4));
    cards.forEach((c,i)=>{
      const col=h('article','col');col.style.setProperty('--i',i);
      col.append(h('span','col-rail'),h('h2',null,c.title));
      if(clean(c.body))col.append(bodyEl(c.body));
      box.append(col);
    });
    return box;
  }

  /* ---- stack: full-width rows with a rail and a tag --------------------- */
  function stack(s){
    const box=h('section','tpl tpl-stack');
    cardsOf(s).forEach((c,i)=>{
      const row=h('article','row');row.style.setProperty('--i',i);
      row.append(h('span','row-rail'));
      const head=h('div','row-head');head.append(h('h2',null,c.title));
      row.append(head,bodyEl(c.body));
      box.append(row);
    });
    return box;
  }

  /* ---- chain: numbered circles on a rail -------------------------------- */
  function chain(s,items){
    const steps=items||cardsOf(s).map(c=>({label:c.title,caption:c.body}));
    const box=h('section','tpl tpl-chain');
    const ol=h('ol','chain');
    steps.forEach((st,i)=>{
      const li=h('li','chain-step'+(i===steps.length-1?' last':''));li.style.setProperty('--i',i);
      li.append(h('span','chain-num',String(i+1)));
      const txt=h('div','chain-text');
      txt.append(h('h2',null,st.label));
      if(clean(st.caption))txt.append(h('p',null,st.caption));
      li.append(txt);
      ol.append(li);
    });
    box.append(ol);
    return box;
  }

  /* ---- comparison: parallel facts, no implied order (PR #4's `comparison`) */
  function comparison(s,ctx){
    const topic=ctx.topic||{};
    const box=h('section','tpl tpl-comparison');
    box.setAttribute('aria-label',topic.aria||'');
    const panels=h('div','cmp-panels');
    cardsOf(s).slice(0,4).forEach((c,i)=>{
      const panel=h('article','cmp-panel');panel.style.setProperty('--i',i);
      panel.append(h('span','cmp-dot'),h('h2',null,c.title));
      if(clean(c.body))panel.append(bodyEl(c.body));
      panels.append(panel);
    });
    if(topic.mark)panels.append(h('span','cmp-mark',topic.mark));
    box.append(panels);
    const cap=captionEl(topic);if(cap)box.append(cap);
    return box;
  }

  /* ---- layers: named system parts as a stack (PR #4's `layers`) ---------- */
  function layers(s,ctx){
    const topic=ctx.topic||{};
    const box=h('section','tpl tpl-layers');
    box.setAttribute('aria-label',topic.aria||'');
    cardsOf(s).slice(0,4).forEach((c,i)=>{
      const layer=h('article','layer');layer.style.setProperty('--i',i);
      layer.append(h('span','layer-rail'),h('h2',null,c.title));
      if(clean(c.body))layer.append(bodyEl(c.body));
      box.append(layer);
    });
    const cap=captionEl(topic);if(cap)box.append(cap);
    return box;
  }

  /* ---- handoff: one packet moving between named stages (PR #4's `handoff`) */
  function handoff(s,ctx){
    const topic=ctx.topic||{};
    const box=h('section','tpl tpl-handoff');
    box.setAttribute('aria-label',topic.aria||'');
    const row=h('ol','handoff-row');
    cardsOf(s).slice(0,4).forEach((c,i)=>{
      const doc=h('li','handoff-doc');doc.style.setProperty('--i',i);
      doc.append(h('span','handoff-fold'),h('h2',null,c.title));
      if(clean(c.body))doc.append(bodyEl(c.body));
      row.append(doc);
    });
    box.append(row);
    const cap=captionEl(topic);if(cap)box.append(cap);
    return box;
  }

  /* ---- bars: stage blocks whose width is the time they take --------------- */
  function bars(s){
    const spec=s.bars||{};
    const box=h('section','tpl tpl-bars');
    const row=h('div','bars-row');
    (spec.stages||[]).forEach((st,i)=>{
      const bar=h('span','bar'+(st.accent?' accent':'')+(st.ghost?' ghost':''),st.name);
      bar.style.setProperty('--w',String(st.w||1));
      bar.style.setProperty('--i',i);
      row.append(bar);
    });
    box.append(row);
    if(spec.scale)box.append(h('p','bars-scale',spec.scale));
    if(spec.caption)box.append(h('p','tpl-caption',spec.caption));
    return box;
  }

  /* ---- lanes: the same packet moving between two named roles -------------- */
  function lanes(s){
    const items=(s.items||[]).filter(i=>clean(i.label));
    const names=[...new Set(items.map(i=>i.lane).filter(Boolean))];
    const box=h('section','tpl tpl-lanes');
    box.style.setProperty('--lanes',String(names.length||1));
    const head=h('div','lane-heads');
    names.forEach((n,i)=>{const t=h('span','lane-name',n);t.style.setProperty('--lane',i);head.append(t);});
    box.append(head);
    const track=h('ol','lane-track');
    items.forEach((it,i)=>{
      const step=h('li','lane-step');
      step.style.setProperty('--lane',String(Math.max(names.indexOf(it.lane),0)));
      step.style.setProperty('--i',i);
      if(it.last)step.classList.add('last');
      step.append(h('span','lane-num',String(i+1)),h('h2',null,it.label));
      if(clean(it.caption))step.append(h('p','lane-caption',it.caption));
      if(clean(it.detail))step.append(h('p','lane-detail',it.detail));
      track.append(step);
    });
    box.append(track);
    if(s.detail)box.append(h('p','tpl-caption',s.detail));
    return box;
  }

  /* ---- keys: two conditions unlock one outcome (Day 2 · 35) --------------- */
  function keys(s){
    const cards=cardsOf(s);
    const conds=cards.slice(0,cards.length-1),out=cards[cards.length-1];
    const box=h('section','tpl tpl-keys');
    const col=h('div','keys-col');
    conds.forEach((c,i)=>{const k=h('article','key-card');k.style.setProperty('--i',i);
      k.append(h('span','key-badge','Key'),h('h2',null,c.title));
      if(clean(c.body))k.append(h('p',null,c.body));col.append(k);});
    const panel=h('article','keys-out');
    if(out){panel.append(h('h2',null,out.title));if(clean(out.body))panel.append(h('p',null,out.body));}
    box.append(col,panel);
    return box;
  }

  /* ---- split: two panels, the second one dark --------------------------- */
  function split(s){
    const cols=s.columns||[];
    const box=h('section','tpl tpl-split');
    cols.forEach((c,i)=>{
      const panel=h('section','split-panel');panel.style.setProperty('--i',i);
      panel.append(h('h2',null,c.title));
      const ul=h('ul');(c.items||[]).forEach(x=>ul.append(h('li',null,x)));
      panel.append(ul);
      if(c.foot)panel.append(h('p','split-foot',c.foot));
      box.append(panel);
    });
    return box;
  }

  /* ---- grid: equal tiles ------------------------------------------------ */
  function grid(s,items){
    const tiles=items||cardsOf(s).map(c=>({label:c.title,caption:c.body}));
    const box=h('section','tpl tpl-grid');
    tiles.forEach((t,i)=>{
      const tile=h('article','tile');tile.style.setProperty('--i',i);
      tile.append(h('h2',null,t.label));
      if(clean(t.caption))tile.append(h('p',null,t.caption));
      box.append(tile);
    });
    return box;
  }

  /* ---- gate: what arrives meets the posts, three exits (PR #4's shape) ---- */
  function gate(s){
    const cards=cardsOf(s).slice(0,3);
    const inputs=cards.length?cards:[{title:'Output'},{title:'Evidence'},{title:'Contract'}];
    const EXITS=[['Accept','ok'],['Park','hold'],['Redirect','warn']];
    const box=h('section','tpl tpl-gate');
    const grid=h('div','gate-grid');
    /* the posts are one element spanning all rows, so the rows read through it */
    const post=h('div','gate-post');
    post.append(h('span','gate-bar'),h('span','gate-bar'),h('span','gate-cap'));
    grid.append(post);
    inputs.forEach((c,i)=>{
      const item=h('article','gate-input');item.style.setProperty('--row',i);item.style.setProperty('--i',i);
      item.append(h('span','tag',c.title));
      if(clean(c.body))item.append(h('p',null,c.body));
      grid.append(item);
      const [t,cls]=EXITS[i]||EXITS[0];
      const exit=h('span','gate-exit '+cls,t);exit.style.setProperty('--row',i);exit.style.setProperty('--i',i);
      grid.append(exit);
    });
    box.append(grid,h('p','gate-label','Human gate'),
      h('p','tpl-caption','Silence is not approval · quote the evidence, not the platform'));
    return box;
  }

  /* ---- arc: the day as typed segments ----------------------------------- */
  function arc(s,ctx){
    const slides=ctx.slides||[],typeOf=ctx.slideType||(()=>'context'),cur=ctx.current||0;
    const NAMES={practice:'Practice',concept:'Concept',review:'Review',recap:'Recap',pause:'Break',context:'Context'};
    const box=h('section','tpl tpl-arc');
    const head=h('p','arc-here','You are here · '+(cur+1)+' / '+slides.length);
    const bar=h('div','arc-bar');
    slides.forEach((sl,i)=>{const seg=h('span','arc-seg'+(i===cur?' current':''));seg.dataset.type=typeOf(sl);seg.title=sl.title;bar.append(seg);});
    box.append(head,bar);
    const range=timeRange(s);
    if(range){const ends=h('p','arc-ends');ends.append(h('span',null,range[1]),h('span',null,range[2]));box.append(ends);}
    const counts={};slides.forEach(sl=>{const t=typeOf(sl);counts[t]=(counts[t]||0)+1;});
    const legend=h('p','arc-legend');
    ['practice','concept','review','recap','pause','context'].filter(t=>counts[t]).forEach(t=>{
      const item=h('span','arc-key');item.dataset.type=t;item.textContent=counts[t]+' '+NAMES[t];legend.append(item);});
    box.append(legend);
    return box;
  }

  /* ---- pause: the clock -------------------------------------------------- */
  function pause(s){
    const range=timeRange(s);
    let mins=minutesOf(s);
    if(!mins&&range){const [h1,m1]=range[1].split(':').map(Number),[h2,m2]=range[2].split(':').map(Number);mins=(h2*60+m2)-(h1*60+m1);}
    const box=h('section','tpl tpl-pause');
    const dial=h('div','clock');
    dial.style.setProperty('--frac',String(Math.min((mins||15)/60,1)));
    dial.append(h('span','clock-wedge'),h('span','clock-hand'),h('span','clock-pin'));
    const label=h('p','clock-label',range?'Back at '+range[2]:mins?mins+' minutes':'Take a break');
    box.append(dial,label);
    return box;
  }

  /* ---- figure: a published diagram, full width -------------------------- */
  function figure(s,ctx){
    const box=h('figure','tpl tpl-figure');
    const img=h('img');img.src='assets/'+s.image;img.alt=s.imageAlt||'';
    box.append(img);
    if(ctx.onZoom){
      const zoom=h('button','figure-zoom','Enlarge ↗');
      zoom.setAttribute('aria-label','Enlarge the diagram');
      zoom.addEventListener('click',()=>ctx.onZoom(s,img));
      box.append(zoom);
    }
    if(s.imageCaption)box.append(h('figcaption','figure-caption',s.imageCaption));
    return box;
  }

  /* ---- which template ---------------------------------------------------- */
  /* AetherBOT appears only where the Day 2 deck puts him: an opener, a warning,
     a "your turn", a close. He lives in the template's own gutter, so he can
     never sit on a label, and he is hidden below 1100px. */
  const BOT={cover:null,gate:'stop',pause:'neutral',grid:'thinking',arc:'neutral',comparison:'pointing',layers:'pointing',handoff:'pointing'};

  function pick(s,type,ctx){
    const head=String(s.kicker||'').split('·')[0].trim().toLowerCase();
    const title=String(s.title||'').toLowerCase();
    const topic=topicFor(s,type);
    if(s.bars)return'bars';
    if(s.lanes&&s.items?.length)return'lanes';
    if(s.layout==='image'&&s.image)return'figure';
    if(s.layout==='compare'&&s.columns?.length)return'split';
    if(s.layout==='pillars'&&s.items?.length)return'columns';
    if(ctx&&ctx.current===0&&ctx.isDay)return'cover';
    if(/break|lunch/.test(head)||/^break|^lunch/.test(title))return'pause';
    if(/schedule|route|rhythm/.test(head)||/route|rhythm/.test(title))return'arc';
    if(topic?.priority)return topic.template;
    if(type==='recap')return'grid';
    if(type==='review')return'gate';
    if(topic)return topic.template;
    if(/how we use/.test(head))return'stack';
    /* Practice cards are long prose (problem, outcome, open) — rows, not columns. */
    if(type==='practice')return'stack';
    if((declaresSequence(s)||orderedCards(s))&&cardsOf(s).length>=3)return'chain';
    if(type==='context')return cardsOf(s).length?'stack':'arc';
    return'columns';
  }

  const BUILD={cover,columns,stack,chain,comparison,layers,handoff,bars,lanes,keys,split,grid,gate,arc,pause,figure};

  /* columns, chain and grid take a normalised item list; the rest take ctx. */
  function itemsFor(name,s){
    if(name==='columns'&&s.layout==='pillars')return(s.items||[]).map(i=>({title:i.label,body:i.caption}));
    return undefined;
  }

  function render(s,ctx={}){
    const name=ctx.template||pick(s,ctx.type||'context',ctx);
    const build=BUILD[name]||columns;
    const takesItems=name==='columns'||name==='chain'||name==='grid';
    const out=build(s,takesItems?itemsFor(name,s):{...ctx,topic:ctx.topic||topicFor(s,ctx.type||'context')});
    out.dataset.template=name;
    const pose=BOT[name];
    if(pose){
      out.classList.add('has-bot');
      const bot=h('img','tpl-bot');bot.src='assets/bot-'+pose+'.png';bot.alt='';bot.setAttribute('aria-hidden','true');bot.decoding='async';
      out.append(bot);
    }
    return out;
  }

  window.TEMPLATES={render,pick,names:Object.keys(BUILD)};
})();
