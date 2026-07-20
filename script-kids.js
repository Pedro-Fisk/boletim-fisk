/* Gerador de Boletim FISK — Kids e Teens. LOGO vem de logo.js (compartilhado com os outros geradores). */
const $=id=>document.getElementById(id);
$('brandLogo').src=LOGO;
attachDictation($('extraOtherMic'), $('extraOther'));

/* ===== Limpar campos (com confirmação) ===== */
$('clearBtn').onclick=()=>$('confirmClear').classList.add('open');
$('cancelClear').onclick=()=>$('confirmClear').classList.remove('open');
$('confirmClear').addEventListener('click',e=>{ if(e.target===$('confirmClear')) $('confirmClear').classList.remove('open'); });
$('confirmClearBtn').onclick=()=>{ clearAllFields(); $('confirmClear').classList.remove('open'); };
function clearAllFields(){
  $('s_name').value=''; $('s_level').value=''; $('extraOther').value='';
  $('dateMode').value='date'; $('weekPickers').style.display='none'; $('dateSpecific').style.display=''; $('dateSpecific').value='';
  $('perfExcelente').checked=false;
  document.querySelectorAll('#extraBoxes input:checked').forEach(i=>i.checked=false);
  medalSel={}; renderMedalBoxes();
  chosenScore=null; renderScale();
  loadedState=null;
  $('genStatus').textContent='';
  window.scrollTo(0,0);
  updateProgress();
  clearDraft();
  $('autosaveHint').textContent='';
}
let loadedState=null;

/* nome do professor lembrado no navegador (preenche sozinho nos próximos boletins) */
try{ const sp=localStorage.getItem('fisk_prof_name'); if(sp)$('s_teacher').value=sp; }catch(e){}
$('s_teacher').addEventListener('input',()=>{ try{ localStorage.setItem('fisk_prof_name',$('s_teacher').value); }catch(e){} updateProgress(); });
$('s_level').addEventListener('input',updateProgress);

