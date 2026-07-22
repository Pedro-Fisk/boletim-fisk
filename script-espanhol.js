/* Gerador de Boletim FISK — Espanhol. LOGO vem de logo.js (compartilhado com script.js). */
const $=id=>document.getElementById(id);
$('brandLogo').src=LOGO;
attachDictation($('notesMic'), $('notes'));
attachDictation($('suggOtherMic'), $('suggOther'));
let period='1', loadedState=null;
// nome do professor lembrado no navegador (preenche sozinho nos próximos boletins)
try{ const sp=localStorage.getItem('fisk_prof_name'); if(sp)$('s_teacher').value=sp; }catch(e){}
$('s_teacher').addEventListener('input',()=>{ try{ localStorage.setItem('fisk_prof_name',$('s_teacher').value); }catch(e){} updateProgress(); });
$('s_level').addEventListener('input',updateProgress);

/* ===== Limpar campos (com confirmação) ===== */
$('clearBtn').onclick=()=>$('confirmClear').classList.add('open');
$('cancelClear').onclick=()=>$('confirmClear').classList.remove('open');
$('confirmClear').addEventListener('click',e=>{ if(e.target===$('confirmClear')) $('confirmClear').classList.remove('open'); });
$('confirmClearBtn').onclick=()=>{ clearAllFields(); $('confirmClear').classList.remove('open'); };
function clearAllFields(){
  $('s_name').value=''; $('s_level').value=''; $('notes').value=''; $('suggOther').value='';
  document.querySelectorAll('.rg-in').forEach(i=>{ i.value=''; i.disabled=false; });
  $('perfExcelente').checked=false;
  document.querySelectorAll('.rubric .rg-nt').forEach(el=>el.classList.remove('dim'));
  document.querySelectorAll('#suggBoxes input:checked').forEach(i=>i.checked=false);
  document.querySelectorAll('#periodToggle button').forEach(b=>b.classList.toggle('active',b.dataset.p==='1'));
  period='1';
  $('dateMode').value='date'; $('weekPickers').style.display='none'; $('dateSpecific').style.display=''; $('dateSpecific').value='';
  medalSel={escucha:null,comprende:null,gramatica:null}; renderMedalBoxes();
  chosenScore=null; renderScale();
  loadedState=null; $('loadStatus').innerHTML=''; try{ $('loadFile').value=''; }catch(e){}
  $('genStatus').textContent='';
  window.scrollTo(0,0);
  updateProgress();
  clearDraft();
  $('autosaveHint').textContent='';
}
document.querySelectorAll('#periodToggle button').forEach(b=>b.onclick=()=>{
  const was=b.classList.contains('active');
  document.querySelectorAll('#periodToggle button').forEach(x=>x.classList.remove('active'));
  if(was){ period=null; } else { b.classList.add('active'); period=b.dataset.p; }
});

