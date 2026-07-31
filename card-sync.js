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
  var API_URL = 'https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec';

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
  function api(params) {
    var P = comSessao(params);
    var qs = Object.keys(P).map(function (k) {
      return k + '=' + encodeURIComponent(P[k]);
    }).join('&');
    return fetch(API_URL + '?' + qs)
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

  /* ---- monta o registro legível da nota no card a partir de STATE[pk] ----
     Formato humano (a célula fica "cortada" no card — só aparece ao clicar):
       Lançamento de nota - dd/mm/aaaa
       PROFESSOR
       prova de escuta: 10
       prova de escrita: 9
       (linha em branco)
       média (com todos os critérios do boletim): 9,8
     Guarda só o essencial: escuta (A), escrita (B) e a média geral. */
  function buildCell(p, level) {
    var escuta = short(p[FIELDS[0]]);   // A = prova de escuta (Listening)
    var escrita = short(p[FIELDS[1]]);  // B = prova de escrita (Written)
    var prof = (cardLink && cardLink.prof) || '';
    var dataStr = (p.date && String(p.date).trim()) || hoje();
    return 'Lançamento de nota - ' + dataStr + '\n' +
           (prof ? prof + '\n' : '') +
           'prova de escuta: ' + escuta + '\n' +
           'prova de escrita: ' + escrita + '\n\n' +
           'média (com todos os critérios do boletim): ' + fmt(finalGrade(p));
  }

  /* ---- lê de volta as notas do card ---- Aceita o formato NOVO
     ("prova de escuta: X" / "prova de escrita: Y") e, por compatibilidade,
     o ANTIGO ("[EST] … · média M\nA.. B.. …"). Só escuta (A) e escrita (B). */
  function parseCardNotes(cellText) {
    var res = {}, txt = String(cellText || '');
    var mE = txt.match(/prova de escuta:\s*([0-9]+(?:[.,][0-9]+)?)/i);
    var mW = txt.match(/prova de escrita:\s*([0-9]+(?:[.,][0-9]+)?)/i);
    if (mE) res[LETTER2FIELD['A']] = +mE[1].replace(',', '.');
    if (mW) res[LETTER2FIELD['B']] = +mW[1].replace(',', '.');
    if (!mE && !mW) { // formato antigo: última linha "A.. B.."
      var lines = txt.split('\n'), noteLine = lines[lines.length - 1];
      var re = /(?:^|\s)([A-H])\s*([0-9]+(?:[.,][0-9]+)?)/g, m;
      while ((m = re.exec(noteLine))) { res[LETTER2FIELD[m[1]]] = +m[2].replace(',', '.'); }
    }
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
  /* indicador de carregamento do dropdown: '' | 'spin' | 'ok' */
  function ind(id, estado) { var e = el(id); if (e) e.className = 'ind' + (estado ? ' ' + estado : ''); }

  /* ============ SESSÃO DO PROFESSOR (SSO do Fisk Hub) ============
     O boletim roda no MESMO origin do Hub (pedro-fisk.github.io), então a
     sessão gravada no login do Hub vale aqui — dá para pular escola e
     professor(a) e ir direto na turma. */
  function sessao() { try { return JSON.parse(localStorage.getItem('fisk_prof') || 'null'); } catch (e) { return null; } }
  function actingSaved() { try { return JSON.parse(localStorage.getItem('fisk_actas') || 'null'); } catch (e) { return null; } }
  /* quem a ferramenta deve assumir: o professor logado ou, no acesso da
     direção, aquele escolhido em "Ver como professor" no Hub. */
  function profDaSessao() {
    var s = sessao(); if (!s || !s.name) return null;
    if (s.master) { var a = actingSaved(); return (a && a.name) ? { name: a.name, escolas: a.escolas || '' } : null; }
    return { name: s.name, escolas: String(s.escolas || s.escola || '') };
  }

  /* a turma carrega sozinha ao ser escolhida — o valor do <option> carrega
     junto a escola porque o professor pode dar aula nas duas unidades */
  function carregarTurma(escola, prof, linha) {
    ind('indTurma', 'spin'); setStatus('🔄 Lendo a turma ao vivo…');
    return api({ fn: 'turma', escola: escola, prof: prof, linha: linha })
      .then(function (d) { ind('indTurma', 'ok'); onTurmaLoaded(d); })
      .catch(function (e) { ind('indTurma', ''); setStatus('⚠️ ' + e.message, 'err'); });
  }

  /* ============ MODO LOGADO: só a turma ============ */
  function initSessao(p) {
    var escolas = String(p.escolas || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!escolas.length) return initCascade();

    el('cardCascade').hidden = false;
    el('wrapEscola').hidden = true; el('wrapProf').hidden = true;
    el('cardEuSou').hidden = false;
    el('cardEuNome').textContent = p.name;
    el('cardEuEscola').textContent = escolas.join(' + ');
    setStatus('Escolha a turma — escola e professor(a) já vêm do seu login.');

    var selTurma = el('selTurma');
    resetSel(selTurma, 'Turma…'); ind('indTurma', 'spin');
    Promise.all(escolas.map(function (esc) {
      return api({ fn: 'turmas', escola: esc, prof: p.name })
        .then(function (j) {
          return (j.turmas || []).map(function (t) {
            return { escola: esc, linha: t.linhaTitulo, titulo: t.titulo };
          });
        })
        .catch(function () { return []; });   // escola sem aba desse professor não derruba a outra
    })).then(function (listas) {
      var todas = [].concat.apply([], listas);
      if (!todas.length) {
        /* nome da sessão sem aba correspondente no card (professor novo,
           aba renomeada): cai na cascata em vez de deixar a tela travada */
        ind('indTurma', '');
        el('cardEuSou').hidden = true;
        initCascade();
        setStatus('Não achei turmas de "' + p.name + '" no card — escolha na mão.', 'err');
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

    el('btnTrocarProf').onclick = function () {
      el('cardEuSou').hidden = true;
      initCascade();
    };
  }

  /* ============ CASCATA COMPLETA (escola → prof → turma) ============
     Usada sem sessão e no "trocar professor(a)" — substituições são
     frequentes e todo professor precisa alcançar a turma de qualquer colega. */
  function initCascade() {
    el('cardCascade').hidden = false;
    el('wrapEscola').hidden = false; el('wrapProf').hidden = false;
    setStatus('Escolha escola, professor(a) e turma — os dados vêm ao vivo do card.');
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
    /* ao escolher a turma (último dropdown) ela carrega AUTOMATICAMENTE */
    selTurma.onchange = function () {
      if (!selTurma.value) return;
      carregarTurma(selEscola.value, selProf.value, selTurma.value);
    };
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
        cardLink = null; window.RAF_DO_CARD = ''; syncPushBtn();
        setStatus('Sem vínculo com o card — o boletim NÃO será lançado na planilha.');
        return;
      }
      var a = alunos[+sel.value]; if (!a) return;
      selecionarAluno(a, dados);
    };
  }

  /* ============ SELEÇÃO DE UM ALUNO ============ */
  function selecionarAluno(a, dados) {
    /* `turma` entra no vínculo porque é o nome da PASTA da turma no Drive
       (o boletim é salvo em Planners <escola> → prof → turma → aluno). */
    cardLink = { escola: dados.escola, prof: dados.aba, turma: dados.turma || '',
                 linhaCard: a.linhaCard, book: a.book, nome: a.nome, raf: a.raf || '' };
    /* o RAF entra no NOME DO ARQUIVO do PDF (fileBase em script.js) — permite,
       no futuro, localizar os boletins do aluno no Drive sem mexer em permissões */
    window.RAF_DO_CARD = String(a.raf || '').trim();
    window.ultimoPDF = null;   // trocou de aluno: o PDF em memória é do anterior
    esconderVerPasta();
    var hits = el('driveHits'); if (hits) { hits.hidden = true; hits.innerHTML = ''; }
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
      // o card é o registro oficial; o planner é um extra que nunca pode
      // derrubar o lançamento — por isso vem depois e engole os próprios erros
      return atualizarPlannerNoDrive(p, av);
    }).catch(function (e) {
      setPush('⚠️ Não consegui lançar: ' + e.message, '#c0392b');
    }).finally(function () { if (btn) btn.disabled = false; });
  }

  /* ============ A MESMA NOTA NO PLANNER DO ALUNO ============
     Depois de lançar no card, a nota vai para a tabela do cabeçalho do planner
     que já está salvo na pasta do aluno no Drive: baixa o PDF, preenche os
     campos do formulário e regrava por cima (o backend substitui arquivo de
     mesmo nome).

     ⚠️ ARMADILHA DOS NOMES DOS CAMPOS. Os nomes internos do formulário NÃO
     batem com os rótulos impressos — estão deslocados uma linha. O campo
     chamado "…TESTWRITING" fica na linha do LISTENING, o "…TESTLISTENING" na
     do ORAL, e assim por diante; a linha de cima (WRITING) é um widget do
     campo AVERAGE. Conferido em 30/07/2026 cruzando as coordenadas dos
     widgets com o texto da página do PDF. O mapa abaixo é POR POSIÇÃO —
     nunca "corrigir" isto para os nomes baterem, senão a nota de escrita sai
     impressa na linha de listening do planner do aluno.

     COLUNAS: cada TEST tem 3 sub-colunas. A nota vai na PRIMEIRA de cada
     bloco — sufixo vazio na 1ª avaliação, "_4" na 2ª. */
  var PLANNER_LINHAS = [
    { rotulo: 'WRITING',       campo: '1st TEST 2nd TESTAVERAGE.1',     valor: function (p) { return num(p.writtenTest); } },
    { rotulo: 'LISTENING',     campo: '1st TEST 2nd TESTWRITING',       valor: function (p) { return num(p.listeningTest); } },
    { rotulo: 'ORAL',          campo: '1st TEST 2nd TESTLISTENING',     valor: function (p) { return avg([p.fluency, p.pronunciation]); } },
    { rotulo: 'PARTICIPATION', campo: '1st TEST 2nd TESTORAL',          valor: function (p) { return num(p.participation); } },
    { rotulo: 'CYBER',         campo: '1st TEST 2nd TESTPARTICIPATION', valor: function (p) { return num(p.dedication); } },
    { rotulo: 'AVERAGE',       campo: '1st TEST 2nd TESTAVERAGE.0',     valor: function (p) { return finalGrade(p); } }
  ];

  /* 1ª avaliação = 1ª coluna do bloco "1st TEST" (nome base).
     2ª avaliação = 1ª coluna do bloco "2nd TEST" (sufixo _4, antes do .0/.1). */
  function campoDaAvaliacao(campo, av) {
    if (Number(av) !== 2) return campo;
    var m = campo.match(/^(.+?)(\.\d+)$/);
    return m ? m[1] + '_4' + m[2] : campo + '_4';
  }

  function plannerMsg(html, color) {
    var box = el('cardPushStatus'); if (!box) return;
    box.innerHTML += '<br><span style="font-size:12px;color:' + (color || '#5a6b74') + '">' + html + '</span>';
  }

  function atualizarPlannerNoDrive(p, av) {
    if (!cardLink) return;
    if (typeof PDFLib === 'undefined' || typeof fiskBuscarNoDrive !== 'function') {
      plannerMsg('Planner não atualizado (biblioteca de PDF não carregou).', '#c0392b');
      return;
    }
    var base = { token: tokenSessao(), escola: cardLink.escola, professor: cardLink.prof,
                 turma: cardLink.turma, aluno: cardLink.nome };
    var lista = {}; for (var k in base) lista[k] = base[k];
    lista.padrao = 'planner';
    plannerMsg('🔄 Procurando o planner de ' + esc(cardLink.nome) + ' no Drive…', '#0e7fb5');
    return fiskBuscarNoDrive(lista).then(function (r) {
      var arqs = r.arquivos || [];
      if (!arqs.length) {
        plannerMsg('Nenhum planner na pasta de ' + esc(cardLink.nome) +
                   ' — a nota foi para o card, mas não para o planner.', '#b8860b');
        return;
      }
      // vem ordenado do mais recente; se houver mais de um, o atual é o certo
      return preencherPlanner(base, arqs[0].nome, p, av);
    }).catch(function (e) {
      plannerMsg('Não deu para atualizar o planner: ' + esc(e.message || String(e)), '#c0392b');
    });
  }

  function preencherPlanner(base, nome, p, av) {
    var opts = {}; for (var k in base) opts[k] = base[k];
    opts.filename = nome;
    return fiskBuscarNoDrive(opts).then(function (f) {
      return PDFLib.PDFDocument.load(f.bytes).then(function (pdf) {
        var form = pdf.getForm();
        var escritos = [], faltando = [];
        PLANNER_LINHAS.forEach(function (linha) {
          var v = linha.valor(p);
          if (v === null || v === undefined || v === '') return;
          var alvo = campoDaAvaliacao(linha.campo, av);
          try {
            form.getTextField(alvo).setText(fmt(v));
            escritos.push(linha.rotulo);
          } catch (err) {
            // modelo sem tabela de notas (New Focus, Pathways, In Focus Review)
            faltando.push(linha.rotulo);
          }
        });
        if (!escritos.length) {
          plannerMsg('O planner “' + esc(nome) + '” não tem tabela de notas — ' +
                     'estágios sem avaliação formal não recebem nota.', '#b8860b');
          return;
        }
        return pdf.embedFont(PDFLib.StandardFonts.Helvetica).then(function (font) {
          form.updateFieldAppearances(font);
          return pdf.save();
        }).then(function (bytes) {
          var envio = {}; for (var k2 in base) envio[k2] = base[k2];
          envio.tipo = 'aluno'; envio.filename = nome; envio.bytes = bytes;
          return fiskSalvarNoDrive(envio).then(function () {
            plannerMsg('✓ Planner “' + esc(nome) + '” atualizado com a ' + av +
                       'ª avaliação (' + escritos.join(', ') + ').', '#1e8f4e');
          });
        });
      });
    });
  }

  function syncPushBtn() {
    var b = el('cardPushBtn'); if (b) b.hidden = !cardLink;
    syncDriveBtn();
  }

  /* ============ SALVAR NA PASTA DO ALUNO (Drive) ============
     Só aparece com vínculo ao card (é de lá que vêm escola/professor/turma,
     os nomes das pastas) E depois que o PDF existe (window.ultimoPDF). */
  function syncDriveBtn() {
    var b = el('btnDrive'); if (!b) return;
    b.hidden = !(cardLink && window.ultimoPDF);
  }
  window.onPDFGerado = syncDriveBtn;   // script.js chama ao terminar de gerar

  /* depois de salvar, o professor precisa CONFERIR onde caiu (a pasta é achada
     por aproximação): o botão leva direto à pasta do aluno no Drive. */
  function mostrarVerPasta(r) {
    var b = el('btnVerPasta'); if (!b) return;
    var url = (r && (r.pastaUrl || r.url)) || '';
    if (!url) { b.hidden = true; return; }
    b.href = url;
    b.title = 'Abrir no Drive a pasta "' + ((r && r.pasta) || '') + '"';
    b.hidden = false;
  }
  function esconderVerPasta() { var b = el('btnVerPasta'); if (b) b.hidden = true; }

  function salvarNaPasta() {
    var pdf = window.ultimoPDF;
    if (!pdf) { alert('Baixe o PDF primeiro — é ele que vai para a pasta.'); return; }
    if (!cardLink) { alert('Sem vínculo com o card: escolha escola, professor(a), turma e aluno para eu saber em que pasta salvar.'); return; }
    if (typeof fiskEnviarParaPasta !== 'function') { alert('Helper de Drive não carregou (fisk-drive.js).'); return; }
    fiskEnviarParaPasta(el('btnDrive'), {
      token: tokenSessao(), tipo: 'aluno',
      escola: cardLink.escola, professor: cardLink.prof, turma: cardLink.turma,
      aluno: cardLink.nome || pdf.aluno,
      filename: pdf.filename, bytes: pdf.bytes
    }).then(function (r) {
      setPush('✓ Boletim salvo na pasta "' + (r && r.pasta ? r.pasta : cardLink.nome) + '".', '#1e8f4e');
      mostrarVerPasta(r);
    }).catch(function () { /* o helper já avisou o professor no alert */ });
  }

  /* ============ BUSCAR O BOLETIM DA 1ª AVALIAÇÃO NO DRIVE ============
     Poupa o professor de procurar o PDF no Drive e subir à mão: a pasta do
     aluno é a mesma em que o "Salvar na pasta do aluno" grava. Depende do
     vínculo com o card (escola/professor/turma/aluno = nomes das pastas). */
  function driveMsg(html, color) {
    var box = el('driveHits'); if (!box) return;
    box.hidden = false;
    box.innerHTML = '<span style="font-weight:700;font-size:12.5px;color:' + (color || '#5a6b74') + '">' + html + '</span>';
  }

  function buscarNoDrive() {
    if (!cardLink) {
      driveMsg('Escolha escola, professor(a), turma e aluno em “Conectar ao card” — é de lá que eu sei em que pasta procurar.', '#c0392b');
      return;
    }
    if (typeof fiskBuscarNoDrive !== 'function') { driveMsg('Helper de Drive não carregou (fisk-drive.js).', '#c0392b'); return; }
    var btn = el('btnBuscarDrive'), old = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Procurando no Drive…'; }
    var base = { token: tokenSessao(), escola: cardLink.escola, professor: cardLink.prof,
                 turma: cardLink.turma, aluno: cardLink.nome };
    driveMsg('🔄 Procurando o boletim de ' + cardLink.nome + ' na pasta do aluno…', '#0e7fb5');
    fiskBuscarNoDrive(base).then(function (r) {
      var arqs = r.arquivos || [];
      if (!arqs.length) {
        /* a busca só lista os boletins gerados aqui; outros PDFs da pasta são
           contados para o professor entender por que não apareceram */
        driveMsg('Nenhum boletim desta ferramenta na pasta “' + esc(r.pasta || cardLink.nome) + '”' +
                 (r.outros ? ' (há ' + r.outros + ' outro(s) PDF lá, de outras origens — esses precisam ser subidos à mão)' : '') +
                 '. Suba o arquivo abaixo.', '#c0392b');
        return;
      }
      /* um só: baixa direto. Vários: o professor escolhe — os nomes repetem
         entre semestres e adivinhar carregaria a avaliação errada. */
      if (arqs.length === 1) return baixarEcarregar(base, arqs[0].nome);
      var box = el('driveHits');
      box.hidden = false;
      box.innerHTML = '<div style="font-weight:700;font-size:12.5px;margin-bottom:6px">Achei na pasta “' +
        esc(r.pasta || cardLink.nome) + '” — qual é o boletim da 1ª avaliação?</div>';
      arqs.forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
        b.style.cssText = 'display:block;margin:4px 0;text-align:left';
        b.textContent = '📄 ' + a.nome;
        b.onclick = function () { baixarEcarregar(base, a.nome); };
        box.appendChild(b);
      });
    }).catch(function (e) {
      if (e.code === 'pasta_nao_encontrada') {
        driveMsg('⚠️ A pasta de ' + esc(cardLink.nome) + ' não foi encontrada no drive compartilhado. ' +
                 'Confira a pasta no Drive ou suba o PDF abaixo.' + (e.message ? ' (' + esc(e.message) + ')' : ''), '#c0392b');
      } else {
        driveMsg('Não deu para buscar no Drive: ' + esc(e.message || String(e)), '#c0392b');
      }
    }).finally(function () { if (btn) { btn.disabled = false; btn.textContent = old; } });
  }

  function baixarEcarregar(base, nome) {
    driveMsg('⬇️ Baixando “' + esc(nome) + '”…', '#0e7fb5');
    var opts = {}; for (var k in base) opts[k] = base[k];
    opts.filename = nome;
    return fiskBuscarNoDrive(opts).then(function (f) {
      if (typeof window.ingestBoletimPDF !== 'function') throw new Error('leitor de PDF não carregou');
      driveMsg('✓ “' + esc(nome) + '” carregado do Drive.', '#1e8f4e');
      /* .buffer é o ArrayBuffer que o loadFromPDF/ocrPDF esperam */
      return window.ingestBoletimPDF(f.bytes.buffer, 'do Drive');
    }).catch(function (e) {
      driveMsg('Não deu para abrir “' + esc(nome) + '”: ' + esc(e.message || String(e)), '#c0392b');
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ============ BOOT ============ */
  function boot() {
    var standalone = (window.parent === window);
    if (location.hash.indexOf('#t=') === 0) initFromFragment();
    else {
      var eu = profDaSessao();
      if (eu) initSessao(eu); else initCascade();
    }

    var pushBtn = el('cardPushBtn');
    if (pushBtn) pushBtn.onclick = function () { pushToCard(); };
    var driveBtn = el('btnDrive');
    if (driveBtn) driveBtn.onclick = salvarNaPasta;
    var buscarBtn = el('btnBuscarDrive');
    if (buscarBtn) buscarBtn.onclick = buscarNoDrive;
    /* ao baixar o PDF, lança automaticamente no card (idempotente) */
    var pdfBtn = el('pdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', function () { if (cardLink) setTimeout(pushToCard, 300); });
    /* 🧹 Limpar: solta o vínculo e reabre a escolha de aluno da turma */
    var clearBtn = el('confirmClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      /* zera também o PDF em memória: ele é de OUTRO aluno a partir daqui */
      cardLink = null; window.RAF_DO_CARD = ''; window.ultimoPDF = null;
      esconderVerPasta();
      var h = el('driveHits'); if (h) { h.hidden = true; h.innerHTML = ''; }
      syncPushBtn(); setPush('');
      var sel = el('selAluno'); if (sel && sel.options.length) sel.selectedIndex = 0;
    });
    syncPushBtn();
  }
  boot();
})();