/* ============ ESTÁGIOS (autocompletar) ============ */
const STAGES=[
  "Magic Way - Yellow Book",
  "Magic Way - Blue Book",
  "Magic Way - Red Book",
  "Magic Way - Green Book",
  "Playground Hello A",
  "Playground Hello B",
  "Playground Slide",
  "Playground See-Saw",
  "Playground Merry-go-round",
  "Playground Maze",
  "Fun At Home",
  "Fun At School",
  "Teens Connect 1",
  "Teens Connect 2",
  "Teens Connect 3",
  "Teens Connect 4",
  "Teens Elementary 1",
  "Teens Elementary 2"
];
$('stagesList').innerHTML=STAGES.map(s=>'<option value="'+s.replace(/"/g,'&quot;')+'">').join('');

/* ============ SELETOR DE DATA (calendário do ano vigente ou semana do mês) ============ */
const CUR_YEAR=new Date().getFullYear();
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
$('dateSpecific').min=CUR_YEAR+'-01-01';
$('dateSpecific').max=CUR_YEAR+'-12-31';
$('weekNum').innerHTML=['Semana 1','Semana 2','Semana 3','Semana 4','Semana 5'].map(w=>'<option>'+w+'</option>').join('');
$('weekMonth').innerHTML=MESES.map((m,i)=>'<option value="'+i+'">'+m+'</option>').join('');
$('weekMonth').value=new Date().getMonth();
$('dateMode').addEventListener('change',()=>{
  const wk=$('dateMode').value==='week';
  $('weekPickers').style.display=wk?'':'none';
  $('dateSpecific').style.display=wk?'none':'';
  updateProgress();
});
$('dateSpecific').addEventListener('input',updateProgress);
$('weekNum').addEventListener('change',updateProgress);
$('weekMonth').addEventListener('change',updateProgress);
function getDateString(){
  if($('dateMode').value==='week'){
    return $('weekNum').value+' de '+MESES[+$('weekMonth').value]+' de '+CUR_YEAR;
  }
  const v=$('dateSpecific').value; if(!v) return '';
  const p=v.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
}

/* ============ CRITÉRIOS (Bronze / Silver / Gold) ============ */
const CRITERIA=[
  {key:'listening', section:'🎧 Listening — Escuta e Compreensão', en:'Listens with understanding', pt:'Escuta e compreende o que é falado em inglês', ic:'🎧'},
  {key:'vocabulary', section:'📣 Speaking — Oralidade', en:'Shows growth in vocabulary', pt:'Apresenta evolução no vocabulário', tag:'vocabulário'},
  {key:'fluency', section:'📣 Speaking — Oralidade', en:'Can express himself/herself freely in English', pt:'Consegue se expressar livremente em inglês', tag:'fluência'},
  {key:'pronunciation', section:'📣 Speaking — Oralidade', en:'Participates in rhymes and songs', pt:'Participa de atividades com rimas e canções', tag:'pronúncia e entonação'},
  {key:'interaction', section:'❤️ Socialization — Socialização', en:'Interacts with classmates', pt:'Interage com colegas de sala'},
  {key:'behavior', section:'❤️ Socialization — Socialização', en:'Presents good behavior', pt:'Apresenta bom comportamento'},
  {key:'participation', section:'❤️ Socialization — Socialização', en:'Is interested and participative', pt:'É interessado(a) e participativo(a)'},
  {key:'dedication', section:'❤️ Socialization — Socialização', en:'Is dedicated to the proposed activities', pt:'Dedica-se às atividades propostas'},
  {key:'evolution', section:'⭐ General Evaluation — Avaliação Geral', en:'Evolves in his/her learning according to what is expected for his age group', pt:'Evolui em sua aprendizagem de acordo com o esperado para faixa etária'}
];
let medalSel={};
function renderMedalBoxes(){
  let html='', lastSection=null;
  CRITERIA.forEach(c=>{
    if(c.section!==lastSection){ html+=`<div class="rgh" style="margin-top:10px">${c.section}</div>`; lastSection=c.section; }
    html+=`<label class="fld" style="margin-top:10px">${c.pt}</label>
      <div class="pill-toggle" data-field="${c.key}">
        <button data-m="bronze" class="${medalSel[c.key]==='bronze'?'active':''}">Bronze</button>
        <button data-m="silver" class="${medalSel[c.key]==='silver'?'active':''}">Silver</button>
        <button data-m="gold" class="${medalSel[c.key]==='gold'?'active':''}">Gold</button>
      </div>`;
  });
  $('medalBoxes').innerHTML=html;
  $('medalBoxes').querySelectorAll('.pill-toggle').forEach(pt=>{
    const field=pt.dataset.field;
    pt.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const was=b.classList.contains('active');
      pt.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
      medalSel[field]= was?null:b.dataset.m;
      if(!was) b.classList.add('active');
      updateProgress();
    });
  });
}
renderMedalBoxes();
$('perfExcelente').addEventListener('change',()=>{
  const on=$('perfExcelente').checked;
  if(on){ CRITERIA.forEach(c=>{ medalSel[c.key]='gold'; }); chosenScore=10; renderScale(); $('genStatus').textContent=''; }
  renderMedalBoxes();
  updateProgress();
});

