/* ============================================================
   Conexão do boletim com o CARD (planilha) — Fase do fluxo de notas.
   Reaproveita a MESMA API do Apps Script do termo-atraso:
     · fn=escolas / fn=profs / fn=turmas / fn=turma  → cascata ao vivo
     · fn=turma já traz, por aluno: linhaCard, book, notasAv1, notasAv2
     · fn=lancarNota(prof, linhaCard, av, texto, mediaBaixa, escola) → grava
   Dois papéis:
     1) LANÇAR a nota do boletim na célula compacta do card ao finalizar
        (formato canônico "[EST] dd/mm/aaaa · média M,M\nA.. B.. ...";
         média < 6 pinta a célula de vermelho = gatilho da 2ª chance).
     2) PUXAR a 1ª avaliação do card na 2ª (dispensa subir o PDF).
   Escopo desta fase: SÓ sincronia de notas (nada de Drive/planner ainda).
   Depende de globais de script.js (mesmo escopo de <script> clássico):
     $, STATE, period, loadedState, finalGrade, fmt, renderScale, applyLoaded,
     updateProgress.
   ============================================================ */
(function () {
  /* mesma implantação e chave do termo-atraso (App da Web do card) */
  var API_URL = 'https://script.google.com/macros/s/AKfycbxb3s3zSUoaFO9ytEQ4W6r-5xJ3hiA9fbFhugnbd9gyX-m3KGNNM8DeyGgNWPReYEwU/exec';
  var API_KEY = 'fisk-cards-2026-vX7q3nT';

  /* vínculo atual com um aluno do card. null = boletim sem vínculo (modo antigo). */
  var cardLink = null;   // { escola, prof, linhaCard, book, nome }

  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  var FIELDS  = ['listeningTest', 'writtenTest', 'fluency', 'pronunciation',
                 'vocabulary', 'participation', 'dedication', 'socialization'];
  var LETTER2FIELD = {}; LETTERS.forEach(function (L, i) { LETTER2FIELD[L] = FIELDS[i]; });

  function el(id) { return document.getElementById(id); }
  function setStatus(msg, kind) {
    var s = el('cardStatus'); if (!s) return;
    s.textContent = msg || '';
    s.className = 'status' + (kind ? ' ' + kind : '');
  }
  function setPush(msg, color) {
    var p = el('cardPushStatus'); if (!p) return;
    p.textContent = msg || '';
    p.style.color = color || '';
  }

  /* ---- helper de API (mesmo esquema do termo) ---- */
  function api(params) {
    var qs = Object.keys(params).map(function (k) {
      return k + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(API_URL + '?key=' + encodeURIComponent(API_KEY) + '&' + qs)
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.erro) throw new Error(j.erro); return j; });
  }

  /* ---- estágio → código canônico do card ([TRA1], [ESS2], [FOCUS]...) ---- */
  function stageCode(level) {
    var s = (level || '').trim(); if (!s) return 'EST';
    var norm = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var m = norm.match(/([12])\s*$/); var digit = m ? m[1] : '';
    var base = norm.replace(/\s*[12]\s*$/, '').trim();
    var MAP = [
      ['essentials', 'ESS'], ['transitions', 'TRA'], ['fluency', 'FLU'],
      ['pathways', 'PATH'], ['teens connect', 'TC'], ['teens elementary', 'TE'],
      ['in focus', 'FOCUS'], ['focus', 'FOCUS'], ['magic way', 'MW']
    ];
    for (var i = 0; i < MAP.length; i++) {
      if (base.indexOf(MAP[i][0]) === 0) {
        var c = MAP[i][1];
        return c + (c === 'FOCUS' || c === 'MW' ? '' : digit);
      }
    }
    return (base.replace(/[^a-z]/g, '').slice(0, 4).toUpperCase() || 'EST') + digit;
  }

  /* ---- nota curta para o card: 8 / 7,5 ---- */
  function short(v) {
    if (v === null || v === undefined || v === '') return '?';
    var n = +v; if (isNaN(n)) return '?';
    return (Math.round(n * 10) % 10 === 0) ? String(Math.round(n)) : n.toFixed(1).replace('.', ',');
  }
  function hoje() {
    var d = new Date(), p = function (x) { return String(x).padStart(2, '0'); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  /* ---- monta a célula canônica do card a partir de STATE[pk] ---- */
  function buildCell(p, level) {
    var linha = LETTERS.map(function (L, i) { return L + short(p[FIELDS[i]]); }).join(' ');
    var dataStr = (p.date && String(p.date).trim()) || hoje();
    return '[' + stageCode(level) + '] ' + dataStr + ' · média ' + fmt(finalGrade(p)) + '\n' + linha;
  }

  /* ---- lê de volta a linha "A8 B7,5 ..." do card em objeto de notas ----
     Só a ÚLTIMA linha é lida (evita casar o "A1" que existe dentro de "TRA1"). */
  function parseCardNotes(cellText) {
    var res = {};
    var lines = String(cellText || '').split('\n');
    var noteLine = lines[lines.length - 1];
    var re = /(?:^|\s)([A-H])\s*([0-9]+(?:[.,][0-9]+)?)/g, m;
    while ((m = re.exec(noteLine))) { res[LETTER2FIELD[m[1]]] = +m[2].replace(',', '.'); }
    return res;
  }

  /* ---- helpers de <select> da cascata ---- */
  function fill(sel, ph, itens) {
    sel.innerHTML = '<option value="" disabled selected>' + ph + '</option>' +
      itens.map(function (i) {
        return '<option value="' + i.v + '">' + String(i.t).replace(/</g, '&lt;') + '</option>';
      }).join('');
    sel.disabled = false;
  }
  function resetSel(sel, ph) {
    sel.innerHTML = '<option value="" disabled selected>' + ph + '</option>';
    sel.disabled = true;
  }

  /* ============ CASCATA STANDALONE (escola → prof → turma) ============ */
  function initCascade() {
    el('cardCascade').hidden = false;
    setStatus('Escolha escola, professor(a) e turma — os dados vêm ao vivo do card.');
    var selEscola = el('selEscola'), selProf = el('selProf'),
        selTurma = el('selTurma'), btn = el('btnCarregarTurma');

    api({ fn: 'escolas' }).then(function (j) {
      fill(selEscola, 'Escola…', (j.escolas || []).map(function (e) { return { v: e, t: e }; }));
    }).catch(function (e) { setStatus('⚠️ ' + e.message, 'err'); });

    selEscola.addEventListener('change', function () {
      if (!selEscola.value) return;
      resetSel(selProf, 'Professor(a)…'); resetSel(selTurma, 'Turma…'); btn.disabled = true;
      api({ fn: 'profs', escola: selEscola.value }).then(function (j) {
        fill(selProf, 'Professor(a)…', (j.profs || []).map(function (p) { return { v: p, t: p }; }));
      }).catch(function (e) { setStatus('⚠️ ' + e.message, 'err'); });
    });
    selProf.addEventListener('change', function () {
      if (!selProf.value) return;
      resetSel(selTurma, 'Turma…'); btn.disabled = true;
      api({ fn: 'turmas', escola: selEscola.value, prof: selProf.value }).then(function (j) {
        fill(selTurma, 'Turma…', (j.turmas || []).map(function (t) {
          return { v: t.linhaTitulo, t: t.titulo };
        }));
      }).catch(function (e) { setStatus('⚠️ ' + e.message, 'err'); });
    });
    selTurma.addEventListener('change', function () { btn.disabled = !selTurma.value; });
    btn.addEventListener('click', function () {
      if (!selTurma.value) return;
      btn.disabled = true; btn.textContent = '⏳ Carregando…';
      setStatus('🔄 Lendo a turma ao vivo…');
      api({ fn: 'turma', escola: selEscola.value, prof: selProf.value, linha: selTurma.value })
        .then(onTurmaLoaded)
        .catch(function (e) { setStatus('⚠️ ' + e.message, 'err'); })
        .finally(function () { btn.disabled = false; btn.textContent = 'Carregar turma'; });
    });
  }

  /* ============ ABERTURA PELO CARD (#t=escola|prof|linha) ============ */
  function initFromFragment() {
    var ref = decodeURIComponent(location.hash.slice(3)).split('|'); // escola|prof|linha
    setStatus('🔄 Lendo a turma do card…');
    api({ fn: 'turma', escola: ref[0], prof: ref[1], linha: ref[2] })
      .then(onTurmaLoaded)
      .catch(function (e) { setStatus('⚠️ ' + e.message + ' — use a cascata abaixo.', 'err'); initCascade(); });
  }

  /* ============ TURMA CARREGADA → picker de alunos ============ */
  function onTurmaLoaded(dados) {
    var alunos = (dados.alunos || []).filter(function (a) { return a && a.nome; });
    el('cardTurmaNome').textContent = dados.turma ? '— ' + dados.turma : '';
    var sel = el('selAluno');
    sel.innerHTML = '<option value="" disabled selected>Escolha o aluno…</option>' +
      alunos.map(function (a, i) {
        var tag = (a.notasAv1 && String(a.notasAv1).trim()) ? ' • já tem 1ª nota' : '';
        return '<option value="' + i + '">' + String(a.nome).replace(/</g, '&lt;') + tag + '</option>';
      }).join('') +
      '<option value="__none__">— sem vínculo (digitar à mão) —</option>';
    el('cardAlunoWrap').hidden = false;
    el('cardCascade').hidden = false; // mantém visível para trocar de turma
    setStatus('Turma "' + (dados.turma || '') + '" carregada — escolha o aluno.', 'ok');

    sel.onchange = function () {
      if (sel.value === '__none__') {
        cardLink = null; syncPushBtn();
        setStatus('Sem vínculo com o card — o boletim NÃO será lançado na planilha.');
        return;
      }
      var a = alunos[+sel.value]; if (!a) return;
      selecionarAluno(a, dados);
    };
  }

  /* ============ SELEÇÃO DE UM ALUNO ============ */
  function selecionarAluno(a, dados) {
    cardLink = { escola: dados.escola, prof: dados.aba, linhaCard: a.linhaCard, book: a.book, nome: a.nome };
    var level = (a.book || '').trim();

    if (a.notasAv1 && String(a.notasAv1).trim()) {
      /* já existe 1ª avaliação no card: reconstrói a 1ª e vai direto para a 2ª
         (reaproveita o mesmo caminho do upload de PDF, via loadedState). */
      loadedState = {
        student: { name: a.nome, level: level, teacher: (el('s_teacher').value || '') },
        p1: parseCardNotes(a.notasAv1), p2: {}
      };
      applyLoaded('1ª avaliação de ' + a.nome + ' puxada do card. Preencha a 2ª.');
      setStatus('✓ ' + a.nome + ' — 1ª avaliação carregada do card. Preencha a 2ª avaliação.', 'ok');
    } else {
      el('s_name').value = a.nome;
      el('s_level').value = level;
      if (typeof renderScale === 'function') renderScale();
      if (typeof updateProgress === 'function') updateProgress();
      setStatus('✓ ' + a.nome + ' selecionado(a) · estágio ' + (level || '—') +
                '. A nota será lançada no card ao final.', 'ok');
    }
    if (/focus/i.test(level)) {
      setStatus('⚠️ ' + a.nome + ' é do Focus — o curso usa simulados MET, não boletim formal. ' +
                'Você ainda pode lançar, mas confirme com a coordenação.', 'err');
    }
    syncPushBtn();
  }

  /* ============ LANÇAR NO CARD ============ */
  function currentPk() { return (period === '2') ? 'p2' : 'p1'; }

  function pushToCard() {
    if (!cardLink || !STATE) return Promise.resolve();
    var pk = currentPk();
    var p = STATE[pk] || {};
    var faltando = FIELDS.filter(function (f) { return p[f] == null || p[f] === ''; });
    if (faltando.length) {
      setPush('⚠️ Notas incompletas — não lancei no card.', '#c0392b');
      return Promise.resolve();
    }
    var level = (STATE.student && STATE.student.level) || cardLink.book || '';
    var texto = buildCell(p, level);
    var media = finalGrade(p);
    var av = (pk === 'p2') ? 2 : 1;
    var btn = el('cardPushBtn'); if (btn) btn.disabled = true;
    setPush('⏳ Lançando no card…', '');
    return api({
      fn: 'lancarNota', escola: cardLink.escola, prof: cardLink.prof,
      linhaCard: cardLink.linhaCard, av: av, texto: texto, mediaBaixa: media < 6 ? '1' : '0'
    }).then(function () {
      setPush('✓ ' + av + 'ª avaliação lançada no card' +
              (media < 6 ? ' (média baixa — célula vermelha)' : '') + '.', '#1e8f4e');
    }).catch(function (e) {
      setPush('⚠️ Não consegui lançar: ' + e.message, '#c0392b');
    }).finally(function () { if (btn) btn.disabled = false; });
  }

  function syncPushBtn() {
    var b = el('cardPushBtn'); if (b) b.hidden = !cardLink;
  }

  /* ============ BOOT ============ */
  function boot() {
    var standalone = (window.parent === window);
    if (location.hash.indexOf('#t=') === 0) initFromFragment();
    else initCascade();

    var pushBtn = el('cardPushBtn');
    if (pushBtn) pushBtn.onclick = function () { pushToCard(); };
    /* ao baixar o PDF, lança automaticamente no card (idempotente) */
    var pdfBtn = el('pdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', function () { if (cardLink) setTimeout(pushToCard, 300); });
    /* 🧹 Limpar: solta o vínculo e reabre a escolha de aluno da turma */
    var clearBtn = el('confirmClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      cardLink = null; syncPushBtn(); setPush('');
      var sel = el('selAluno'); if (sel && sel.options.length) sel.selectedIndex = 0;
    });
    syncPushBtn();
  }
  boot();
})();
