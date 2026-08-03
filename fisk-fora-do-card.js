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
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok) return { avisado: true, motivo: j.novo ? 'nova' : 'ja_havia' };
        return { avisado: false, motivo: (j && (j.code || j.erro)) || 'erro' };
      })
      .catch(function (e) { return { avisado: false, motivo: String(e.message || e) }; });
  };
})();
