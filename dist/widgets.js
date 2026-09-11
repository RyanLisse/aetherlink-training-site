/* AetherLink interactive slide widgets.
   A deck slide opts in with "widget": "agentic-loop" | "sdlc-loop".
   Recreated from the Claude Code docs (how-claude-code-works#the-agentic-loop)
   and the AI-native SDLC playbook diagrams, in AetherLink colours, so the
   trainer can step through them instead of pointing at a static picture. */
(function(){
  const SVG='http://www.w3.org/2000/svg';
  function el(tag,attrs,text){const e=document.createElementNS(SVG,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(text!==undefined)e.textContent=text;return e;}
  function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}

  /* ---------- Widget 1: the agentic loop ---------- */
  const LOOP_STEPS=[
    {phase:'prompt',title:'Your prompt',text:'“Use the ticket-coach subagent. Read TICKET-OPS-101 and return a draft that follows the template. Preview only.”',adapter:'n8n: Execute workflow · Claude Code: you type the prompt'},
    {phase:'gather',title:'Gather context',text:'The agent reads what it needs: ticket-inputs.md, ticket-template.md, the contract README. Every read is one tool call.',adapter:'n8n: Set node supplies the ticket · Claude Code: Read / Glob / Grep'},
    {phase:'act',title:'Take action',text:'It decides one bounded step and acts: reproduce the arithmetic, draft the packet. Calculator or its own reasoning — still a tool action.',adapter:'n8n: AI Agent + Calculator (ai_tool) · Claude Code: subagent drafts in chat'},
    {phase:'verify',title:'Verify results',text:'It checks its own work against the contract: headings present, protected text unchanged, OPEN where sources are silent.',adapter:'Both: checker (shape) + your review (content). Trace shows what ran.'},
    {phase:'repeat',title:'Repeat',text:'Something missing? Back to gathering context with what it just learned. Dozens of small cycles chain together.',adapter:'The loop adapts: a question may need one pass, a fix several.'},
    {phase:'human',title:'You: interrupt, steer, add context',text:'You are part of the loop. Interrupt, redirect, add a source, or accept at the human gate. The agent works autonomously but stays responsive.',adapter:'Human gate: accept · park · redirect. No approval is implied by silence.'},
    {phase:'done',title:'Done',text:'A preview you can inspect, a trace of what ran, a checker line, and your decision. That is evidence — the answer alone is not.',adapter:'Record: input, settings, output, trace, human decision.'}
  ];
  function agenticLoop(){
    const wrap=h('section','widget widget-loop');wrap.setAttribute('aria-label','Interactive agentic loop');
    const svg=el('svg',{viewBox:'0 0 760 250',role:'img','aria-label':'Your prompt → gather context → take action → verify results → done, with a repeat arrow and a human interrupt'});
    const box=(id,x,y,w,label,cls)=>{const g=el('g',{class:'lp-box '+cls,'data-id':id});g.append(el('rect',{x,y,width:w,height:52,rx:10}),el('text',{x:x+w/2,y:y+31,'text-anchor':'middle'},label));return g;};
    const arrow=(x1,x2,y)=>el('path',{class:'lp-arrow',d:`M${x1} ${y} H${x2}`,'marker-end':'url(#lp-head)'});
    const defs=el('defs');const m=el('marker',{id:'lp-head',viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'7',markerHeight:'7',orient:'auto-start-reverse'});m.append(el('path',{d:'M0 0 L10 5 L0 10 z',class:'lp-head'}));defs.append(m);svg.append(defs);
    svg.append(el('rect',{class:'lp-frame',x:150,y:22,width:500,height:150,rx:12}));
    svg.append(el('text',{class:'lp-frame-label',x:400,y:40,'text-anchor':'middle'},'agentic loop'));
    svg.append(box('prompt',10,72,120,'Your prompt','lp-neutral'),arrow(132,166,98),
      box('gather',168,72,140,'Gather context','lp-phase'),arrow(310,336,98),
      box('act',338,72,140,'Take action','lp-phase'),arrow(480,506,98),
      box('verify',508,72,132,'Verify results','lp-phase'),arrow(642,676,98),
      box('done',678,72,72,'Done','lp-neutral'));
    svg.append(el('path',{class:'lp-repeat','data-id':'repeat',d:'M574 124 V150 H238 V128','marker-end':'url(#lp-head)'}));
    svg.append(el('text',{class:'lp-repeat-label',x:406,y:145,'text-anchor':'middle'},'repeat'));
    const hum=el('g',{class:'lp-box lp-human','data-id':'human'});hum.append(el('rect',{x:10,y:186,width:230,height:52,rx:10}),el('text',{x:125,y:207,'text-anchor':'middle'},'You: interrupt, steer,'),el('text',{x:125,y:226,'text-anchor':'middle'},'or add context'));svg.append(hum);
    svg.append(el('path',{class:'lp-human-arrow',d:'M242 212 H408 V176','marker-end':'url(#lp-head)'}));
    wrap.append(svg);
    const cap=h('div','widget-caption');const capTitle=h('h2');const capText=h('p');const capAdapter=h('p','widget-adapter');cap.append(capTitle,capText,capAdapter);wrap.append(cap);
    const ctrl=h('div','widget-controls');const bStep=h('button',null,'Step →');const bPlay=h('button',null,'Play');const bHuman=h('button','secondary','You interrupt');const bReset=h('button','secondary','Reset');ctrl.append(bStep,bPlay,bHuman,bReset);wrap.append(ctrl);
    let i=-1,timer=null;
    function show(n){i=n;const s=LOOP_STEPS[i];svg.querySelectorAll('[data-id]').forEach(g=>g.classList.toggle('active',g.dataset.id===s.phase));capTitle.textContent=(i+1)+' · '+s.title;capText.textContent=s.text;capAdapter.textContent=s.adapter;bStep.disabled=i>=LOOP_STEPS.length-1;}
    function step(){if(i>=LOOP_STEPS.length-1){stop();return;}let n=i+1;if(LOOP_STEPS[n].phase==='human')n++; /* human step only via its button */ if(n>LOOP_STEPS.length-1){stop();return;}show(n);}
    function stop(){clearInterval(timer);timer=null;bPlay.textContent='Play';}
    bStep.addEventListener('click',()=>{stop();step();});
    bPlay.addEventListener('click',()=>{if(timer){stop();return;}bPlay.textContent='Pause';timer=setInterval(step,2200);});
    bHuman.addEventListener('click',()=>{stop();show(LOOP_STEPS.findIndex(s=>s.phase==='human'));});
    bReset.addEventListener('click',()=>{stop();show(0);});
    show(0);
    return wrap;
  }

  /* ---------- Widget 2: the AI-native SDLC loop ---------- */
  const STAGES=[
    {name:'Plan',hint:'Capture intent — intent.md, the ticket contract'},
    {name:'Design',hint:'Requirements & design — the output template, the FIN ticket acceptance'},
    {name:'Build',hint:'CLAUDE.md, skills, subagents — your menu agent lives here'},
    {name:'Test',hint:'Feedback loop, evals — the checker and the evaluator subagent'},
    {name:'Deploy',hint:'Hooks, PR review, CI/CD — your first hook; MR review with repo-reviewer'},
    {name:'Maintain',hint:'Closing the loop — the handoff a fresh reader reproduces'}
  ];
  function sdlcLoop(){
    const wrap=h('section','widget widget-sdlc');wrap.setAttribute('aria-label','Traditional line versus AI-native loop');
    const row=h('div','sdlc-row');
    /* left: the line */
    const line=h('div','sdlc-line');line.append(h('p','sdlc-label','Traditional: the line'));
    STAGES.forEach((s,k)=>{const b=h('button','sdlc-stage',s.name);b.dataset.k=k;line.append(b);if(k<STAGES.length-1)line.append(h('span','sdlc-down','↓'));});
    line.append(h('p','sdlc-note','One slow loop back is a new release cycle.'));
    /* right: the loop */
    const loop=h('div','sdlc-loop');loop.append(h('p','sdlc-label','AI-native: the loop'));
    const svg=el('svg',{viewBox:'0 0 320 320',role:'img','aria-label':'Six stages in a circle around Claude with arrows cycling'});
    const ring=el('g',{class:'sdlc-ring'});
    for(let k=0;k<6;k++){const a=(k/6)*Math.PI*2-Math.PI/2;const a2=((k+1)/6)*Math.PI*2-Math.PI/2;const r=118;const x1=160+r*Math.cos(a+0.3),y1=160+r*Math.sin(a+0.3),x2=160+r*Math.cos(a2-0.3),y2=160+r*Math.sin(a2-0.3);ring.append(el('path',{class:'sdlc-arc',d:`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`,'marker-end':'url(#sdlc-head)'}));}
    const defs=el('defs');const m=el('marker',{id:'sdlc-head',viewBox:'0 0 10 10',refX:'8',refY:'5',markerWidth:'6',markerHeight:'6',orient:'auto'});m.append(el('path',{d:'M0 0 L10 5 L0 10 z',class:'sdlc-head'}));defs.append(m);svg.append(defs,ring);
    svg.append(el('circle',{class:'sdlc-core',cx:160,cy:160,r:56}));svg.append(el('text',{class:'sdlc-core-label',x:160,y:156,'text-anchor':'middle'},'agent'),el('text',{class:'sdlc-core-sub',x:160,y:176,'text-anchor':'middle'},'humans above the loop'));
    STAGES.forEach((s,k)=>{const a=(k/6)*Math.PI*2-Math.PI/2;const x=160+118*Math.cos(a),y=160+118*Math.sin(a);const g=el('g',{class:'sdlc-node','data-k':k});g.append(el("circle",{cx:x,cy:y,r:27}),el('text',{x,y:y+5,'text-anchor':'middle'},s.name));svg.append(g);});
    loop.append(svg,h('p','sdlc-note','Hours, not weeks, with humans instigating, directing, and governing.'));
    row.append(line,loop);wrap.append(row);
    /* before / after bars */
    const bars=h('div','sdlc-bars');const bTitle=h('p','sdlc-label','Before agents: every stage runs at human speed');const track=h('div','sdlc-track');
    const widths={before:[10,10,44,12,12,12],after:[10,10,4,12,12,12]};
    STAGES.forEach((s,k)=>{const seg=h('div','sdlc-seg'+(k===2?' build':''),s.name);seg.style.flex=String(widths.before[k]);seg.dataset.k=k;track.append(seg);});
    const reclaimed=h('div','sdlc-reclaimed','cycle time reclaimed');reclaimed.style.flex='0';track.append(reclaimed);
    const toggle=h('div','widget-controls');const bBefore=h('button',null,'Before agents');const bAfter=h('button','secondary','After agents');toggle.append(bBefore,bAfter);
    bars.append(bTitle,track,toggle);wrap.append(bars);
    function mode(after){bTitle.textContent=after?'After agents: build runs at agent speed — requirements, review and release stay human':'Before agents: every stage runs at human speed';track.querySelectorAll('.sdlc-seg').forEach(seg=>{seg.style.flex=String((after?widths.after:widths.before)[seg.dataset.k]);seg.textContent=after&&seg.dataset.k==='2'?'':STAGES[seg.dataset.k].name;});reclaimed.style.flex=after?'40':'0';reclaimed.classList.toggle('show',after);bBefore.className=after?'secondary':'';bAfter.className=after?'':'secondary';}
    bBefore.addEventListener('click',()=>mode(false));bAfter.addEventListener('click',()=>mode(true));
    /* stage hint */
    const hint=h('p','widget-caption sdlc-hint','Click a stage to see where the training exercises sit.');wrap.append(hint);
    function pick(k){wrap.querySelectorAll('[data-k]').forEach(n=>n.classList.toggle('active',n.dataset.k===String(k)));hint.textContent=STAGES[k].name+' · '+STAGES[k].hint;}
    wrap.querySelectorAll('.sdlc-stage,.sdlc-node').forEach(n=>{n.addEventListener('click',()=>pick(+n.dataset.k));if(n.tagName==='g'){n.setAttribute('tabindex','0');n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(+n.dataset.k);}});}});
    return wrap;
  }

  window.WIDGETS={'agentic-loop':agenticLoop,'sdlc-loop':sdlcLoop};
})();
