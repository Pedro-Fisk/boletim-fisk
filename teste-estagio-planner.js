/* Testa o casamento de estágio entre o boletim e o nome do arquivo do planner. */
const src = require('fs').readFileSync(__dirname + '/card-sync.js', 'utf8');
eval(src.slice(src.indexOf('  function stageCode(level) {'), src.indexOf('  /* ---- nota curta para o card')));
eval(src.slice(src.indexOf('  function stageCodeDoNome(nome) {'), src.indexOf('  function plannerMsg(')));

let falhas = 0;
const ok = (c, m, x) => { console.log((c ? '  ok  ' : ' FALHA ') + m + (c ? '' : ' -> ' + JSON.stringify(x))); if (!c) falhas++; };
const casa = (nivel, nome) => stageCodeDoNome(nome) === stageCode(nivel);

// nome novo (com espaços) e antigo (com underline) do mesmo estágio
ok(casa('Essentials 1', 'Planner - Essentials 1 - João da Silva.pdf'), 'Essentials 1 casa com o nome novo');
ok(casa('Essentials 1', 'Planner_Essentials_1_Joao_da_Silva.pdf'), 'Essentials 1 casa com o nome ANTIGO (underline)');
ok(casa('Transitions 2', 'Planner - Transitions 2 - Ana.pdf'), 'Transitions 2 casa');
ok(casa('Fluency 1', 'Planner - Fluency 1 - Ana.pdf'), 'Fluency 1 casa');

// o caso que motivou a mudança: aluno subiu de estágio
ok(!casa('Essentials 1', 'Planner - Essentials 2 - João.pdf'), 'ESS1 NAO casa com planner de ESS2 (o bug que existia)');
ok(!casa('Transitions 1', 'Planner - Transitions 2 - Ana.pdf'), 'TRA1 nao casa com TRA2');
ok(!casa('Fluency 2', 'Planner - Fluency 1 - Ana.pdf'), 'FLU2 nao casa com FLU1');
ok(!casa('Essentials 2', 'Planner - Transitions 1 - Ana.pdf'), 'estagios diferentes nao casam');

// nome do aluno com palavra que confunde
ok(casa('Fluency 1', 'Planner - Fluency 1 - Review Santos.pdf'), 'sobrenome "Review" nao rouba o estagio');
ok(stageCodeDoNome('Planner - In Focus Review - Ana.pdf') === 'FOCUS', 'In Focus Review vira FOCUS, nao REV');
ok(stageCodeDoNome('Planner - Review - Ana.pdf') === 'REV', 'Review sozinho vira REV');
ok(stageCodeDoNome('Planner - Inmediato 2 (Espanhol) - Ana.pdf') === 'INM2', 'Inmediato 2 vira INM2');
ok(stageCodeDoNome('Planner - Pathways (Pos-Avancado) - Ana.pdf') === 'PATH', 'Pathways vira PATH');
ok(stageCodeDoNome('boletim de Ana.pdf') === '', 'arquivo sem estagio devolve vazio');

// o card escreve "In Focus"; o planner se chama "New Focus" — os dois viram FOCUS
ok(stageCode('In Focus') === 'FOCUS' && stageCodeDoNome('Planner - New Focus - Ana.pdf') === 'FOCUS',
   'card "In Focus" e planner "New Focus" casam (ambos FOCUS)');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntodos os casos passaram');
process.exit(falhas ? 1 : 0);
