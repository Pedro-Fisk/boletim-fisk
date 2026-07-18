/* Gerador de Boletim FISK — Kids e Teens. LOGO vem de logo.js (compartilhado com os outros geradores). */
const $=id=>document.getElementById(id);
$('brandLogo').src=LOGO;

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

/* ============ NÍVEIS (autocompletar) — edite com os nomes reais dos níveis de Kids e Teens ============ */
const STAGES=["Nível 1","Nível 2","Nível 3","Nível 4","Nível 5","Nível 6"];
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
  const mk=v=>`<div class="box b-${v==='bronze'?'bronze':v==='silver'?'silver':'gold'} ${val===v?'on':''}" data-val="${v}">${val===v?'✕':''}</div>`;
  return mk('bronze')+mk('silver')+mk('gold');
}
function critRow(c){
  const tagCol = c.tag ? `<div class="tagw">${c.tag}</div>` : `<div class="ic">${c.ic||''}</div>`;
  return `<div class="crit-single ${c.tag?'tagged':''}">${tagCol}<div class="txt"><b>${c.en}</b><i>${c.pt}</i></div>
    <div class="medcell" data-field="${c.key}">${medalBox(STATE.medals[c.key])}</div></div>`;
}

function renderReport(data){
  STATE=data;
  const s=data.student||{};
  let bySection={}, order=[];
  CRITERIA.forEach(c=>{ if(!bySection[c.section]){ bySection[c.section]=[]; order.push(c.section); } bySection[c.section].push(c); });
  const sectionIcons={'🎧 Listening — Escuta e Compreensão':'🎧','📣 Speaking — Oralidade':'📣','❤️ Socialization — Socialização':'❤️','⭐ General Evaluation — Avaliação Geral':'⭐'};
  const sectionsHtml=order.map(sec=>{
    const title=sec.replace(/^\S+\s/,''); // remove o emoji do título, mantém no vtab
    return `<div class="rc-section"><div class="rc-vtab">${sectionIcons[sec]||''} ${title.split(' — ')[0].toUpperCase()}</div><div class="rc-body">
      ${bySection[sec].map(critRow).join('')}
    </div></div>`;
  }).join('');
  const sheet=`<div class="sheet">
    <div class="rc-frame rc-head"><img class="rc-logo-img" src="${LOGO}" alt="FISK">
      <div class="rc-head-fields">
        <div class="hf"><label>Name:</label><div class="rc-fill">${esc(s.name)}</div></div>
        <div class="hf"><label>Date:</label><div class="rc-fill rc-year">${esc(s.date)}</div><label>Teacher:</label><div class="rc-fill rc-teacher">${esc(s.teacher)}</div></div>
        <div class="hf"><label>Level / School Year:</label><div class="rc-fill">${esc(s.level)}</div></div>
      </div></div>
    <div class="rc-outer">
      <div class="rc-title"><h2>LEARNING PROGRESS REPORT</h2><p>Relatório de Progresso de Aprendizagem</p></div>
      <div class="medal-legend">
        <div class="med-icon med-b"><div class="dot"></div>BRONZE</div>
        <div class="med-icon med-s"><div class="dot"></div>SILVER</div>
        <div class="med-icon med-g"><div class="dot"></div>GOLD</div>
      </div>
      ${sectionsHtml}
      <div class="band" style="margin-top:14px">OBSERVATIONS / COMMENTS <i>– Observações / Comentários</i></div>
      <div class="obs-box" contenteditable="true" data-ph="Comentários do aluno" data-field="comment">${esc(data.comment)}</div>
      <div class="rc-footer-logo"><img src="${LOGO}" alt="FISK"></div>
    </div></div>`;
  $('sheetWrap').innerHTML=sheet;
  attachHandlers();
}

function attachHandlers(){
  document.querySelectorAll('#sheetWrap .obs-box').forEach(box=>box.addEventListener('input',()=>{STATE[box.dataset.field]=box.innerText;}));
  document.querySelectorAll('#sheetWrap .medcell').forEach(cell=>cell.querySelectorAll('.box').forEach(b=>b.addEventListener('click',()=>{
    const f=cell.dataset.field,val=b.dataset.val;const cur=STATE.medals[f];const nv=cur===val?null:val;STATE.medals[f]=nv;
    cell.querySelectorAll('.box').forEach(x=>{x.classList.toggle('on',x.dataset.val===nv);x.textContent=x.dataset.val===nv?'✕':'';});})));
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
  if(chosenScore===null){ $('genStatus').textContent='⚠ Escolha uma frase de comentário (0 a 10).'; $('genStatus').className='status err'; return; }
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
  const btn=$('pdfBtn'); const label=btn.textContent;
  if(!window.PDFLib || !window.html2canvas){
    const t=document.title; document.title=fileBase(); window.print(); setTimeout(()=>{document.title=t;},1500); return;
  }
  btn.disabled=true; btn.textContent='⏳ Gerando PDF...';
  try{
    await generateEditablePDF();
  }catch(e){
    console.error('PDF editável falhou:',e);
    btn.textContent='⏳ Abrindo impressão...';
    const t=document.title; document.title=fileBase(); window.print(); setTimeout(()=>{document.title=t;},1500);
  }finally{ btn.disabled=false; btn.textContent=label; }
};

async function generateEditablePDF(){
  const {PDFDocument, StandardFonts} = PDFLib;
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  const sheets=[...document.querySelectorAll('#sheetWrap .sheet')];
  let firstPage=null;
  for(const sheet of sheets){
    const canvas=await html2canvas(sheet,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
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
window.addEventListener('beforeunload', e=>{
  if(!hasUnsavedWork()) return;
  e.preventDefault();
  e.returnValue=''; // o texto é definido pelo próprio navegador, não é customizável
});

/* ============ MODO ESCURO (só afeta a tela de preenchimento) ============ */
function applyTheme(dark){
  document.body.classList.toggle('dark',dark);
  $('themeToggle').textContent=dark?'☀️ Modo claro':'🌙 Modo escuro';
}
function initTheme(){
  let saved=null; try{ saved=localStorage.getItem('fisk_theme'); }catch(e){}
  const dark = saved ? saved==='dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(dark);
}
$('themeToggle').onclick=()=>{
  const dark=!document.body.classList.contains('dark');
  applyTheme(dark);
  try{ localStorage.setItem('fisk_theme', dark?'dark':'light'); }catch(e){}
};
initTheme();
