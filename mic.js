/* Botão de microfone (ditado por voz) para os campos de texto livre dos boletins (notas, comentários,
   observações, "outros"...). Usa a Web Speech API do navegador — não interfere em nenhuma configuração
   de acessibilidade do computador, é só uma permissão de microfone daquela aba, como em qualquer chamada
   de vídeo. Funciona tanto em <input>/<textarea> quanto em caixas contenteditable. */
function attachDictation(btn, target, onChange){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ btn.style.display='none'; return; } // navegador sem suporte (ex.: Firefox) — some o botão
  const isField = target.tagName==='INPUT' || target.tagName==='TEXTAREA';
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  let listening=false, baseText='';
  function getCurrent(){ return isField ? (target.value||'') : (target.innerText||''); }
  function currentBase(){
    const t = getCurrent().trim();
    return t ? t+' ' : '';
  }
  function setText(t){
    if(isField){ target.value=t; target.dispatchEvent(new Event('input',{bubbles:true})); }
    else{ target.innerText=t; }
    if(onChange) onChange(t);
  }
  btn.addEventListener('click', ()=>{
    if(listening){ rec.stop(); return; }
    baseText = currentBase();
    try{ rec.start(); }catch(e){}
  });
  rec.onstart = ()=>{ listening=true; btn.classList.add('listening'); btn.title='Clique para parar o ditado'; };
  rec.onend = ()=>{ listening=false; btn.classList.remove('listening'); btn.title='Ditar por voz'; };
  rec.onerror = e=>{
    listening=false; btn.classList.remove('listening');
    if(e.error==='not-allowed' || e.error==='service-not-allowed'){
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      alert(isIOS
        ? 'Permissão de microfone negada.\n\nSe isso acontecer em qualquer navegador do iPhone/iPad, o mais comum é o ditado estar desligado no sistema: Ajustes > Geral > Teclado > "Habilitar Ditado".\n\nSe já estiver ligado, confira também Ajustes > [nome do navegador] > Microfone.'
        : 'Permissão de microfone negada. Habilite o microfone para este site nas configurações do navegador para usar o ditado por voz.');
    }
  };
  rec.onresult = e=>{
    let finalChunk='', interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal) finalChunk += t+' ';
      else interim += t;
    }
    if(finalChunk) baseText += finalChunk;
    setText((baseText+interim).trim());
  };
}