/* ============ BANCO DE FRASES DE COMENTÁRIO (escala 0 a 10) — adaptado ao universo infantil ============ */
/* {nome} vira o primeiro nome do aluno. Índice = nota da escala (10 = impecável ... 0 = precisa de muito suporte). */
const CMT=[
/*0*/ '{nome} está enfrentando bastante dificuldade nesta fase e precisa de apoio próximo da família. Pedimos que entrem em contato com a escola para conversarmos sobre como ajudá-lo(a) a se desenvolver. Estamos aqui para apoiar!',
/*1*/ '{nome} precisa de mais incentivo para participar das atividades em sala. Pedimos que a família reforce a prática em casa, com músicas e jogos em inglês. Vamos evoluir juntos!',
/*2*/ '{nome} ainda está se adaptando à rotina e ao contato com o inglês. Um pouco mais de estímulo em casa vai ajudar bastante nesta fase. Contem com a escola!',
/*3*/ '{nome} vem apresentando alguns desafios neste período. Reforçar a exposição ao inglês em casa, com desenhos e músicas, pode ajudar no desenvolvimento. Estamos juntos nessa!',
/*4*/ '{nome} está em processo de adaptação e mostra sinais de evolução. Com mais prática e estímulo, tende a ganhar ainda mais confiança. Vamos incentivá-lo(a)!',
/*5*/ '{nome} está se desenvolvendo dentro do esperado para a idade. Reforçar a prática em casa vai ajudar a ampliar ainda mais o vocabulário e a confiança. Continue incentivando!',
/*6*/ '{nome} vem evoluindo bem e mostra interesse crescente pelas atividades. Um pouco mais de prática vai consolidar ainda mais o aprendizado. Continue assim!',
/*7*/ '{nome} apresenta bom desenvolvimento linguístico e cognitivo para a idade, participando ativamente das atividades propostas. Com a prática constante, os resultados serão ainda melhores!',
/*8*/ '{nome} tem um ótimo desenvolvimento, com boa evolução no vocabulário e na compreensão do inglês, além de excelente convivência com os colegas. Parabéns!',
/*9*/ '{nome} apresenta excelente desenvolvimento linguístico e cognitivo, com grande interesse e participação nas atividades propostas. Parabéns pela dedicação!',
/*10*/ '{nome} teve um desempenho impecável neste período, com desenvolvimento exemplar da linguagem, do raciocínio e da socialização. Parabéns, continue brilhando!'
];
/* ============ FRASES ADICIONAIS SOBRE DESENVOLVIMENTO (opcional, some ao comentário) — edite à vontade ============ */
const EXTRA_PHRASES=[
  {key:'ling1', group:'Desenvolvimento linguístico', pt:'Está ampliando o vocabulário em inglês a cada aula.'},
  {key:'ling2', group:'Desenvolvimento linguístico', pt:'Demonstra ótima evolução na compreensão auditiva (listening).'},
  {key:'ling3', group:'Desenvolvimento linguístico', pt:'Reconhece e repete palavras e frases simples com facilidade.'},
  {key:'ling4', group:'Desenvolvimento linguístico', pt:'Está ganhando mais confiança para se expressar em inglês.'},
  {key:'ling5', group:'Desenvolvimento linguístico', pt:'Canta e participa das músicas e rimas com entusiasmo.'},
  {key:'cog1', group:'Desenvolvimento cognitivo e socioemocional', pt:'Demonstra boa concentração durante as atividades propostas.'},
  {key:'cog2', group:'Desenvolvimento cognitivo e socioemocional', pt:'Desenvolve o raciocínio lógico nas atividades em sala.'},
  {key:'cog3', group:'Desenvolvimento cognitivo e socioemocional', pt:'Reconhece cores, números e formas com facilidade.'},
  {key:'cog4', group:'Desenvolvimento cognitivo e socioemocional', pt:'Compartilha e interage bem com os colegas de turma.'},
  {key:'cog5', group:'Desenvolvimento cognitivo e socioemocional', pt:'Demonstra autonomia crescente na realização das tarefas.'},
  {key:'cog6', group:'Desenvolvimento cognitivo e socioemocional', pt:'Lida bem com as regras e a rotina da sala de aula.'},
  {key:'cog7', group:'Desenvolvimento cognitivo e socioemocional', pt:'Expressa suas emoções de forma cada vez mais clara.'}
];
let chosenScore=null;
function firstName(){const f=($('s_name').value||'').trim().split(/\s+/)[0];return f||'O(a) aluno(a)';}
function resolveCmt(i){return CMT[i].replace(/\{nome\}/g, firstName());}
function scoreColor(i){ if(i<=3)return '#d9544e'; if(i<=6)return '#e0a32e'; return '#3a9d5d'; }
function renderScale(){
  let html='';
  for(let i=10;i>=0;i--){
    html+=`<div class="cmt-opt ${chosenScore===i?'on':''}" data-i="${i}"><div class="sc" style="background:${scoreColor(i)}">${i}</div><div class="tx">${resolveCmt(i)}</div></div>`;
  }
  $('cmtScale').innerHTML=html;
  $('cmtScale').querySelectorAll('.cmt-opt').forEach(o=>o.onclick=()=>{
    chosenScore=+o.dataset.i;
    $('cmtScale').querySelectorAll('.cmt-opt').forEach(x=>x.classList.toggle('on',+x.dataset.i===chosenScore));
    $('genStatus').textContent='';
    updateProgress();
  });
}
renderScale();
$('s_name').addEventListener('input',renderScale); // atualiza o nome nas frases

