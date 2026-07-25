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
 * opts: { endpoint, key, escola, professor, turma, aluno, filename? }
 * Sem `filename` resolve { arquivos:[{nome,url,atualizado}], pasta }.
 * Com `filename` resolve { nome, bytes(Uint8Array) }.
 */
async function fiskBuscarNoDrive(opts) {
  var endpoint = opts.endpoint || FISK_SAVE_URL;
  if (!endpoint) { var ec = new Error('URL de busca não configurada'); ec.code = 'sem_endpoint'; throw ec; }
  var payload = {
    fn: 'buscarPdf', key: opts.key,
    escola: opts.escola || '', professor: opts.professor || '',
    turma: opts.turma || '', aluno: opts.aluno || '',
    filename: opts.filename || ''
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
  return { pasta: j.pasta, arquivos: j.arquivos || [] };
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
    return r;
  } catch (e) {
    buttonEl.textContent = old; buttonEl.disabled = false;
    var ondeAlvo = (opts && opts.tipo === 'turma') ? 'da turma' : 'do aluno';
    if (e.code === 'sem_endpoint') {
      alert('⚙️ O salvamento no Drive ainda não foi configurado (FISK_SAVE_URL em fisk-drive.js).');
    } else if (e.code === 'pasta_nao_encontrada') {
      alert('⚠️ ATENÇÃO: a pasta ' + ondeAlvo + ' NÃO foi encontrada no drive compartilhado.\n\n' +
            'O boletim NÃO foi salvo. Guarde o PDF que você baixou ou ' +
            'confira/crie a pasta no Drive e tente de novo.' + (e.message ? '\n\n(' + e.message + ')' : ''));
    } else {
      alert('Não deu para salvar no Drive: ' + (e.message || e));
    }
    throw e;
  }
}