/* ============ NIVEIS (autocompletar) ============ */
const STAGES=["Inmediato 1","Inmediato 2","Inmediato 3"];
/* preenche o autocompletar do nível */
$('stagesList').innerHTML=STAGES.map(s=>'<option value="'+s.replace(/"/g,'&quot;')+'">').join('');

/* ============ BANCO DE FRASES DE COMENTÁRIO (escala 0 a 10) — edite à vontade ============ */
/* {nome} vira o primeiro nome do aluno. Índice = nota da escala (10 = impecável ... 0 = precisa de muito suporte). */
const CMT=[
/*0*/ '{nome} precisa de bastante suporte neste momento. Pedimos que a família entre em contato com a escola o quanto antes para pensarmos juntos nos próximos passos. Conte com a escola nessa caminhada!',
/*1*/ '{nome} precisa de suporte adicional para acompanhar o curso. Pedimos que a família procure a escola para conversarmos sobre como apoiá-lo(a). Juntos, vamos ajudá-lo(a) a evoluir!',
/*2*/ '{nome} apresentou dificuldades significativas no acompanhamento do conteúdo. Recomendamos apoio próximo da família e presença constante nas aulas. Conte com a escola para atingir esses objetivos!',
/*3*/ '{nome} vem enfrentando dificuldades que merecem atenção. É importante reforçar os estudos em casa e manter a frequência às aulas. Estamos juntos nessa!',
/*4*/ '{nome} apresentou algumas dificuldades neste período, mas tem tudo para evoluir com apoio e prática mais regular. Contamos com o incentivo da família. Vamos em frente!',
/*5*/ '{nome} está dentro do esperado e com espaço para crescer. Reforçar a prática e a frequência vai trazer ainda mais confiança. Você é capaz, continue se dedicando!',
/*6*/ '{nome} teve um desempenho satisfatório e vem evoluindo bem. Um pouco mais de regularidade nos estudos ajudará a consolidar o aprendizado. Continue firme!',
/*7*/ '{nome} apresentou bom desempenho e evolução constante. Com a prática contínua, pode alcançar resultados ainda melhores. Parabéns pelo empenho!',
/*8*/ '{nome} teve um ótimo desempenho, com boa evolução e participação consistente ao longo do período. Segue muito bem no curso. Parabéns!',
/*9*/ '{nome} apresentou excelente desempenho e grande comprometimento, acompanhando o conteúdo com facilidade e participando ativamente das aulas. Parabéns pela dedicação!',
/*10*/ '{nome} teve um desempenho impecável neste período, com excelente domínio do conteúdo, dedicação exemplar e ótima convivência com a turma. Parabéns, continue assim!'
];
/* ============ SUGESTÕES DE MELHORIA (K a N) — edite à vontade ============ */
const SUGGESTIONS=[
  {key:'K', pt:'Vir ao centro de estudos'},
  {key:'L', pt:'Estudar mais em casa'},
  {key:'M', pt:'Praticar na plataforma online'},
  {key:'N', pt:'Fazer as tarefas de casa'}
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

/* limita as notas digitadas no guia a 0-10 na hora */
document.querySelectorAll('.rg-in').forEach(inp=>inp.addEventListener('input',()=>{
  const raw=(inp.value||'').replace(',','.'); if(raw==='')return; const n=+raw;
  if(!isNaN(n)&&(n>10||n<0)) inp.value=String(Math.max(0,Math.min(10,n))).replace('.',',');
  updateProgress();
}));

/* ============ USO DEL LENGUAJE (Bronce / Plata / Oro) ============ */
const MEDAL_FIELDS=[
  {key:'escucha', label:'Escucha con entendimiento'},
  {key:'comprende', label:'Comprende textos escritos en Español'},
  {key:'gramatica', label:'Utiliza gramática y estructuras españolas'}
];
let medalSel={escucha:null,comprende:null,gramatica:null};
function renderMedalBoxes(){
  $('medalBoxes').innerHTML=MEDAL_FIELDS.map(m=>`
    <label class="fld" style="margin-top:12px">${m.label}</label>
    <div class="pill-toggle" data-field="${m.key}">
      <button data-m="bronce" class="${medalSel[m.key]==='bronce'?'active':''}">Bronce</button>
      <button data-m="plata" class="${medalSel[m.key]==='plata'?'active':''}">Plata</button>
      <button data-m="oro" class="${medalSel[m.key]==='oro'?'active':''}">Oro</button>
    </div>`).join('');
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

/* Performance excelente: nota 10 em tudo exceto testes, Oro em tudo, e seleciona a frase 10 */
const NONTEST_FIELDS=['fluencia','expresividad','pronunciacion','vocabulario','comportamiento','social','tarea','cyber'];
$('perfExcelente').addEventListener('change',()=>{
  const on=$('perfExcelente').checked;
  document.querySelectorAll('.rubric .rg-nt').forEach(el=>el.classList.toggle('dim',on));
  // preenche (ou limpa) os campinhos dos critérios C a J com 10
  document.querySelectorAll('.rubric .rg-nt .rg-in').forEach(inp=>{ inp.value=on?'10':''; inp.disabled=on; });
  if(on){
    medalSel={escucha:'oro',comprende:'oro',gramatica:'oro'};
    chosenScore=10; renderScale(); $('genStatus').textContent='';
  }
  renderMedalBoxes();
  updateProgress();
});

/* checkboxes de sugestões de melhoria */
$('suggBoxes').innerHTML=SUGGESTIONS.map(s=>
  `<label class="sugg-chk"><input type="checkbox" value="${s.key}"><span>${s.pt}</span></label>`).join('');
function selectedSuggestions(){return [...$('suggBoxes').querySelectorAll('input:checked')].map(i=>i.value);}

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
});
function getDateString(){
  if($('dateMode').value==='week'){
    return $('weekNum').value+' de '+MESES[+$('weekMonth').value]+' de '+CUR_YEAR;
  }
  const v=$('dateSpecific').value; if(!v) return '';
  const p=v.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
}

/* ============ LEITURA DAS NOTAS (offline, escala 0 a 10, tolerante a erros de ortografia) ============ */
/* palavras-chave já normalizadas (minúsculas, sem acento) para comparação aproximada */
const FIELD_WORDS={
  listeningTest:['escucha','listening','auditiva','comprension'],
  writtenTest:['escrita','written','writing','escrito'],
  fluencia:['fluencia','fluency','fluidez'],
  expresividad:['expresividad','expressividade','expresivo'],
  pronunciacion:['pronunciacion','pronunciation','entonacion'],
  vocabulario:['vocabulario','vocabulary'],
  comportamiento:['comportamiento','comportamento','conducta'],
  social:['social','participativo','participa','interesado','interes'],
  tarea:['tarea','tareas','dedicacion','actividades','deberes'],
  cyber:['cyber','plataforma','online','linea']
};
function normalize(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function lev(a,b){
  const m=a.length,n=b.length; if(!m)return n; if(!n)return m;
  let prev=Array.from({length:n+1},(_,i)=>i), cur=new Array(n+1);
  for(let i=1;i<=m;i++){
    cur[0]=i;
    for(let j=1;j<=n;j++){
      const cost=a[i-1]===b[j-1]?0:1;
      cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost);
    }
    [prev,cur]=[cur,prev];
  }
  return prev[n];
}
/* converte números por extenso em algarismos (para funcionar com o ditado do computador) */
const NUMW={zero:0,um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
function wordsToNumbers(t){
  const w='(zero|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)';
  t=t.replace(new RegExp(w+'\\s+(?:virgula|ponto)\\s+'+w,'g'),(m,a,b)=>NUMW[a]+'.'+NUMW[b]); // "sete virgula cinco" -> 7.5
  t=t.replace(new RegExp(w+'\\s+(?:e\\s+)?mei[oa]','g'),(m,a)=>NUMW[a]+'.5');                  // "oito e meio" / "oito meio" -> 8.5
  t=t.replace(new RegExp('\\b'+w+'\\b','g'),(m,a)=>NUMW[a]);                                   // "sete" -> 7
  t=t.replace(/(\d+)\s+(?:e\s+)?mei[oa]/g,(m,a)=>a+'.5');                                       // "8 e meio" -> 8.5
  return t;
}
/* para cada número no texto, acha o critério mais próximo antes dele (tolerante a typos e a palavras entre eles) */
function bestFieldFor(word){
  let bf=null,bd=1e9;
  for(const f in FIELD_WORDS){ for(const kw of FIELD_WORDS[f]){ const dd=lev(word,kw); if(dd<bd){bd=dd;bf=f;} } }
  const maxD=word.length<=4?1:(word.length<=7?2:3);
  return (bf && bd<=maxD)?{field:bf,dist:bd}:null;
}
function parseNotes(raw){
  const out={}, bestDist={};
  const text=wordsToNumbers(normalize(raw));
  const numRe=/(-?\d+(?:[.,]\d+)?)/g;
  let m;
  while((m=numRe.exec(text))!==null){
    const val=parseFloat(m[1].replace(',','.'));
    const before=text.slice(Math.max(0,m.index-30), m.index); // janela antes do número
    const words=before.match(/[a-z]{3,}/g)||[];
    let hit=null;
    for(let i=words.length-1;i>=0;i--){ const r=bestFieldFor(words[i]); if(r){ hit=r; break; } } // a mais próxima vence
    if(hit && (bestDist[hit.field]===undefined || hit.dist<bestDist[hit.field])){ out[hit.field]=clampGrade(val); bestDist[hit.field]=hit.dist; }
  }
  return out;
}

/* ============ CÁLCULOS (médias proporcionais, escala 0 a 10) ============ */
const num=v=>(v===null||v===undefined||v==='')?null:(isNaN(+v)?null:+v);
const fmt=v=>v===null?'':(+v).toFixed(1).replace('.',',');
/* limita qualquer nota a 0-10 */
function clampGrade(v){ if(v===null||v===undefined||v==='')return null; const n=+String(v).replace(',','.'); if(isNaN(n))return null; return Math.max(0,Math.min(10,n)); }
function caretEnd(el){ try{ const r=document.createRange(); r.selectNodeContents(el); r.collapse(false); const s=window.getSelection(); s.removeAllRanges(); s.addRange(r);}catch(e){} }
function avg(arr){const a=arr.map(num).filter(x=>x!==null);if(!a.length)return null;return a.reduce((s,x)=>s+x,0)/a.length;}
function oralResult(p){return avg([p.fluencia,p.expresividad,p.pronunciacion,p.vocabulario]);}
function partResult(p){return avg([p.comportamiento,p.social,p.tarea,p.cyber]);}
function finalGrade(p){return avg([num(p.listeningTest),num(p.writtenTest),oralResult(p),partResult(p)]);}

/* ============ RENDER ============ */
let STATE=null;
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function suggList(p){
  const sel=(p.suggestions||[]);
  let items=sel.map(k=>{const s=SUGGESTIONS.find(x=>x.key===k);return s?`<div class="sugg-item">✓ ${esc(s.pt)}</div>`:'';}).join('');
  if(p.suggestionsOther && p.suggestionsOther.trim()) items+=`<div class="sugg-item">✓ ${esc(p.suggestionsOther.trim())}</div>`;
  return items || '<div class="sugg-empty">—</div>';
}
function gradeCell(pk,f,l,v){return `<div class="gradecell"><div class="lab">${l} (0-10)</div><div class="gval" contenteditable="true" data-pkey="${pk}" data-field="${f}" data-kind="grade">${v===null||v===undefined?'':fmt(v)}</div></div>`;}
function testCell(pk,f,v){return `<div class="testbox"><div class="tval" contenteditable="true" data-pkey="${pk}" data-field="${f}" data-kind="grade">${v===null||v===undefined?'':fmt(v)}</div></div>`;}
function critRow(ic,es,pt,fk,l,p1,p2){return `<div class="crit"><div class="ic">${ic}</div><div class="txt"><b>${es}</b><i>${pt}</i></div>${gradeCell('p1',fk,l,num(p1[fk]))}${gradeCell('p2',fk,l,num(p2[fk]))}</div>`;}
function medalBox(val){
  const mk=v=>`<div class="box b-${v==='bronce'?'bronze':v==='plata'?'silver':'gold'} ${val===v?'on':''}" data-val="${v}">${val===v?'✕':''}</div>`;
  return mk('bronce')+mk('plata')+mk('oro');
}
function medalRow(ic,es,pt,fk,p1,p2){return `<div class="crit"><div class="ic">${ic}</div><div class="txt"><b>${es}</b><i>${pt}</i></div>
  <div class="medcell" data-pkey="p1" data-field="${fk}">${medalBox(p1[fk])}</div>
  <div class="medcell" data-pkey="p2" data-field="${fk}">${medalBox(p2[fk])}</div></div>`;}
function medalHead(){return `<div class="medhead2"><div></div>
  <div class="medset"><span class="med-b">BRONCE</span><span class="med-s">PLATA</span><span class="med-g">ORO</span></div>
  <div class="medset"><span class="med-b">BRONCE</span><span class="med-s">PLATA</span><span class="med-g">ORO</span></div></div>`;}
function finalCol(lbl,pk,p){return `<div class="final-box"><div class="fh"><div class="n">${lbl}<br>Prueba</div><div class="rc-datebox" style="flex:1">Fecha: <span class="dval">${esc(p.date)}</span></div></div>
  <div class="final-line"><label>Prueba de Escucha</label><div class="v" id="fl-${pk}-list">${fmt(num(p.listeningTest))}</div></div>
  <div class="final-line"><label>Prueba Escrita</label><div class="v" id="fl-${pk}-wri">${fmt(num(p.writtenTest))}</div></div>
  <div class="final-line"><label>Actuación Oral</label><div class="v" id="fl-${pk}-oral">${fmt(oralResult(p))}</div></div>
  <div class="final-line"><label>Participación</label><div class="v" id="fl-${pk}-part">${fmt(partResult(p))}</div></div>
  <div class="final-grade"><label>NOTA FINAL</label><div class="v" id="fl-${pk}-final">${fmt(finalGrade(p))}</div></div></div>`;}

/* Ícones dos critérios em SVG inline: os emojis somem no PDF (html2canvas
   não desenha a fonte de emoji colorida). */
const IC={
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2V5z"/><path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2V5z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8L12 2z"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.2V21h3.8L17.8 10 14 6.2 3 17.2zM20.7 7.1a1 1 0 0 0 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8 1.8-1.8z"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.7-9.2C.7 8.3 2.6 4.5 6.4 4.5c2 0 3.6 1.1 4.6 2.7 1-1.6 2.6-2.7 4.6-2.7 3.8 0 5.7 3.8 4.1 7.3C17.5 16.4 12 21 12 21z"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
  screen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>',
  headphones:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>'
};

/* Ajusta o tamanho da fonte das abas verticais para caber na altura da
   seção (e, em último caso, dá uma altura mínima ao corpo da seção). */
function fitVtabs(){
  document.querySelectorAll('#sheetWrap .rc-section').forEach(sec=>{
    const body=sec.querySelector('.rc-body'), vt=sec.querySelector('.rc-vtab .vt');
    if(!vt||!body) return;
    const avail=body.offsetHeight-14;
    let fs=12.5;
    vt.style.fontSize=fs+'px';
    let w=vt.offsetWidth;
    if(w>avail){ fs=Math.max(8.5, fs*avail/w); vt.style.fontSize=fs+'px'; w=vt.offsetWidth; }
    if(w>avail){ body.style.minHeight=(w+18)+'px'; }
  });
}

function renderReport(data){
  STATE=data;
  const s=data.student||{},p1=data.p1||{},p2=data.p2||{};
  const page1=`<div class="sheet sheet-themed sheet-es">
    <div class="rc-frame rc-head"><img class="rc-logo-img" src="${LOGO}" alt="FISK">
      <div class="rc-head-fields">
        <div class="hf"><label>Nombre:</label><div class="rc-fill">${esc(s.name)}</div></div>
        <div class="hf"><label>Año:</label><div class="rc-fill rc-year">${esc(s.year)}</div><label>Profesor:</label><div class="rc-fill rc-teacher">${esc(s.teacher)}</div></div>
        <div class="hf"><label>Nivel:</label><div class="rc-fill">${esc(s.level)}</div></div>
      </div></div>
    <div class="rc-outer">
      <div class="rc-title"><h2>INFORME DE PROGRESO DE APRENDIZAJE</h2><p>Relatório de Progresso de Aprendizagem</p></div>
      <div class="rc-datehead"><div class="rc-datebox">Fecha: <span class="dval">${esc(p1.date)}</span></div><div class="rc-datebox">Fecha: <span class="dval">${esc(p2.date)}</span></div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">PRUEBAS</span></div><div class="rc-body">
        <div class="testrow"><div class="txt"><b>Prueba de Comprensión Auditiva</b><i>Prova de compreensão auditiva</i></div>${testCell('p1','listeningTest',num(p1.listeningTest))}${testCell('p2','listeningTest',num(p2.listeningTest))}</div>
        <div class="testrow"><div class="txt"><b>Prueba escrita</b><i>Prova de leitura e escrita</i></div>${testCell('p1','writtenTest',num(p1.writtenTest))}${testCell('p2','writtenTest',num(p2.writtenTest))}</div>
      </div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">RENDIMIENTO ORAL</span></div><div class="rc-body">
        ${critRow(IC.chat,'Puede expresarse correctamente en español','Consegue se expressar adequadamente em Espanhol','fluencia','fluencia',p1,p2)}
        ${critRow(IC.target,'Muestra habilidades orales esperadas al nivel','Produz oralmente de acordo com o nível','expresividad','expresividad',p1,p2)}
        ${critRow(IC.sound,'Tiene pronunciación y entonación adecuadas','Tem pronúncia e entonação adequadas','pronunciacion','pronunciación',p1,p2)}
        ${critRow(IC.book,'Muestra progreso en el uso del vocabulario','Mostra crescimento de uso de vocabulário','vocabulario','vocabulario',p1,p2)}
        <div class="results-row"><div class="results-lab">Resultados <span style="font-size:11px;font-weight:600">(média)</span></div><div class="results-val" id="oral-p1">${fmt(oralResult(p1))}</div><div class="results-val" id="oral-p2">${fmt(oralResult(p2))}</div></div>
      </div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">PARTICIPACIÓN</span></div><div class="rc-body">
        ${critRow(IC.heart,'Presenta buen comportamiento','Apresenta bom comportamento','comportamiento','comportamiento',p1,p2)}
        ${critRow(IC.star,'Es interesado y participativo','É interessado(a) e participativo(a)','social','social',p1,p2)}
        ${critRow(IC.pencil,'Se dedica a las actividades propuestas','Dedica-se às atividades propostas','tarea','tarea',p1,p2)}
        ${critRow(IC.screen,'Utiliza las plataformas en línea para estudiar','Usa as plataformas online para estudar','cyber','cyber',p1,p2)}
        <div class="results-row"><div class="results-lab">Resultados <span style="font-size:11px;font-weight:600">(média)</span></div><div class="results-val" id="part-p1">${fmt(partResult(p1))}</div><div class="results-val" id="part-p2">${fmt(partResult(p2))}</div></div>
      </div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">USO DEL LENGUAJE</span></div><div class="rc-body">
        ${medalHead()}
        ${medalRow(IC.headphones,'Escucha con entendimiento','Escuta e compreende o que é falado em espanhol','escucha',p1,p2)}
        ${medalRow(IC.book,'Comprende textos escritos en Español','Lê e compreende a leitura em espanhol','comprende',p1,p2)}
        ${medalRow(IC.check,'Utiliza gramática y estructuras españolas','Usa corretamente as estruturas do idioma','gramatica',p1,p2)}
      </div></div>
    </div></div>`;
  const page2=`<div class="sheet sheet-themed sheet-es"><div class="rc-outer">
      <div class="band">RESULTADOS FINALES <i>– Resultados Finais</i></div>
      <div class="final-cols">${finalCol('1ª','p1',p1)}${finalCol('2ª','p2',p2)}</div>

      <div class="band" style="margin-top:14px">SUGERENCIAS DE MEJORA <i>– Sugestões de Melhoria</i></div>
      <div class="obs-cols" style="margin-top:0">
        <div class="sugg-box">${suggList(p1)}</div>
        <div class="sugg-box">${suggList(p2)}</div>
      </div>

      <div class="band" style="margin-top:14px">OBSERVACIONES / COMENTARIOS <i>– Observações / Comentários</i></div>
      <div class="obs-cols">
        <div class="obs-wrap"><div class="obs-box" contenteditable="true" data-ph="Comentários da 1ª avaliação" data-pkey="p1" data-field="comment">${esc(p1.comment)}</div><button type="button" class="mic-btn" title="Ditar por voz">🎙️</button></div>
        <div class="obs-wrap"><div class="obs-box" contenteditable="true" data-ph="Comentários da 2ª avaliação" data-pkey="p2" data-field="comment">${esc(p2.comment)}</div><button type="button" class="mic-btn" title="Ditar por voz">🎙️</button></div>
      </div>
      <div class="band" style="margin-bottom:6px">FIRMA DE LOS PADRES <i>– Assinatura do Responsável</i></div>
      <div class="sign-cols"><div class="sign-line">&nbsp;</div><div class="sign-line">&nbsp;</div></div>
      <div class="rc-footer-logo"><img src="${LOGO}" alt="FISK"></div>
    </div></div>`;
  $('sheetWrap').innerHTML=page1+page2;
  attachHandlers();
  fitVtabs();
}

function attachHandlers(){
  document.querySelectorAll('#sheetWrap [data-kind="grade"]').forEach(el=>el.addEventListener('input',()=>{
    const pk=el.dataset.pkey,f=el.dataset.field;const raw=(el.textContent||'').trim();
    if(raw===''){ STATE[pk][f]=null; recalc(); return; }
    const n=+raw.replace(',','.');
    if(isNaN(n)){ STATE[pk][f]=raw; recalc(); return; }
    const c=Math.max(0,Math.min(10,n)); STATE[pk][f]=c;
    if(c!==n){ el.textContent=fmt(c); caretEnd(el); } // limita a 0-10 na hora
    recalc();
  }));
  document.querySelectorAll('#sheetWrap [data-kind="text"]').forEach(el=>el.addEventListener('input',()=>{
    STATE[el.dataset.pkey][el.dataset.field]=(el.textContent||'').trim();
  }));
  document.querySelectorAll('#sheetWrap .obs-box').forEach(box=>box.addEventListener('input',()=>{STATE[box.dataset.pkey][box.dataset.field]=box.innerText;}));
  document.querySelectorAll('#sheetWrap .medcell').forEach(cell=>cell.querySelectorAll('.box').forEach(b=>b.addEventListener('click',()=>{
    const pk=cell.dataset.pkey,f=cell.dataset.field,val=b.dataset.val;const cur=STATE[pk][f];const nv=cur===val?null:val;STATE[pk][f]=nv;
    cell.querySelectorAll('.box').forEach(x=>{x.classList.toggle('on',x.dataset.val===nv);x.textContent=x.dataset.val===nv?'✕':'';});})));
  document.querySelectorAll('#sheetWrap .mic-btn').forEach(btn=>{
    const box=btn.closest('.obs-wrap').querySelector('.obs-box');
    attachDictation(btn, box, text=>{ STATE[box.dataset.pkey][box.dataset.field]=text; });
  });
}
function recalc(){['p1','p2'].forEach(pk=>{const p=STATE[pk];
  setTxt('oral-'+pk,fmt(oralResult(p)));setTxt('part-'+pk,fmt(partResult(p)));
  setTxt('fl-'+pk+'-list',fmt(num(p.listeningTest)));setTxt('fl-'+pk+'-wri',fmt(num(p.writtenTest)));
  setTxt('fl-'+pk+'-oral',fmt(oralResult(p)));setTxt('fl-'+pk+'-part',fmt(partResult(p)));setTxt('fl-'+pk+'-final',fmt(finalGrade(p)));});}
function setTxt(id,v){const el=$(id);if(el)el.textContent=v;}

/* ============ CARREGAR A 1ª AVALIAÇÃO (upload do PDF do boletim) ============ */
const GRADE_FIELDS=['fluencia','expresividad','pronunciacion','vocabulario','comportamiento','social','tarea','cyber','listeningTest','writtenTest'];
const ALL_GRADABLE=GRADE_FIELDS.concat(['escucha','comprende','gramatica']);

/* ============ BARRA DE PROGRESSO ============ */
function gradesFilledCount(){
  const filled=new Set();
  document.querySelectorAll('.rg-in').forEach(inp=>{ if((inp.value||'').trim()!=='') filled.add(inp.dataset.field); });
  const fromNotes=parseNotes($('notes').value||'');
  GRADE_FIELDS.forEach(f=>{ if(fromNotes[f]!=null) filled.add(f); });
  ['escucha','comprende','gramatica'].forEach(f=>{ if(medalSel[f]) filled.add(f); });
  return filled.size;
}
function updateProgress(){
  let pct=0;
  if(($('s_teacher').value||'').trim()) pct+=5;
  if(($('s_name').value||'').trim()) pct+=15;
  if(($('s_level').value||'').trim()) pct+=10;
  pct+=(gradesFilledCount()/ALL_GRADABLE.length)*45;
  if(chosenScore!==null) pct+=25;
  pct=Math.round(Math.max(0,Math.min(100,pct)));
  $('progressFill').style.width=pct+'%';
  $('progressPct').textContent=pct+'%';
  $('progressWrap').classList.toggle('done',pct>=100);
}
$('notes').addEventListener('input',updateProgress);
updateProgress();
function setLoadStatus(html,color){ $('loadStatus').innerHTML='<span style="color:'+(color||'#5a6b74')+';font-weight:700">'+html+'</span>'; }
function applyLoaded(msg){
  const s=(loadedState&&loadedState.student)||{};
  $('s_name').value=s.name||''; $('s_level').value=s.level||'';
  document.querySelectorAll('#periodToggle button').forEach(x=>x.classList.toggle('active',x.dataset.p==='2'));
  period='2';
  setLoadStatus('✓ '+(msg||('Boletim de '+(s.name||'aluno')+' carregado.'))+' Preencha a 2ª avaliação.','#1e8f4e');
  updateProgress();
}

$('loadFile').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f)return;
  const nm=(f.name||'').toLowerCase();
  try{
    if(nm.endsWith('.fiskjson')||nm.endsWith('.json')){
      loadedState=JSON.parse(await f.text()); applyLoaded('Arquivo carregado.'); return;
    }
    // PDF
    setLoadStatus('Lendo o PDF...','#0e7fb5');
    const buf=await f.arrayBuffer();
    const res=await loadFromPDF(buf);
    if(res){ loadedState=res.state; applyLoaded('Dados lidos do PDF ('+res.method+').'); return; }
    setLoadStatus('Não consegui ler dados embutidos neste PDF. Tente o arquivo gerado por esta ferramenta, ou digite as notas manualmente.','#c0392b');
  }catch(err){
    setLoadStatus('Não consegui ler este arquivo ('+err.message+'). Tente o PDF gerado por esta ferramenta.','#c0392b');
  }
});

