/* ============================================================
   FISK — salvar PDF na pasta do aluno (drive compartilhado)
   ------------------------------------------------------------
   Cópia local dos helpers de Drive do Hub. Por que local e não do
   jsDelivr: o index.html carrega o fisk-shared.js pela TAG fixa
   @v1.0.0, que é anterior a estes helpers; apontar para uma tag
   nova acoplaria o boletim ao ciclo de release do fisk-hub.
   Canônico: github.com/pedro-fisk/fisk-hub/assets/fisk-shared.js
   (mantenha os dois em sincronia se mudar o protocolo).

   Endpoint: projeto Apps Script "fisk-hub-backend" (handler
   `salvarPdfNoDrive`, despachado por fn:'salvarPdf'). NÃO é o
   API_URL do card — é outro App da Web, de propósito.
   ============================================================ */

var FISK_SAVE_URL = 'https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec';

/** Converte um Uint8Array em base64 (em blocos, evita estourar a pilha). */
function fiskBytesToBase64(bytes) {
  var bin = '', chunk = 0x8000;
  for (var i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Envia um PDF para o App da Web salvar na pasta certa.
 * opts: { endpoint, key, tipo:'turma'|'aluno', escola, professor, turma,
 *         aluno, filename, bytes(Uint8Array) }
 * Resolve com { ok:true, url, pasta }. Rejeita com Error cujo .code pode
 * ser 'pasta_nao_encontrada'.
 */
async function fiskSalvarNoDrive(opts) {
  var endpoint = opts.endpoint || FISK_SAVE_URL;
  if (!endpoint) { var ec = new Error('URL de salvamento não configurada'); ec.code = 'sem_endpoint'; throw ec; }
  var payload = {
    fn: 'salvarPdf', key: opts.key, tipo: opts.tipo,
    escola: opts.escola || '', professor: opts.professor || '',
    turma: opts.turma || '', aluno: opts.aluno || '',
    filename: opts.filename || 'documento.pdf', mime: 'application/pdf',
    dados: fiskBytesToBase64(opts.bytes)
  };
  // corpo como string simples (text/plain) evita preflight CORS no Apps Script
  var resp = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
  var j;
  try { j = await resp.json(); }
  catch (e) { throw new Error('resposta inválida do servidor (o doPost já foi publicado no Apps Script?)'); }
  if (!j || j.ok !== true) {
    var err = new Error((j && j.erro) || 'falha ao salvar no Drive');
    err.code = (j && j.code) || '';
    throw err;
  }
  return j;
}

/** Converte base64 (vindo do Apps Script) em Uint8Array. */
function fiskBase64ToBytes(b64) {
  var bin = atob(String(b64 || '')), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Contraparte de leitura: acha os PDFs na pasta do aluno.
 * opts: { endpoint, key, escola, professor, turma, aluno, filename?, padrao? }
 * Sem `filename` resolve { arquivos:[{nome,url,atualizado}], pasta }.
 * Com `filename` resolve { nome, bytes(Uint8Array) }.
 * `padrao:'planner'` lista os planners em vez dos boletins (o boletim usa isso
 * para achar o planner do aluno e escrever a nota no cabeçalho).
 */
async function fiskBuscarNoDrive(opts) {
  var endpoint = opts.endpoint || FISK_SAVE_URL;
  if (!endpoint) { var ec = new Error('URL de busca não configurada'); ec.code = 'sem_endpoint'; throw ec; }
  var payload = {
    fn: 'buscarPdf', key: opts.key,
    escola: opts.escola || '', professor: opts.professor || '',
    turma: opts.turma || '', aluno: opts.aluno || '',
    filename: opts.filename || '', padrao: opts.padrao || ''
  };
  var resp = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
  var j;
  try { j = await resp.json(); }
  catch (e) { throw new Error('resposta inválida do servidor (o buscarPdf já foi publicado no Apps Script?)'); }
  if (!j || j.ok !== true) {
    var err = new Error((j && j.erro) || 'falha ao buscar no Drive');
    err.code = (j && j.code) || '';
    throw err;
  }
  if (opts.filename) return { nome: j.nome, bytes: fiskBase64ToBytes(j.dados) };
  return { pasta: j.pasta, arquivos: j.arquivos || [], outros: j.outros || 0 };
}

/**
 * Liga um botão ao envio para o Drive, com feedback padrão e — o mais
 * importante — NOTIFICA o professor de forma clara quando a pasta não é
 * encontrada (para ele não achar que salvou sem ter salvo).
 */
async function fiskEnviarParaPasta(buttonEl, getOpts) {
  if (!buttonEl) return;
  var old = buttonEl.textContent;
  buttonEl.disabled = true; buttonEl.textContent = '⏳ Enviando ao Drive…';
  var opts;
  try {
    opts = (typeof getOpts === 'function') ? await getOpts() : getOpts;
    if (!opts) { buttonEl.disabled = false; buttonEl.textContent = old; return; }
    var r = await fiskSalvarNoDrive(opts);
    // mostra ONDE salvou: a pasta é escolhida por aproximação (dia+horário no
    // caso da turma), então o professor tem de conseguir conferir num relance
    buttonEl.textContent = r && r.pasta ? '✓ Salvo em "' + r.pasta + '"' : '✓ Salvo na pasta';
    setTimeout(function () { buttonEl.textContent = old; buttonEl.disabled = false; }, 4000);
    /* Salvou, MAS fora do lugar previsto pelo card (aluno que trocou de turma
       ou de professor e a pasta não acompanhou). O documento chegou ao aluno —
       por isso é aviso e não erro —, e quem organiza as pastas precisa saber.
       Vai depois do feedback de sucesso de propósito: o professor primeiro vê
       que deu certo, e só então lê o que há para arrumar. */
    if (r && r.aviso) fiskAvisoDePasta(buttonEl, r.aviso);
    return r;
  } catch (e) {
    buttonEl.textContent = old; buttonEl.disabled = false;
    var ondeAlvo = (opts && opts.tipo === 'turma') ? 'da turma' : 'do aluno';
    if (e.code === 'sem_endpoint') {
      alert('⚙️ O salvamento no Drive ainda não foi configurado (FISK_SAVE_URL em fisk-drive.js).');
    } else if (e.code === 'pasta_nao_encontrada') {
      /* o aviso antigo ("confira/crie a pasta") virava beco sem saída: não dizia
         ONDE a busca acontece nem por que costuma falhar. A causa mais comum é
         aluno que trocou de professor(a)/turma no semestre — a pasta dele segue
         na pasta do professor(a) antigo, e a busca só olha a do card. */
      alert('⚠️ O documento NÃO foi salvo no Drive.\n\n' +
            'Não existe pasta ' + ondeAlvo + ' dentro da pasta do professor(a) que está ' +
            'selecionado em "Conectar ao card" — é só ali que eu procuro.\n\n' +
            'O que costuma resolver:\n' +
            '• se o aluno trocou de professor(a) ou turma, veja se o card está com o ' +
            'professor(a) certo e tente de novo;\n' +
            '• se a turma é nova, crie a pasta ' + ondeAlvo + ' dentro da pasta da turma ' +
            'no drive compartilhado, com o nome completo dele, e clique de novo.\n\n' +
            'O PDF que você baixou está no seu computador — nada foi perdido.' +
            (e.message ? '\n\n(detalhe do servidor: ' + e.message + ')' : ''));
    } else {
      alert('Não deu para salvar no Drive: ' + (e.message || e));
    }
    throw e;
  }
}

/**
 * Aviso de pasta fora do lugar, mostrado ao lado do botão que salvou.
 * NÃO usa alert de propósito: o salvamento deu certo, e um pop-up depois do
 * sucesso treina o professor a fechar sem ler. Fica visível na página, some
 * sozinho na próxima tentativa e serve a todas as ferramentas, porque todas
 * salvam por aqui.
 */
function fiskAvisoDePasta(buttonEl, texto) {
  try {
    var id = 'fisk-aviso-pasta';
    var box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div');
      box.id = id;
      box.style.cssText = 'margin-top:.6rem;padding:.6rem .75rem;border-radius:8px;' +
        'border:1px solid #e3c07a;background:#fdf6e6;color:#7a5a12;' +
        'font-size:12.5px;line-height:1.45;font-weight:600;max-width:52ch';
      (buttonEl.parentNode || document.body).insertBefore(box, buttonEl.nextSibling);
    }
    box.textContent = '⚠️ ' + texto;
    box.hidden = false;
  } catch (e) { /* aviso nunca pode derrubar o salvamento */ }
}