/* checkboxes das frases adicionais, agrupadas por tipo de desenvolvimento */
(function(){
  let html='', lastGroup=null;
  EXTRA_PHRASES.forEach(p=>{
    if(p.group!==lastGroup){ html+=`<div class="rgh" style="margin-top:10px">${p.group}</div>`; lastGroup=p.group; }
    html+=`<label class="sugg-chk"><input type="checkbox" value="${p.key}"><span>${p.pt}</span></label>`;
  });
  $('extraBoxes').innerHTML=html;
})();
function selectedExtraPhrases(){return [...$('extraBoxes').querySelectorAll('input:checked')].map(i=>i.value);}
function buildObservations(){
  const parts=[resolveCmt(chosenScore)];
  selectedExtraPhrases().forEach(k=>{ const p=EXTRA_PHRASES.find(x=>x.key===k); if(p) parts.push(p.pt); });
  const other=($('extraOther').value||'').trim(); if(other) parts.push(other);
  return parts.join(' ');
}

/* ============ RENDER ============ */
let STATE=null;
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function medalBox(val){
  const mk=(v,cls)=>`<div class="kcell ${cls}"><div class="box ${val===v?'on':''}" data-val="${v}">${val===v?'✕':''}</div></div>`;
  return mk('bronze','cb-b')+mk('silver','cb-s')+mk('gold','cb-g');
}
function critRow(c){
  return `<div class="k-row"><div class="k-tag">${c.tag||''}</div><div class="k-txt"><b>${c.en}</b><i>${c.pt}</i></div>
    <div class="medcell" data-field="${c.key}">${medalBox(STATE.medals[c.key])}</div></div>`;
}

/* Ícones das seções em SVG inline: os emojis somem no PDF (html2canvas não
   desenha a fonte de emoji colorida), então a folha usa só SVG. */
const SECTION_SVG={
  '🎧 Listening — Escuta e Compreensão':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  '📣 Speaking — Oralidade':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3.5L9 7.8H5.5a3.2 3.2 0 0 0 0 6.4h.6l1.4 6h2.8l-1.3-5.7 11 4.3V3.5z"/></svg>',
  '❤️ Socialization — Socialização':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.7-9.2C.7 8.3 2.6 4.5 6.4 4.5c2 0 3.6 1.1 4.6 2.7 1-1.6 2.6-2.7 4.6-2.7 3.8 0 5.7 3.8 4.1 7.3C17.5 16.4 12 21 12 21z"/></svg>',
  '⭐ General Evaluation — Avaliação Geral':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8L12 2z"/></svg>'
};

/* Cubo 3D (isométrico) das colunas Bronze/Silver/Gold, como no PDF original */
function cubeSVG(kind){
  const c={bronze:['#e2a26b','#c8843c','#9c5f27'],silver:['#dfe3e6','#b3bbc1','#8f979d'],gold:['#eccb7c','#cfa03c','#a3761d']}[kind];
  return `<svg viewBox="0 0 24 24"><path d="M12 1.5 L21.5 6.75 L12 12 L2.5 6.75 Z" fill="${c[0]}"/><path d="M2.5 6.75 L12 12 L12 22.5 L2.5 17.25 Z" fill="${c[1]}"/><path d="M21.5 6.75 L12 12 L12 22.5 L21.5 17.25 Z" fill="${c[2]}"/></svg>`;
}