/* lê dados embutidos + campos de formulário do PDF (respeita edições feitas no PDF) */
async function loadFromPDF(buf){
  if(!window.PDFLib) throw new Error('biblioteca de PDF não carregou');
  const pdf=await PDFLib.PDFDocument.load(buf,{ignoreEncryption:true});
  let form; try{ form=pdf.getForm(); }catch(e){ return null; }
  const byName={};
  (form.getFields()||[]).forEach(fl=>{ try{ byName[fl.getName()]=fl; }catch(e){} });
  let state=null;
  if(byName['__fiskdata__'] && byName['__fiskdata__'].getText){
    try{ const t=byName['__fiskdata__'].getText(); if(t) state=JSON.parse(t); }catch(e){}
  }
  const hasGrades=Object.keys(byName).some(n=>n.indexOf('g__')===0);
  if(!state && !hasGrades) return null;
  state=state||{student:{},p1:{},p2:{}};
  state.p1=state.p1||{}; state.p2=state.p2||{};
  const readNum=n=>{ const fl=byName[n]; if(!fl||!fl.getText) return undefined; const t=(fl.getText()||'').trim().replace(',','.'); if(t==='')return undefined; const v=+t; return isNaN(v)?undefined:v; };
  ['p1','p2'].forEach(pk=>GRADE_FIELDS.forEach(fld=>{ const v=readNum('g__'+pk+'__'+fld); if(v!==undefined) state[pk][fld]=v; }));
  return {state, method: state.p1.comment!==undefined?'dados embutidos':'campos do formulário'};
}

