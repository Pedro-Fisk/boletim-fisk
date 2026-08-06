/* ============================================================
   Conexão do boletim de KIDS/TEENS com o CARD (planilha).
   Versão enxuta da do boletim de adultos: aqui o card só serve para
   TRAZER O ALUNO (nome + estágio) — kids não tem colunas de nota nem
   lançamento, o boletim é de medalhas.
   Depende de globais do script-kids.js: $, renderScale, updateProgress.
   ============================================================ */
(function () {
  var API_URL = 'https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec';

  var cardLink = null;   // { escola, prof, turma, nome, book, raf }

  function el(id) { return document.getElementById(id); }
  function setStatus(msg, kind) {
    var s = el('cardStatus'); if (!s) return;
    s.textContent = msg || '';
    s.className = 'status' + (kind ? ' ' + kind : '');
  }
  function ind(id, estado) { var e = el(id); if (e) e.className = 'ind' + (estado ? ' ' + estado : ''); }

  /* A CHAVE DO CARD NÃO VIVE MAIS AQUI. Este repositório é público: enquanto
     ela estava neste arquivo, qualquer pessoa na internet lia nome, notas e
     faltas de todas as turmas — e escrevia nota. Quem fala com o card agora é
     o backend (action=card), que valida a sessão e só então carimba a chave.
     Ver cardProxy_ no fisk-hub-backend. NUNCA reintroduzir a chave aqui. */
  function tokenSessao() {
    try { var s = JSON.parse(localStorage.getItem('fisk_prof') || 'null'); return (s && s.token) || ''; }
    catch (e) { return ''; }
  }
  function comSessao(p) {
    var o = { action: 'card', token: tokenSessao() };
    Object.keys(p).forEach(function (k) { o[k] = p[k]; });
    return o;
  }
  /* ── Resposta que não é JSON ─────────────────────────────────────────────
     O Apps Script devolve uma PÁGINA HTML (<!DOCTYPE …>) sempre que a execução
     não chega ao fim por conta dele: tempo estourado, cota do dia, deployment
     fora do ar ou o Google pedindo login. Chamar `r.json()` direto estourava
     com «Unexpected token '<', "<!DOCTYPE "… is not valid JSON» na cara do
     professor — foi o que apareceu em 06/08/2026 no Abridor de Planners, ao
     abrir a turma do card. A ponte do servidor (cardProxy_) só traduz o HTML
     que vem DO CARD; quando é a execução do próprio Hub que morre, não sobra
     código nosso rodando lá — a última defesa é esta, aqui no navegador.
     Usa o fiskJson do fisk-shared.js quando existir; senão faz o mesmo aqui,
     porque a tag do CDN é anterior a este arquivo (cópia local de propósito,
     como o resto deste arquivo — ver o cabeçalho). */
  function jsonSeguro(r) {
    if (typeof window !== 'undefined' && typeof window.fiskJson === 'function') return window.fiskJson(r);
    return r.text().then(function (txt) {
      var limpo = String(txt || '').replace(/^\uFEFF/, '').trim();
      if (limpo.charAt(0) === '{' || limpo.charAt(0) === '[') {
        try { return JSON.parse(limpo); } catch (e) {}
      }
      if (/accounts\.google\.com|Fa(ç|c)a login|Sign in/i.test(limpo)) {
        throw new Error('O Google pediu login para responder. Abra o Fisk Hub numa aba, ' +
          'entre com a conta da escola e tente de novo.');
      }
      throw new Error('O servidor não respondeu com dados (o Google devolveu uma página de ' +
        'erro' + (r.status ? ', HTTP ' + r.status : '') + '). Quase sempre é a leitura ' +
        'estourando o tempo do Google: espere alguns instantes e tente de novo.');
    });
  }

  function api(params) {
    var P = comSessao(params);
    var qs = Object.keys(P).map(function (k) {
      return k + '=' + encodeURIComponent(P[k]);
    }).join('&');
    return fetch(API_URL + '?' + qs)
      .then(jsonSeguro)
      .then(function (j) { if (j && j.erro) throw new Error(j.erro); return j; });
  }

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

  /* ---- sessão do Fisk Hub (mesmo origin do Pages) ---- */
  function sessao() { try { return JSON.parse(localStorage.getItem('fisk_prof') || 'null'); } catch (e) { return null; } }
  function actingSaved() { try { return JSON.parse(localStorage.getItem('fisk_actas') || 'null'); } catch (e) { return null; } }
  function profDaSessao() {
    var s = sessao(); if (!s || !s.name) return null;
    if (s.master) { var a = actingSaved(); return (a && a.name) ? { name: a.name, escolas: a.escolas || '' } : null; }
    return { name: s.name, escolas: String(s.escolas || s.escola || '') };
  }

  function carregarTurma(escola, prof, linha) {
    ind('indTurma', 'spin'); setStatus('🔄 Lendo a turma ao vivo…');
    return api({ fn: 'turma', escola: escola, prof: prof, linha: linha })
      .then(function (d) { ind('indTurma', 'ok'); onTurmaLoaded(d); })
      .catch(function (e) { ind('indTurma', ''); setStatus('⚠️ ' + e.message, 'err'); });
  }

  /* ---- logado: só a turma ---- */
  function initSessao(p) {
    var escolas = String(p.escolas || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!escolas.length) return initCascade();

    el('cardCascade').hidden = false;
    el('wrapEscola').hidden = true; el('wrapProf').hidden = true;
    el('cardEuSou').hidden = false;
    el('cardEuNome').textContent = p.name;
    el('cardEuEscola').textContent = escolas.join(' + ');
    setStatus('Escolha a turma, escola e professor(a) já vêm do seu login.');

    var selTurma = el('selTurma');
    resetSel(selTurma, 'Turma…'); ind('indTurma', 'spin');
    Promise.all(escolas.map(function (esc) {
      return api({ fn: 'turmas', escola: esc, prof: p.name })
        .then(function (j) {
          return (j.turmas || []).map(function (t) {
            return { escola: esc, linha: t.linhaTitulo, titulo: t.titulo };
          });
        }).catch(function () { return []; });
    })).then(function (listas) {
      var todas = [].concat.apply([], listas);
      if (!todas.length) {
        ind('indTurma', ''); el('cardEuSou').hidden = true; initCascade();
        setStatus('Não achei turmas de "' + p.name + '" no card, escolha na mão.', 'err');
        return;
      }
      fill(selTurma, 'Turma…', todas.map(function (t) {
        return { v: t.escola + '|' + t.linha, t: (escolas.length > 1 ? t.escola + ' · ' : '') + t.titulo };
      }));
      ind('indTurma', 'ok');
      selTurma.onchange = function () {
        if (!selTurma.value) return;
        var ref = selTurma.value.split('|');
        carregarTurma(ref[0], p.name, ref[1]);
      };
    });

    el('btnTrocarProf').onclick = function () { el('cardEuSou').hidden = true; initCascade(); };
  }

  /* ---- cascata completa (sem sessão ou ao trocar de professor) ---- */
  function initCascade() {
    el('cardCascade').hidden = false;
    el('wrapEscola').hidden = false; el('wrapProf').hidden = false;
    setStatus('Escolha escola, professor(a) e turma, os dados vêm ao vivo do card.');
    var selEscola = el('selEscola'), selProf = el('selProf'), selTurma = el('selTurma');
    resetSel(selProf, 'Professor(a)…'); resetSel(selTurma, 'Turma…');
    ind('indProf', ''); ind('indTurma', '');

    ind('indEscola', 'spin');
    api({ fn: 'escolas' }).then(function (j) {
      fill(selEscola, 'Escola…', (j.escolas || []).map(function (e) { return { v: e, t: e }; }));
      ind('indEscola', 'ok');
    }).catch(function (e) { ind('indEscola', ''); setStatus('⚠️ ' + e.message, 'err'); });

    selEscola.onchange = function () {
      if (!selEscola.value) return;
      resetSel(selProf, 'Professor(a)…'); resetSel(selTurma, 'Turma…');
      ind('indProf', 'spin'); ind('indTurma', '');
      api({ fn: 'profs', escola: selEscola.value }).then(function (j) {
        fill(selProf, 'Professor(a)…', (j.profs || []).map(function (p) { return { v: p, t: p }; }));
        ind('indProf', 'ok');
      }).catch(function (e) { ind('indProf', ''); setStatus('⚠️ ' + e.message, 'err'); });
    };
    selProf.onchange = function () {
      if (!selProf.value) return;
      resetSel(selTurma, 'Turma…'); ind('indTurma', 'spin');
      api({ fn: 'turmas', escola: selEscola.value, prof: selProf.value }).then(function (j) {
        fill(selTurma, 'Turma…', (j.turmas || []).map(function (t) {
          return { v: t.linhaTitulo, t: t.titulo };
        }));
        ind('indTurma', 'ok');
      }).catch(function (e) { ind('indTurma', ''); setStatus('⚠️ ' + e.message, 'err'); });
    };
    selTurma.onchange = function () {
      if (!selTurma.value) return;
      carregarTurma(selEscola.value, selProf.value, selTurma.value);
    };
  }

  /* ---- turma carregada → escolher o aluno ---- */
  function onTurmaLoaded(dados) {
    var alunos = (dados.alunos || []).filter(function (a) { return a && a.nome; });
    el('cardTurmaNome').textContent = dados.turma ? '- ' + String(dados.turma).split('\n')[0] : '';
    var sel = el('selAluno');
    sel.innerHTML = '<option value="" disabled selected>Escolha o aluno…</option>' +
      alunos.map(function (a, i) {
        return '<option value="' + i + '">' + String(a.nome).replace(/</g, '&lt;') + '</option>';
      }).join('') +
      '<option value="__none__">sem vínculo (digitar à mão), </option>';
    el('cardAlunoWrap').hidden = false;
    setStatus('Turma carregada, escolha o aluno.', 'ok');

    sel.onchange = function () {
      if (sel.value === '__none__') {
        cardLink = null; window.RAF_DO_CARD = ''; syncDriveBtn();
        ONDE_ESTAVA = { escola: dados.escola, prof: dados.aba, turma: String(dados.turma || '').split('\n')[0] };
        setStatus('⚠️ Aluno fora do card: a secretaria será avisada para arrumar o cadastro. Preencha o nome e o estágio à mão.', 'err');
        return;
      }
      ONDE_ESTAVA = null;
      var a = alunos[+sel.value]; if (!a) return;
      cardLink = { escola: dados.escola, prof: dados.aba, turma: String(dados.turma || '').split('\n')[0],
                   nome: a.nome, book: a.book, raf: a.raf || '' };
      window.RAF_DO_CARD = String(a.raf || '').trim();
      window.ultimoPDF = null; esconderVerPasta(); syncDriveBtn();
      el('s_name').value = a.nome;
      if (a.book) el('s_level').value = a.book;
      if (typeof renderScale === 'function') renderScale();
      if (typeof updateProgress === 'function') updateProgress();
      setStatus('✓ ' + a.nome + (a.book ? ' · ' + a.book : '') + ', dados preenchidos.', 'ok');
    };
  }

  /* ---- aluno fora do card: aviso automático para a secretaria ----
     A saída à mão CONTINUA existindo: cadastro atrasado (matrícula ou
     transferência que a secretaria ainda não concluiu) não pode travar o
     professor. Mas a secretaria precisa saber, então a ferramenta avisa
     sozinha quando o PDF sai sem vínculo. Dedup é no servidor, por
     escola+turma+aluno. Ver fisk-fora-do-card.js. */
  var ONDE_ESTAVA = null;      // escola/prof/turma de onde o professor estava
  var JA_AVISOU = '';          // não repete o aviso do mesmo nome na mesma sessão

  function avisarForaDoCard(documento) {
    var nome = (el('s_name') && el('s_name').value || '').trim();
    if (!nome || cardLink) return;
    if (JA_AVISOU === nome.toLowerCase()) return;
    JA_AVISOU = nome.toLowerCase();
    var onde = ONDE_ESTAVA || {};
    if (typeof window.fiskAvisarForaDoCard !== 'function') return;
    window.fiskAvisarForaDoCard({ documento: documento, aluno: nome,
      escola: onde.escola, professor: onde.prof, turma: onde.turma })
      .then(function (r) {
        if (r.avisado) setStatus('⚠️ Aluno fora do card: a secretaria foi avisada para arrumar o cadastro.', 'err');
        else if (r.motivo === 'sem_sessao') setStatus('⚠️ Aluno fora do card. Você não está logado no Fisk Hub, então não deu para avisar a secretaria automaticamente — avise você mesmo.', 'err');
        else setStatus('⚠️ Aluno fora do card. Não consegui avisar a secretaria automaticamente — avise você mesmo.', 'err');
      });
  }

  /* ---- salvar na pasta do aluno + ver pasta ---- */
  function syncDriveBtn() {
    var b = el('btnDrive'); if (b) b.hidden = !(cardLink && window.ultimoPDF);
  }
  window.onPDFGerado = function () {
    syncDriveBtn();
    avisarForaDoCard('boletim Kids/Teens');
  };

  function mostrarVerPasta(r) {
    var b = el('btnVerPasta'); if (!b) return;
    var url = (r && (r.pastaUrl || r.url)) || '';
    if (!url) { b.hidden = true; return; }
    b.href = url; b.title = 'Abrir no Drive a pasta "' + ((r && r.pasta) || '') + '"';
    b.hidden = false;
  }
  function esconderVerPasta() { var b = el('btnVerPasta'); if (b) b.hidden = true; }

  function salvarNaPasta() {
    var pdf = window.ultimoPDF;
    if (!pdf) { alert('Baixe o PDF primeiro. É ele que vai para a pasta.'); return; }
    if (!cardLink) { alert('Sem vínculo com o card: escolha a turma e o aluno para eu saber em que pasta salvar.'); return; }
    if (typeof fiskEnviarParaPasta !== 'function') { alert('Helper de Drive não carregou (fisk-drive.js).'); return; }
    fiskEnviarParaPasta(el('btnDrive'), {
      token: tokenSessao(), tipo: 'aluno',
      escola: cardLink.escola, professor: cardLink.prof, turma: cardLink.turma,
      aluno: cardLink.nome || pdf.aluno,
      filename: pdf.filename, bytes: pdf.bytes
    }).then(mostrarVerPasta).catch(function () { /* o helper já avisou */ });
  }

  /* ---- boot ---- */
  var eu = profDaSessao();
  if (eu) initSessao(eu); else initCascade();
  var d = el('btnDrive'); if (d) d.onclick = salvarNaPasta;
  var c = el('confirmClearBtn');
  if (c) c.addEventListener('click', function () {
    cardLink = null; window.RAF_DO_CARD = ''; window.ultimoPDF = null;
    esconderVerPasta(); syncDriveBtn();
    var sel = el('selAluno'); if (sel && sel.options.length) sel.selectedIndex = 0;
  });
})();