function renderReport(data){
  STATE=data;
  const s=data.student||{};
  let bySection={}, order=[];
  CRITERIA.forEach(c=>{ if(!bySection[c.section]){ bySection[c.section]=[]; order.push(c.section); } bySection[c.section].push(c); });
  const sectionsHtml=order.map(sec=>{
    const parts=sec.replace(/^\S+\s/,'').split(' — '); // ["Listening","Escuta e Compreensão"]
    return `<div class="k-band"><span class="k-bandcircle">${SECTION_SVG[sec]||''}</span><b>${parts[0].toUpperCase()}</b><i>&nbsp;– ${(parts[1]||'').toUpperCase()}</i></div>
      ${bySection[sec].map(critRow).join('')}`;
  }).join('');
  const sheet=`<div class="sheet sheet-kids2">
    <div class="k-head"><img src="${LOGO}" alt="FISK Taubaté · Caçapava">
      <div class="k-fields">
        <div class="hf"><label>Name:</label><div class="k-fill">${esc(s.name)}</div></div>
        <div class="hf"><label>Date:</label><div class="k-fill k-date">${esc(s.date)}</div><label>Teacher:</label><div class="k-fill">${esc(s.teacher)}</div></div>
        <div class="hf"><label>Estágio:</label><div class="k-fill">${esc(s.level)}</div></div>
      </div></div>
    <div class="k-main">
      <div class="k-top">
        <div class="k-titleblk">
          <h2>LEARNING PROGRESS REPORT</h2>
          <p>Relatório de Progresso de Aprendizagem</p>
          <div class="k-minileg">
            <span>${cubeSVG('bronze')}<b>BRONZE</b> — performance dentro do esperado</span>
            <span>${cubeSVG('silver')}<b>SILVER</b> — performance muito boa</span>
            <span>${cubeSVG('gold')}<b>GOLD</b> — performance excelente</span>
          </div>
        </div>
        <div class="k-colheads">
          <div class="kcell kch cb-b"><span class="kvw"><span class="kv">BRONZE</span></span>${cubeSVG('bronze')}</div>
          <div class="kcell kch cb-s"><span class="kvw"><span class="kv">SILVER</span></span>${cubeSVG('silver')}</div>
          <div class="kcell kch cb-g"><span class="kvw"><span class="kv">GOLD</span></span>${cubeSVG('gold')}</div>
        </div>
      </div>
      ${sectionsHtml}
    </div>
    <div class="k-obs">
      <div class="k-obs-title">OBSERVATIONS / COMMENTS</div>
      <div class="obs-wrap"><div class="obs-box" contenteditable="true" data-ph="Comentários do aluno" data-field="comment">${esc(data.comment)}</div><button type="button" class="mic-btn" title="Ditar por voz">🎙️</button></div>
    </div></div>`;
  $('sheetWrap').innerHTML=sheet;
  attachHandlers();
}

function attachHandlers(){
  document.querySelectorAll('#sheetWrap .obs-box').forEach(box=>box.addEventListener('input',()=>{STATE[box.dataset.field]=box.innerText;}));
  document.querySelectorAll('#sheetWrap .medcell').forEach(cell=>cell.querySelectorAll('.box').forEach(b=>b.addEventListener('click',()=>{
    const f=cell.dataset.field,val=b.dataset.val;const cur=STATE.medals[f];const nv=cur===val?null:val;STATE.medals[f]=nv;
    cell.querySelectorAll('.box').forEach(x=>{x.classList.toggle('on',x.dataset.val===nv);x.textContent=x.dataset.val===nv?'✕':'';});})));
  document.querySelectorAll('#sheetWrap .mic-btn').forEach(btn=>{
    const box=btn.closest('.obs-wrap').querySelector('.obs-box');
    attachDictation(btn, box, text=>{ STATE[box.dataset.field]=text; });
  });
}

/* ============ BARRA DE PROGRESSO ============ */
function medalsFilledCount(){ return CRITERIA.filter(c=>medalSel[c.key]).length; }
function updateProgress(){
  let pct=0;
  if(($('s_teacher').value||'').trim()) pct+=5;
  if(($('s_name').value||'').trim()) pct+=15;
  if(($('s_level').value||'').trim()) pct+=10;
  if(getDateString()) pct+=10;
  pct+=(medalsFilledCount()/CRITERIA.length)*35;
  if(chosenScore!==null) pct+=25;
  pct=Math.round(Math.max(0,Math.min(100,pct)));
  $('progressFill').style.width=pct+'%';
  $('progressPct').textContent=pct+'%';
  $('progressWrap').classList.toggle('done',pct>=100);
}
updateProgress();