/* ============ GENERATE ============ */
const GRADE_LABELS={listeningTest:'A escucha',writtenTest:'B escrita',fluencia:'C fluencia',expresividad:'D expresividad',pronunciacion:'E pronunciación',vocabulario:'F vocabulario',comportamiento:'G comportamiento',social:'H social',tarea:'I tarea',cyber:'J cyber'};
$('generate').onclick=()=>{
  if($('perfExcelente').checked) chosenScore=10;
  const base = loadedState ? JSON.parse(JSON.stringify(loadedState)) : {student:{},p1:{},p2:{}};
  base.student=base.student||{};
  base.student.name=$('s_name').value||base.student.name||'';
  base.student.teacher=$('s_teacher').value||base.student.teacher||'';
  base.student.year=base.student.year||'';
  base.student.level=$('s_level').value||base.student.level||'';
  base.p1=base.p1||{}; base.p2=base.p2||{};
  const pk=period==='2'?'p2':'p1';
  Object.assign(base[pk], parseNotes($('notes').value));
  // notas digitadas direto no guia têm prioridade sobre o texto livre
  document.querySelectorAll('.rg-in').forEach(inp=>{
    const raw=(inp.value||'').trim().replace(',','.'); if(raw==='')return;
    const v=+raw; if(!isNaN(v)) base[pk][inp.dataset.field]=Math.max(0,Math.min(10,v));
  });
  if($('perfExcelente').checked){ NONTEST_FIELDS.forEach(f=>{ base[pk][f]=10; }); }
  /* campos obrigatórios: aluno, professor(a), nivel, todas as notas e a frase de comentário */
  const missing=[];
  if(!(base.student.name||'').trim()) missing.push('nome do aluno');
  if(!(base.student.teacher||'').trim()) missing.push('nome do professor(a)');
  if(!(base.student.level||'').trim()) missing.push('nivel');
  const semNota=GRADE_FIELDS.filter(f=>base[pk][f]==null||base[pk][f]==='');
  if(semNota.length) missing.push('notas pendentes ('+semNota.map(f=>GRADE_LABELS[f]).join(', ')+')');
  if(chosenScore===null) missing.push('frase de comentário (0 a 10)');
  if(missing.length){ $('genStatus').textContent='⚠ Obrigatório: '+missing.join(' · ')+'.'; $('genStatus').className='status err'; return; }
  const comment=resolveCmt(chosenScore);
  $('genStatus').textContent='';
  base[pk].escucha=medalSel.escucha; base[pk].comprende=medalSel.comprende; base[pk].gramatica=medalSel.gramatica;
  base[pk].comment=comment;
  base[pk].suggestions=selectedSuggestions();
  base[pk].suggestionsOther=$('suggOther').value;
  const ds=getDateString(); if(ds) base[pk].date=ds;
  renderReport(base);
  $('app').style.display='none';$('preview').style.display='block';window.scrollTo(0,0);
};
$('backBtn').onclick=()=>{$('preview').style.display='none';$('app').style.display='block';};

