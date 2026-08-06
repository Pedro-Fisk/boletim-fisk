/* ============================================================
   Aviso automático de "aluno fora do card".

   O professor PODE emitir documento para aluno que não está no card: cadastro
   atrasado (matrícula ou transferência que a secretaria ainda não concluiu, e
   que pode demorar) não é problema dele — o aluno está na sala e os pais
   precisam do documento. Mas o problema não pode ficar só na cabeça dele,
   então a ferramenta avisa a secretaria sozinha, na hora em que o documento
   sai. Do outro lado, o portal da secretaria tem o painel "Alunos fora do
   card" (backend: foraDoCardAvisar_ / secForaDoCard_).

   Deduplicação é no servidor, por escola+turma+aluno: emitir planner e termo
   do mesmo aluno é UMA pendência, não duas.

   Cópia local de propósito, como o fisk-drive.js: a tag fixa do CDN do
   fisk-shared.js é anterior a este arquivo. Se editar, editar todas as cópias
   (planner-fisk, boletim-fisk, fisk-hub, Card Tools/hub).
   ============================================================ */
(function () {
  var EP = 'https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec';

  function token() {
    try { var s = JSON.parse(localStorage.getItem('fisk_prof') || 'null'); return (s && s.token) || ''; }
    catch (e) { return ''; }
  }

  /**
   * Avisa a secretaria. Nunca rejeita: aviso que falha não pode derrubar a
   * geração do documento, que é o que o professor veio fazer.
   * dados: { documento, aluno, escola, professor, turma }
   * devolve Promise<{ avisado: boolean, motivo: string }>
   */
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

  window.fiskAvisarForaDoCard = function (dados) {
    dados = dados || {};
    var aluno = String(dados.aluno || '').trim();
    if (!aluno) return Promise.resolve({ avisado: false, motivo: 'sem nome de aluno' });
    if (!token()) {
      /* Sem sessão do Hub não há como avisar: este backend responde na internet
         aberta e o repositório é público, então escrita sem autenticação viraria
         porta para encher a planilha da secretaria de lixo. A tela avisa o
         professor para falar com a secretaria na mão. */
      return Promise.resolve({ avisado: false, motivo: 'sem_sessao' });
    }
    return fetch(EP, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'foraDoCard', token: token(), aluno: aluno,
        documento: String(dados.documento || 'documento'),
        escola: String(dados.escola || ''), professor: String(dados.professor || ''),
        turma: String(dados.turma || '')
      })
    }).then(jsonSeguro)
      .then(function (j) {
        if (j && j.ok) return { avisado: true, motivo: j.novo ? 'nova' : 'ja_havia' };
        return { avisado: false, motivo: (j && (j.code || j.erro)) || 'erro' };
      })
      .catch(function (e) { return { avisado: false, motivo: String(e.message || e) }; });
  };
})();