/* ============ GENERATE ============ */
$('generate').onclick=()=>{
  if($('perfExcelente').checked) chosenScore=10;
  /* campos obrigatórios: aluno, professor(a), estágio, todas as medalhas e a frase de comentário */
  const missing=[];
  if(!($('s_name').value||'').trim()) missing.push('nome do aluno');
  if(!($('s_teacher').value||'').trim()) missing.push('nome do professor(a)');
  if(!($('s_level').value||'').trim()) missing.push('estágio');
  const semMedalha=CRITERIA.filter(c=>!medalSel[c.key]);
  if(semMedalha.length) missing.push('medalha em '+semMedalha.length+' critério(s)');
  if(chosenScore===null) missing.push('frase de comentário (0 a 10)');
  if(missing.length){ $('genStatus').textContent='⚠ Obrigatório: '+missing.join(' · ')+'.'; $('genStatus').className='status err'; return; }
  $('genStatus').textContent='';
  const medals={};
  CRITERIA.forEach(c=>{ medals[c.key]=medalSel[c.key]||null; });
  const data={
    student:{
      name:$('s_name').value||'',
      teacher:$('s_teacher').value||'',
      level:$('s_level').value||'',
      date:getDateString()
    },
    medals,
    comment: buildObservations()
  };
  renderReport(data);
  $('app').style.display='none';$('preview').style.display='block';window.scrollTo(0,0);
};
$('backBtn').onclick=()=>{$('preview').style.display='none';$('app').style.display='block';};

/* ============ EXPORT ============ */
function fileBase(){
  const nm=(STATE&&STATE.student&&STATE.student.name)?STATE.student.name.trim():'';
  const safe=(nm||'Aluno').replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim();
  return 'Report Card Kids - '+safe;
}

$('pdfBtn').onclick=async()=>{
  const btn=$('pdfBtn'); const label=btn.innerHTML;
  if(!window.PDFLib || !window.html2canvas){
    const t=document.title; document.title=fileBase(); window.print(); setTimeout(()=>{document.title=t;},1500); return;
  }
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Gerando PDF...';
  try{
    await generateEditablePDF();
  }catch(e){
    console.error('PDF editável falhou:',e);
    btn.innerHTML='<span class="spinner"></span> Abrindo impressão...';
    const t=document.title; document.title=fileBase(); window.print(); setTimeout(()=>{document.title=t;},1500);
  }finally{ btn.disabled=false; btn.innerHTML=label; }
};