/* ============ EXPORT ============ */
function fileBase(){
  const nm=(STATE&&STATE.student&&STATE.student.name)?STATE.student.name.trim():'';
  const safe=(nm||'Aluno').replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim();
  return 'Report Card Espanhol - '+safe;
}
/* seletor de todas as células de nota que viram campos editáveis no PDF */
const EDIT_SELECTOR='.gval,.tval,.results-val,.final-line .v,.final-grade .v';

$('pdfBtn').onclick=async()=>{
  const btn=$('pdfBtn'); const label=btn.innerHTML;
  if(!window.PDFLib || !window.html2canvas){
    // fallback: impressão comum se as bibliotecas não carregaram
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
  const {PDFDocument, StandardFonts, TextAlignment} = PDFLib;
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();
  const sheets=[...document.querySelectorAll('#sheetWrap .sheet')];
  let idx=0, firstPage=null;
  function fieldName(c){
    // notas individuais e de teste recebem nome semântico (g__p1__fluencia); demais são calculadas (c__id)
    if((c.classList.contains('gval')||c.classList.contains('tval')) && c.dataset.pkey && c.dataset.field){
      return 'g__'+c.dataset.pkey+'__'+c.dataset.field;
    }
    return 'c__'+(c.id||('x'+(idx++)));
  }
  for(const sheet of sheets){
    const cells=[...sheet.querySelectorAll(EDIT_SELECTOR)];
    const mics=[...sheet.querySelectorAll('.mic-btn')];
    cells.forEach(c=>c.classList.add('capture-hide'));
    mics.forEach(m=>m.style.visibility='hidden');
    const canvas=await html2canvas(sheet,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false});
    cells.forEach(c=>c.classList.remove('capture-hide'));
    mics.forEach(m=>m.style.visibility='');
    const png=await pdf.embedPng(canvas.toDataURL('image/png'));
    const srect=sheet.getBoundingClientRect();
    const pw=srect.width, ph=srect.height;               // pontos = px CSS
    const page=pdf.addPage([pw, ph]);
    if(!firstPage)firstPage=page;
    page.drawImage(png,{x:0,y:0,width:pw,height:ph});
    cells.forEach(c=>{
      const r=c.getBoundingClientRect();
      const x=r.left - srect.left, yTop=r.top - srect.top, w=r.width, h=r.height;
      const y=ph - yTop - h;
      const tf=form.createTextField(fieldName(c));
      tf.setText((c.textContent||'').trim());
      tf.setAlignment(TextAlignment.Center);
      tf.addToPage(page,{x,y,width:w,height:h,borderWidth:0,font:helvBold});
      tf.setFontSize(Math.min(17, Math.max(12, h*0.68)));
      try{ tf.updateAppearances(helvBold); }catch(e){}
    });
  }
  // dados completos embutidos invisivelmente para reconstruir na 2ª avaliação
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
const DRAFT_KEY='fisk_draft_espanhol_v1';
const DRAFT_MAX_AGE_MS=24*60*60*1000; // ignora rascunhos com mais de 24h
const DRAFT_SAFETY_MS=120000;         // rede de segurança: força um save a cada 2min se algo ficou pendente
let draftDirty=false, draftSaveTimer=null;

function collectFormDraft(){
  return {
    stage:'form', savedAt:Date.now(), loadedState,
    period, chosenScore, medalSel,
    fields:{
      s_teacher:$('s_teacher').value, s_name:$('s_name').value, s_level:$('s_level').value,
      notes:$('notes').value, suggOther:$('suggOther').value,
      perfExcelente:$('perfExcelente').checked,
      dateMode:$('dateMode').value, dateSpecific:$('dateSpecific').value,
      weekNum:$('weekNum').value, weekMonth:$('weekMonth').value,
      suggestions:selectedSuggestions(),
      rubric:[...document.querySelectorAll('.rg-in')].map(i=>({field:i.dataset.field,value:i.value}))
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
  loadedState=d.loadedState||null;
  const f=d.fields||{};
  $('s_teacher').value=f.s_teacher||$('s_teacher').value;
  $('s_name').value=f.s_name||'';
  $('s_level').value=f.s_level||'';
  $('notes').value=f.notes||'';
  $('suggOther').value=f.suggOther||'';
  $('dateMode').value=f.dateMode||'date';
  $('dateMode').dispatchEvent(new Event('change'));
  $('dateSpecific').value=f.dateSpecific||'';
  if(f.weekNum) $('weekNum').value=f.weekNum;
  if(f.weekMonth) $('weekMonth').value=f.weekMonth;
  period=d.period||'1';
  document.querySelectorAll('#periodToggle button').forEach(b=>b.classList.toggle('active',b.dataset.p===period));
  (f.suggestions||[]).forEach(k=>{ const cb=[...document.querySelectorAll('#suggBoxes input')].find(i=>i.value===k); if(cb) cb.checked=true; });
  (f.rubric||[]).forEach(r=>{ const inp=[...document.querySelectorAll('.rg-in')].find(i=>i.dataset.field===r.field); if(inp) inp.value=r.value; });
  $('perfExcelente').checked=!!f.perfExcelente;
  if(f.perfExcelente){
    document.querySelectorAll('.rubric .rg-nt').forEach(el=>el.classList.add('dim'));
    document.querySelectorAll('.rubric .rg-nt .rg-in').forEach(inp=>inp.disabled=true);
  }
  medalSel=d.medalSel||{escucha:null,comprende:null,gramatica:null}; renderMedalBoxes();
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
  return gradesFilledCount()>0 || !!($('s_name').value||'').trim() || !!($('s_level').value||'').trim() || !!($('notes').value||'').trim() || chosenScore!==null;
}
fiskInitBeforeUnloadGuard(hasUnsavedWork);

/* ============ MODO ESCURO (só afeta a tela de preenchimento) ============ */
fiskInitThemeToggle('themeToggle');
