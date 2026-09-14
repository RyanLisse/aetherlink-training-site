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

  /* ---- gate: what arrives, the gate, the three exits -------------------- */
  function gate(s){
    const cards=cardsOf(s);
    const box=h('section','tpl tpl-gate');
    const inputs=h('div','gate-inputs');
    (cards.length?cards:[{title:'Output'},{title:'Evidence'},{title:'Contract'}]).slice(0,3)
      .forEach((c,i)=>{const item=h('div','gate-input');item.style.setProperty('--i',i);
        item.append(h('span','tag',c.title));if(clean(c.body))item.append(h('p',null,c.body));inputs.append(item);});
    const post=h('div','gate-post');post.append(h('span','gate-bar'),h('span','gate-label','Human gate'));
    const exits=h('div','gate-exits');
    [['Accept','ok'],['Park','hold'],['Redirect','warn']].forEach(([t,cls],i)=>{
      const e=h('span','gate-exit '+cls,t);e.style.setProperty('--i',i);exits.append(e);});
    box.append(inputs,post,exits);
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

  const BUILD={cover,columns,stack,chain,comparison,layers,handoff,split,grid,gate,arc,pause,figure};

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