async function generateEditablePDF(){
  const {PDFDocument, StandardFonts} = PDFLib;
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  const sheets=[...document.querySelectorAll('#sheetWrap .sheet')];
  let firstPage=null;
  for(const sheet of sheets){
    const mics=[...sheet.querySelectorAll('.mic-btn')];
    mics.forEach(m=>m.style.visibility='hidden');
    const canvas=await html2canvas(sheet,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
    mics.forEach(m=>m.style.visibility='');
    const png=await pdf.embedPng(canvas.toDataURL('image/png'));
    const srect=sheet.getBoundingClientRect();
    const pw=srect.width, ph=srect.height;
    const page=pdf.addPage([pw, ph]);
    if(!firstPage)firstPage=page;
    page.drawImage(png,{x:0,y:0,width:pw,height:ph});
  }
  try{
    const dataField=form.createTextField('__fiskdata__');
    dataField.setText(JSON.stringify(STATE));
    dataField.addToPage(firstPage,{x:0,y:0,width:1,height:1,borderWidth:0,font:helv});
    dataField.setFontSize(6);
    try{ dataField.updateAppearances(helv); }catch(e){}
    dataField.enableReadOnly();
  }catch(e){}
  const bytes=await pdf.save({updateFieldAppearances:false});
  const blob=new Blob([bytes],{type:'application/pdf'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fileBase()+'.pdf';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  clearDraft();
}

/* ============ AUTO-SAVE (rascunho local, salva por evento) ============ */
const DRAFT_KEY='fisk_draft_kids_v1';
const DRAFT_MAX_AGE_MS=24*60*60*1000; // ignora rascunhos com mais de 24h
const DRAFT_SAFETY_MS=120000;         // rede de segurança: força um save a cada 2min se algo ficou pendente
let draftDirty=false, draftSaveTimer=null;

function collectFormDraft(){
  return {
    stage:'form', savedAt:Date.now(), chosenScore, medalSel,
    fields:{
      s_teacher:$('s_teacher').value, s_name:$('s_name').value, s_level:$('s_level').value,
      extraOther:$('extraOther').value, perfExcelente:$('perfExcelente').checked,
      dateMode:$('dateMode').value, dateSpecific:$('dateSpecific').value,
      weekNum:$('weekNum').value, weekMonth:$('weekMonth').value,
      extras:selectedExtraPhrases()
    }
  };
}
function collectPreviewDraft(){ return {stage:'preview', savedAt:Date.now(), state:STATE}; }

function saveDraft(){
  try{
    const isPreview=$('preview').style.display==='block';
    const draft=isPreview?collectPreviewDraft():collectFormDraft();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    draftDirty=false;
    showAutosaveHint(draft.savedAt);
  }catch(e){ /* localStorage indisponível (modo privado, cota cheia etc.) — segue sem travar a página */ }
}
function scheduleSave(){
  draftDirty=true;
  clearTimeout(draftSaveTimer);
  draftSaveTimer=setTimeout(saveDraft, 1500); // salva ~1.5s após o usuário parar de digitar/clicar
}
setInterval(()=>{ if(draftDirty) saveDraft(); }, DRAFT_SAFETY_MS); // rede de segurança a cada 2min

['input','change','click'].forEach(evt=>{
  $('app').addEventListener(evt, scheduleSave);
  $('preview').addEventListener(evt, scheduleSave);
});

function showAutosaveHint(ts){
  const el=$('autosaveHint'); if(!el) return;
  const d=new Date(ts);
  el.textContent='💾 Rascunho salvo automaticamente às '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} draftDirty=false; }

function applyFormDraft(d){
  const f=d.fields||{};
  $('s_teacher').value=f.s_teacher||$('s_teacher').value;
  $('s_name').value=f.s_name||'';
  $('s_level').value=f.s_level||'';
  $('extraOther').value=f.extraOther||'';
  $('dateMode').value=f.dateMode||'date';
  $('dateMode').dispatchEvent(new Event('change'));
  $('dateSpecific').value=f.dateSpecific||'';
  if(f.weekNum) $('weekNum').value=f.weekNum;
  if(f.weekMonth) $('weekMonth').value=f.weekMonth;
  (f.extras||[]).forEach(k=>{ const cb=[...document.querySelectorAll('#extraBoxes input')].find(i=>i.value===k); if(cb) cb.checked=true; });
  $('perfExcelente').checked=!!f.perfExcelente;
  medalSel=d.medalSel||{}; renderMedalBoxes();
  chosenScore=(d.chosenScore===undefined)?null:d.chosenScore;
  renderScale();
  updateProgress();
}

function tryRestoreDraft(){
  let raw; try{ raw=localStorage.getItem(DRAFT_KEY); }catch(e){ return; }
  if(!raw) return;
  let d; try{ d=JSON.parse(raw); }catch(e){ clearDraft(); return; }
  if(!d || !d.savedAt || Date.now()-d.savedAt>DRAFT_MAX_AGE_MS){ clearDraft(); return; }
  const dt=new Date(d.savedAt);
  $('draftTime').textContent=String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
  $('draftModal').classList.add('open');
  $('draftRestoreBtn').onclick=()=>{
    if(d.stage==='preview' && d.state){
      renderReport(d.state);
      $('app').style.display='none'; $('preview').style.display='block';
    }else{
      applyFormDraft(d);
    }
    $('draftModal').classList.remove('open');
    showAutosaveHint(d.savedAt);
  };
  $('draftDiscardBtn').onclick=()=>{ clearDraft(); $('draftModal').classList.remove('open'); };
}
tryRestoreDraft();

/* avisa antes de fechar/recarregar a aba se houver dados preenchidos, para evitar perda por clique acidental */
function hasUnsavedWork(){
  if($('preview').style.display==='block') return true;
  return medalsFilledCount()>0 || !!($('s_name').value||'').trim() || !!($('s_level').value||'').trim() || chosenScore!==null;
}
fiskInitBeforeUnloadGuard(hasUnsavedWork);

/* ============ MODO ESCURO (só afeta a tela de preenchimento) ============ */
fiskInitThemeToggle('themeToggle');
