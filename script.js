/* LOGO vem de logo.js (compartilhado com os outros geradores). */
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

/* ============ ESTÁGIOS (autocompletar) — edite com os nomes reais ============ */
const STAGES=["Essentials 1","Essentials 2","Transitions 1","Transitions 2","Fluency 1","Fluency 2","Focus","Pathways","Teens Connect 1","Teens Connect 2","Teens Elementary 1","Teens Elementary 2"];
/* preenche o autocompletar do estágio */
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
/* ============ SUGESTÕES DE MELHORIA (J a M) — edite à vontade ============ */
const SUGGESTIONS=[
  {key:'J', pt:'Vir ao centro de estudos', en:'Attend the study center'},
  {key:'K', pt:'Estudar mais em casa', en:'Study more at home'},
  {key:'L', pt:'Praticar na plataforma online', en:'Practice on the online platform'},
  {key:'M', pt:'Fazer as tarefas de casa', en:'Do the homework'}
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

/* Performance excelente: nota 10 em tudo exceto testes, e seleciona a frase 10 */
const NONTEST_FIELDS=['fluency','pronunciation','vocabulary','participation','dedication','socialization'];
$('perfExcelente').addEventListener('change',()=>{
  const on=$('perfExcelente').checked;
  document.querySelectorAll('.rubric .rg-nt').forEach(el=>el.classList.toggle('dim',on));
  // preenche (ou limpa) os campinhos dos critérios C a H com 10
  document.querySelectorAll('.rubric .rg-nt .rg-in').forEach(inp=>{ inp.value=on?'10':''; inp.disabled=on; });
  if(on){ chosenScore=10; renderScale(); $('genStatus').textContent=''; }
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
  listeningTest:['escuta','listening','auditiva','compreensao'],
  writtenTest:['escrita','written','writing','leitura','reading'],
  fluency:['fluencia','fluency'],
  pronunciation:['pronuncia','pronunciation','entonacao'],
  vocabulary:['vocabulario','vocabulary'],
  participation:['participacao','participation','participativo','participa','interesse','engajamento'],
  dedication:['dedicacao','dedication','dedica','tarefa','dever','atividades','homework'],
  socialization:['socializacao','socialization','socializa','convivencia','social']
};
function normalize(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
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
function oralResult(p){return avg([p.fluency,p.pronunciation,p.vocabulary]);}
function partResult(p){return avg([p.participation,p.dedication,p.socialization]);}
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
function critRow(ic,en,pt,fk,l,p1,p2){return `<div class="crit"><div class="ic">${ic}</div><div class="txt"><b>${en}</b><i>${pt}</i></div>${gradeCell('p1',fk,l,num(p1[fk]))}${gradeCell('p2',fk,l,num(p2[fk]))}</div>`;}
function finalCol(lbl,pk,p){return `<div class="final-box"><div class="fh"><div class="n">${lbl.replace(/(st|nd)/,'<sup>$1</sup>')}<br>Test</div><div class="rc-datebox" style="flex:1">Date: <span class="dval">${esc(p.date)}</span></div></div>
  <div class="final-line"><label>Listening Test</label><div class="v" id="fl-${pk}-list">${fmt(num(p.listeningTest))}</div></div>
  <div class="final-line"><label>Written Test</label><div class="v" id="fl-${pk}-wri">${fmt(num(p.writtenTest))}</div></div>
  <div class="final-line"><label>Oral Performance</label><div class="v" id="fl-${pk}-oral">${fmt(oralResult(p))}</div></div>
  <div class="final-line"><label>Participation</label><div class="v" id="fl-${pk}-part">${fmt(partResult(p))}</div></div>
  <div class="final-grade"><label>FINAL GRADE</label><div class="v" id="fl-${pk}-final">${fmt(finalGrade(p))}</div></div></div>`;}

/* Ícones dos critérios em SVG inline: os emojis somem no PDF (html2canvas
   não desenha a fonte de emoji colorida). */
const IC={
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2V5z"/><path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2V5z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8L12 2z"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.2V21h3.8L17.8 10 14 6.2 3 17.2zM20.7 7.1a1 1 0 0 0 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8 1.8-1.8z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20a5 5 0 0 1 5.8-4.4"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.7-9.2C.7 8.3 2.6 4.5 6.4 4.5c2 0 3.6 1.1 4.6 2.7 1-1.6 2.6-2.7 4.6-2.7 3.8 0 5.7 3.8 4.1 7.3C17.5 16.4 12 21 12 21z"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
  screen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>'
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
  const page1=`<div class="sheet sheet-themed sheet-adults">
    <div class="rc-frame rc-head"><img class="rc-logo-img" src="${LOGO}" alt="FISK">
      <div class="rc-head-fields">
        <div class="hf"><label>Name:</label><div class="rc-fill">${esc(s.name)}</div></div>
        <div class="hf"><label>Year:</label><div class="rc-fill rc-year">${esc(s.year)}</div><label>Teacher:</label><div class="rc-fill rc-teacher">${esc(s.teacher)}</div></div>
        <div class="hf"><label>Estágio:</label><div class="rc-fill">${esc(s.level)}</div></div>
      </div></div>
    <div class="rc-outer">
      <div class="rc-title"><h2>LEARNING PROGRESS REPORT</h2><p>Relatório de Progresso de Aprendizagem</p></div>
      <div class="rc-datehead"><div class="rc-datebox">Date: <span class="dval">${esc(p1.date)}</span></div><div class="rc-datebox">Date: <span class="dval">${esc(p2.date)}</span></div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">TESTS</span></div><div class="rc-body">
        <div class="testrow"><div class="txt"><b>Listening Comprehension Test</b><i>Teste de compreensão auditiva</i></div>${testCell('p1','listeningTest',num(p1.listeningTest))}${testCell('p2','listeningTest',num(p2.listeningTest))}</div>
        <div class="testrow"><div class="txt"><b>Written Test</b><i>Teste de leitura e escrita</i></div>${testCell('p1','writtenTest',num(p1.writtenTest))}${testCell('p2','writtenTest',num(p2.writtenTest))}</div>
      </div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">ORAL PERFORMANCE</span></div><div class="rc-body">
        ${critRow(IC.chat,'Can correctly express himself/herself in English','Consegue se expressar adequadamente em Inglês','fluency','fluência',p1,p2)}
        ${critRow(IC.sound,'Has adequate pronunciation and intonation','Tem pronúncia e entonação adequadas','pronunciation','pronúncia',p1,p2)}
        ${critRow(IC.book,'Shows growth in vocabulary use','Mostra evolução no uso de vocabulário','vocabulary','vocabulário',p1,p2)}
        <div class="results-row"><div class="results-lab">Results <span style="font-size:11px;font-weight:600">(média)</span></div><div class="results-val" id="oral-p1">${fmt(oralResult(p1))}</div><div class="results-val" id="oral-p2">${fmt(oralResult(p2))}</div></div>
      </div></div>
      <div class="rc-section"><div class="rc-vtab"><span class="vt">PARTICIPATION</span></div><div class="rc-body">
        ${critRow(IC.star,'Is interested and participative','É interessado(a) e participativo(a)','participation','participação',p1,p2)}
        ${critRow(IC.pencil,'Is dedicated to the proposed activities','Dedica-se às atividades propostas','dedication','dedicação',p1,p2)}
        ${critRow(IC.users,'Relates well and socializes with the group','Relaciona-se e socializa bem com a turma','socialization','socialização',p1,p2)}
        <div class="results-row"><div class="results-lab">Results <span style="font-size:11px;font-weight:600">(média)</span></div><div class="results-val" id="part-p1">${fmt(partResult(p1))}</div><div class="results-val" id="part-p2">${fmt(partResult(p2))}</div></div>
      </div></div>
    </div></div>`;
  const page2=`<div class="sheet sheet-themed sheet-adults"><div class="rc-outer">
      <div class="band">FINAL RESULTS <i>– Resultados Finais</i></div>
      <div class="final-cols">${finalCol('1st','p1',p1)}${finalCol('2nd','p2',p2)}</div>

      <div class="band" style="margin-top:14px">SUGGESTIONS FOR IMPROVEMENT <i>– Sugestões de Melhoria</i></div>
      <div class="obs-cols" style="margin-top:0">
        <div class="sugg-box">${suggList(p1)}</div>
        <div class="sugg-box">${suggList(p2)}</div>
      </div>

      <div class="band" style="margin-top:14px">OBSERVATIONS / COMMENTS <i>– Observações / Comentários</i></div>
      <div class="obs-cols">
        <div class="obs-wrap"><div class="obs-box" contenteditable="true" data-ph="Comentários da 1ª avaliação" data-pkey="p1" data-field="comment">${esc(p1.comment)}</div><button type="button" class="mic-btn" title="Ditar por voz">🎙️</button></div>
        <div class="obs-wrap"><div class="obs-box" contenteditable="true" data-ph="Comentários da 2ª avaliação" data-pkey="p2" data-field="comment">${esc(p2.comment)}</div><button type="button" class="mic-btn" title="Ditar por voz">🎙️</button></div>
      </div>
      <div class="band" style="margin-bottom:6px">PARENT'S SIGNATURE <i>– Assinatura do Responsável</i></div>
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
const GRADE_FIELDS=['fluency','pronunciation','vocabulary','participation','dedication','socialization','listeningTest','writtenTest'];

/* ============ BARRA DE PROGRESSO ============ */
function gradesFilledCount(){
  const filled=new Set();
  document.querySelectorAll('.rg-in').forEach(inp=>{ if((inp.value||'').trim()!=='') filled.add(inp.dataset.field); });
  const fromNotes=parseNotes($('notes').value||'');
  GRADE_FIELDS.forEach(f=>{ if(fromNotes[f]!=null) filled.add(f); });
  return filled.size;
}
function updateProgress(){
  let pct=0;
  if(($('s_teacher').value||'').trim()) pct+=5;
  if(($('s_name').value||'').trim()) pct+=15;
  if(($('s_level').value||'').trim()) pct+=10;
  pct+=(gradesFilledCount()/GRADE_FIELDS.length)*45;
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
    // sem dados embutidos nem campos -> OCR
    setLoadStatus('Sem dados embutidos. Lendo as notas por OCR, aguarde...','#0e7fb5');
    loadedState=await ocrPDF(buf);
    applyLoaded('Notas lidas por OCR. IMPORTANTE: confira todas as notas na tela seguinte!');
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

/* OCR de último recurso: rasteriza o PDF e lê os números por posição */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('falha ao carregar '+src));document.head.appendChild(s);});}
async function ocrPDF(buf){
  if(!window.pdfjsLib){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); }
  if(window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  if(!window.Tesseract){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js'); }
  const doc=await pdfjsLib.getDocument({data:buf.slice(0)}).promise;
  const words=[];
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p);
    const vp=page.getViewport({scale:2});
    const canvas=document.createElement('canvas'); canvas.width=vp.width; canvas.height=vp.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    const {data}=await Tesseract.recognize(canvas,'por');
    (data.words||[]).forEach(wd=>words.push({t:wd.text,x0:wd.bbox.x0,y0:wd.bbox.y0,x1:wd.bbox.x1,y1:wd.bbox.y1,page:p,pw:vp.width}));
  }
  // âncoras de rótulo (fluência, pronúncia, escuta...) e números, casados por linha
  const state={student:{},p1:{},p2:{}};
  const anchors=[];
  words.forEach(w=>{ const nm=normalize(w.t); if(nm.length>=4){ let bf=null,bd=1e9; for(const fdd in FIELD_WORDS){ for(const kw of FIELD_WORDS[fdd]){ const dd=lev(nm,kw); if(dd<bd){bd=dd;bf=fdd;} } } const maxD=nm.length<=7?2:3; if(bf&&bd<=maxD) anchors.push({w,field:bf}); } });
  const nums=words.filter(w=>/^\d+([.,]\d+)?$/.test(w.t));
  nums.forEach(n=>{
    const ny=(n.y0+n.y1)/2, nh=n.y1-n.y0;
    let best=null,bd=1e9;
    anchors.forEach(a=>{ if(a.w.page!==n.page)return; const ay=(a.w.y0+a.w.y1)/2; const dy=Math.abs(ay-ny); if(a.w.x1<=n.x1 && dy<bd && dy<nh*1.6){ bd=dy; best=a; } });
    if(best){ const pk=(n.x0 < n.pw/2)?'p1':'p2'; const val=parseFloat(n.t.replace(',','.')); if(state[pk][best.field]===undefined) state[pk][best.field]=val; }
  });
  return state;
}

/* ============ GENERATE ============ */
const GRADE_LABELS={listeningTest:'A escuta',writtenTest:'B escrita',fluency:'C fluência',pronunciation:'D pronúncia',vocabulary:'E vocabulário',participation:'F participação',dedication:'G dedicação',socialization:'H socialização'};
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
  /* campos obrigatórios: aluno, professor(a), estágio, todas as notas e a frase de comentário */
  const missing=[];
  if(!(base.student.name||'').trim()) missing.push('nome do aluno');
  if(!(base.student.teacher||'').trim()) missing.push('nome do professor(a)');
  if(!(base.student.level||'').trim()) missing.push('estágio');
  const semNota=GRADE_FIELDS.filter(f=>base[pk][f]==null||base[pk][f]==='');
  if(semNota.length) missing.push('notas pendentes ('+semNota.map(f=>GRADE_LABELS[f]).join(', ')+')');
  if(chosenScore===null) missing.push('frase de comentário (0 a 10)');
  if(missing.length){ $('genStatus').textContent='⚠ Obrigatório: '+missing.join(' · ')+'.'; $('genStatus').className='status err'; return; }
  const comment=resolveCmt(chosenScore);
  $('genStatus').textContent='';
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
  return 'Report Card - '+safe;
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
    // notas individuais e de teste recebem nome semântico (g__p1__fluency); demais são calculadas (c__id)
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
const DRAFT_KEY='fisk_draft_v1';
const DRAFT_MAX_AGE_MS=24*60*60*1000; // ignora rascunhos com mais de 24h
const DRAFT_SAFETY_MS=120000;         // rede de segurança: força um save a cada 2min se algo ficou pendente
let draftDirty=false, draftSaveTimer=null;

function collectFormDraft(){
  return {
    stage:'form', savedAt:Date.now(), loadedState,
    period, chosenScore,
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
