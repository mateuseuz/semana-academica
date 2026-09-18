# Entrevista M2 — Inscrições e lista de espera

> Base: contrato-api.md (seção 5, M2).  
> Regras de negócio (prazos, limites, ordem, transições) **não** estão no contrato — são definidas aqui.  
> Quando o usuário responder "consultar requisitos", a pergunta fica **pendente** e será registrada como tal.

---

## Rodada 1 — Fronteira inicial

### Números e limites

❓ **P1 — Prazo de inscrições (`INSCRICOES_ENCERRADAS`)**: Até quando o participante pode se inscrever em uma atividade? (ex.: até o início do primeiro encontro, 24h antes, etc.)

➡️ Recomendo: Até o início do primeiro encontro da atividade.

✅ **Resposta**: Até 30 min antes do primeiro encontro (segundo o documento de requisitos envolvidos, as inscrições devem fechar 30 min antes do início do primeiro encontro).

📌 **Fonte**: Requisitos de Inscrição

---

❓ **P2 — Limite de minicursos por participante (`LIMITE_DE_MINICURSOS`)**: Qual é o limite máximo de minicursos em que um participante pode se inscrever?

➡️ Recomendo: No máximo 3 minicursos por participante.

✅ **Resposta**: No máximo 3 minicursos por participante.

📌 **Fonte**: Requisitos de Inscrição

---

❓ **P3 — Conflito de horário (`CONFLITO_DE_HORARIO`)**: O que configura conflito de horário? Se o participante tentar se inscrever em duas atividades cujos encontros se sobrepõem?

➡️ Recomendo: Qualquer sobreposição temporal de encontros (mesmo que seja de apenas 1 minuto) entre atividades ativas em que o participante já possui inscrição confirmada ou convocação ativa. Encontros de atividades canceladas ou inscrições inativas (canceladas, expiradas) não geram conflito. Inscrições com status `em_espera` também não geram conflito.

✅ **Resposta**: Ao ocupar uma vaga, o participante não pode ter outra inscrição que ocupe vaga (status `confirmada` ou `convocada`) com encontro sobreposto. Encontros que apenas se encostam (ex.: fim de um é início do outro) não configuram conflito. Quem está apenas na lista de espera (`em_espera`) não é verificado e não gera conflito de horário.

📌 **Fonte**: Requisitos de Inscrição

---

❓ **P4 — Status de Inscrição duplicada (`JA_INSCRITO`)**: Se um participante possui uma inscrição em uma atividade, o que determina se ele está "já inscrito"?

➡️ Recomendo: Se ele tiver inscrição com status `confirmada`, `em_espera` ou `convocada` → erro `JA_INSCRITO`. Se a inscrição anterior estiver `cancelada` ou `expirada`, ele pode tentar se inscrever novamente.

✅ **Resposta**: Apenas uma inscrição ativa (confirmada, em_espera ou convocada) por participante e atividade (RN-204). Quem cancelou (ou expirou) pode voltar a se inscrever normalmente, entrando pelo fim da fila. Tentar se inscrever tendo inscrição ativa gera erro `JA_INSCRITO` (NE-02).

📌 **Fonte**: RN-204, NE-02

---

### Funcionamento da Lista de Espera

❓ **P5 — Entrada na fila de espera**: Quando as vagas da atividade acabam (`vagasRestantes == 0`), a nova inscrição entra automaticamente como `em_espera`? Como a `posicaoNaEspera` é calculada?

➡️ Recomendo: Sim, se `vagasRestantes == 0`, a inscrição is criada com status `em_espera`. A `posicaoNaEspera` deve ser sequencial (1, 2, 3...) baseada na ordem de criação (`criadaEm`) das inscrições com status `em_espera` para aquela atividade.

✅ **Resposta**: Sim, se as vagas acabam (`vagasRestantes == 0`), a nova inscrição entra automaticamente como `em_espera`. A `posicaoNaEspera` é sequencial (1, 2, 3...) baseada na ordem de criação (`criadaEm`) das inscrições ativas com status `em_espera` para aquela atividade.

📌 **Fonte**: Requisitos de Inscrição / Recomendado

---

❓ **P6 — Promoção da lista de espera e convocação**: Quando uma vaga é liberada (ex: por cancelamento de uma inscrição `confirmada` ou `convocada`), o participante com `posicaoNaEspera = 1` é promovido? Ele vai para `confirmada` direto ou para `convocada`?

➡️ Recomendo: Promovido para `convocada`, exigindo confirmação explícita do participante.

✅ **Resposta**: Promovido para o status `convocada`, exigindo confirmação explícita do participante para garantir que ele ainda queira ir.

📌 **Fonte**: Requisitos de Inscrição / Recomendado

---

❓ **P7 — Prazo e expiração da convocação (`CONVOCACAO_EXPIRADA`, `convocadaAte`)**: Se o participante for promovido para `convocada`, qual o prazo limite (`convocadaAte`) que ele tem para confirmar? O que acontece após expirar?

➡️ Recomendo: Prazo de 24 horas a partir do momento da convocação. Se ele não confirmar a tempo, o relógio passa de `convocadaAte` e o status da inscrição deve virar `expirada` (ou na tentativa de confirmação pós-prazo), e o próximo da fila de espera (`posicaoNaEspera = 1`) é promovido para `convocada`.

✅ **Resposta**: O prazo é de exatamente 2 horas a partir da convocação (as inscrições expiram após esse prazo). Se ele não confirmar a tempo, o status passa a ser `expirada` e o próximo da lista de espera (`posicaoNaEspera = 1`) é promovido para `convocada`.

📌 **Fonte**: Requisitos de Inscrição

---

❓ **P8 — Confirmação de convocação (`POST /inscricoes/:id/confirmacao`)**: Quem pode confirmar e sob quais condições? Tentar confirmar uma inscrição já `confirmada` é erro ou idempotente?

➡️ Recomendo: Apenas inscrições com status `convocada` podem ser confirmadas. Confirmar uma inscrição já `confirmada` retorna 200 (idempotente). Confirmar inscrições `em_espera`, `cancelada` gera erro `SEM_CONVOCACAO`. Confirmar inscrição após `convocadaAte` gera erro `CONVOCACAO_EXPIRADA`.

✅ **Resposta**: Apenas o próprio participante da inscrição pode confirmar, desde que esteja `convocada` e dentro do prazo. Na confirmação, revalidar conflito de horário com outra inscrição que ocupe vaga e o limite de 3 minicursos ocupando vaga. Se houver conflito ou limite excedido, recusar a confirmação, mantendo a convocação válida até expirar. Não é idempotente: inscrição já `confirmada`, `em_espera` ou `cancelada` retorna `SEM_CONVOCACAO` (422). Tentativa após o vencimento da convocação retorna `CONVOCACAO_EXPIRADA` (422). A resposta substitui a recomendação anterior de confirmação idempotente. Ajustes posteriores: precedência em P13 e tratamento de `expirada` em P15.

📌 **Fonte**: Resposta do usuário — RN-201, RN-218, RN-219; RN-211, RN-212, RN-215; RN-206, RN-207, RN-214.

---

### Cancelamento de Inscrição

❓ **P9 — Cancelamento de inscrição inativa (`INSCRICAO_INATIVA`)**: O que acontece se o participante tentar cancelar uma inscrição com status `cancelada` ou `expirada`?

➡️ Recomendo: Retorna erro `INSCRICAO_INATIVA`.

**Resposta**: Cancelar uma inscrição `cancelada` ou `expirada` retorna 422 `INSCRICAO_INATIVA`.

**Fonte**: Usuário aceitou a recomendação de P9.

---

❓ **P10 — Prazo para cancelamento (`ATIVIDADE_JA_INICIADA`)**: Até quando o participante pode cancelar sua inscrição em uma atividade?

➡️ Recomendo: Até o início do primeiro encontro da atividade. Se a atividade já estiver iniciada (relação de `agora` com o início do primeiro encontro), retorna erro `ATIVIDADE_JA_INICIADA`.

**Resposta**: O participante pode cancelar apenas antes do início do primeiro encontro. No instante exato do início ou depois, retornar 422 `ATIVIDADE_JA_INICIADA`.

**Fonte**: Usuário aceitou a recomendação de P10, incluindo a fronteira exata do início.

**Cenários de verificação**: Para uma inscrição ativa em atividade não cancelada, permitir cancelamento antes do primeiro encontro; recusar no instante exato do início e após ele com 422 `ATIVIDADE_JA_INICIADA`.

---

❓ **P11 — Inscrição em Atividade Cancelada (`ATIVIDADE_CANCELADA`)**: O que acontece ao tentar se inscrever, confirmar ou cancelar inscrição em uma atividade cancelada?

**Restrição do contrato**: Nova inscrição em atividade cancelada retorna 422 `ATIVIDADE_CANCELADA`. A seção 6 não prevê esse código para confirmar ou cancelar inscrição; a recomendação anterior de aplicá-lo às três operações foi corrigida.

**Pergunta retomada**: Ao cancelar uma atividade, o que acontece com suas inscrições `confirmada`, `convocada` e `em_espera`?

**Recomendação atual**: Passar todas a `cancelada`, sem novas convocações; depois, tentar confirmar retorna 422 `SEM_CONVOCACAO` e tentar cancelar retorna 422 `INSCRICAO_INATIVA`. A precedência quando a data de início também tiver passado permanece por decidir.

**Resposta**: Usuário aceitou a recomendação atual. Cancelar a atividade passa todas as inscrições `confirmada`, `convocada` e `em_espera` para `cancelada`, sem novas convocações. Depois, tentar confirmar retorna 422 `SEM_CONVOCACAO`; tentar cancelar novamente retorna 422 `INSCRICAO_INATIVA`. Nova inscrição retorna 422 `ATIVIDADE_CANCELADA`. A precedência quando a data de início também tiver passado permanece pendente.

**Fonte**: Usuário — "aceitar recomendada para pergunta 11"; contrato-api.md, seção 6, e decisões P8/P9.

**Complemento confirmado durante a escrita da spec**: Usuário escolheu "Estado antes do prazo". No cancelamento de inscrição, verificar o estado antes do relógio: `INSCRICAO_INATIVA` (422) prevalece sobre `ATIVIDADE_JA_INICIADA` (422), inclusive após o início previsto de uma atividade cancelada. Este complemento resolve a pendência de precedência acima.

**Cenários de verificação**: Cancelar atividade com inscrições nos três estados ativos e verificar que todas ficam `cancelada`, sem promover a fila. Antes do início previsto, tentar confirmar, cancelar novamente e criar nova inscrição, verificando os respectivos erros acima. Cancelar inscrição inativa no instante do início ou depois retorna 422 `INSCRICAO_INATIVA`, antes da verificação de prazo.

---

### Ordem e Precedência de Erros

❓ **P12 — Prioridade de erro na Inscrição (`POST /atividades/:id/inscricoes`)**: Havendo múltiplos erros simultâneos, qual a ordem de precedência?

➡️ Recomendo:
1. `USUARIO_DESCONHECIDO` (401)
2. `SOMENTE_PARTICIPANTE` (403)
3. `NAO_ENCONTRADO` (404, se atividade não existe)
4. `ATIVIDADE_CANCELADA` (422)
5. `JA_INSCRITO` (409)
6. `INSCRICOES_ENCERRADAS` (422)
7. `INSCRICAO_BLOQUEADA` (422, se aplicável por M5)
8. `LIMITE_DE_MINICURSOS` (422)
9. `CONFLITO_DE_HORARIO` (409)

**Resposta**: Recomendação anterior rejeitada. Ordem definida pelo usuário: inexistente (404 `NAO_ENCONTRADO`) → `ATIVIDADE_CANCELADA` (422) → `INSCRICOES_ENCERRADAS` (422) → `INSCRICAO_BLOQUEADA` (422, com M5) → `JA_INSCRITO` (409) → `CONFLITO_DE_HORARIO` (409) → `LIMITE_DE_MINICURSOS` (422). Preservar a ordem geral do contrato: identificação → perfil → existência → corpo (quando aplicável) → regras do recurso.

**Fonte**: Usuário, citando RN-208.

**Cenários de verificação**: Prazo encerrado com inscrição ativa retorna `INSCRICOES_ENCERRADAS`; bloqueio com inscrição ativa retorna `INSCRICAO_BLOQUEADA` quando M5 existir; conflito e limite simultâneos retornam `CONFLITO_DE_HORARIO`, com as verificações anteriores satisfeitas.

---

❓ **P13 — Prioridade de erro na Confirmação de Convocação (`POST /inscricoes/:id/confirmacao`)**: Qual a precedência de erros?

➡️ Recomendo:
1. `USUARIO_DESCONHECIDO` (401)
2. `SOMENTE_PARTICIPANTE` (403)
3. `NAO_ENCONTRADO` (404, se inscrição não existe)
4. `ATIVIDADE_CANCELADA` (422)
5. `CONVOCACAO_EXPIRADA` (422, se expirou)
6. `SEM_CONVOCACAO` (422, se status não for convocada)
7. `LIMITE_DE_MINICURSOS` (422)
8. `CONFLITO_DE_HORARIO` (409)

**Resposta**: Recomendação anterior substituída. Após as verificações gerais do contrato: `SEM_CONVOCACAO` → `CONVOCACAO_EXPIRADA` → `CONFLITO_DE_HORARIO` → `LIMITE_DE_MINICURSOS`. Primeiro verificar o estado de convocação, depois o prazo. Não usar `ATIVIDADE_CANCELADA` nesta operação, conforme P11. P15 esclarece que status `expirada` retorna `CONVOCACAO_EXPIRADA`, não `SEM_CONVOCACAO`.

**Fonte**: Usuário, citando RN-214, RN-215 e RN-208; esclarecimento posterior em P15.

**Cenários de verificação**: Inscrição confirmada retorna `SEM_CONVOCACAO`; convocação vencida com conflito retorna `CONVOCACAO_EXPIRADA`; convocação válida com conflito e limite simultâneos retorna `CONFLITO_DE_HORARIO`.

---

### Escopo e Campos Derivados

❓ **P14 — Campos derivados da Atividade (M1)**: Como as inscrições ativas afetam a visualização das atividades?

➡️ Recomendo:
- `ocupadas` = quantidade de inscrições com status `confirmada` ou `convocada`.
- `vagasRestantes` = `vagas` - `ocupadas` (nunca menor que 0).
- `emEspera` = quantidade de inscrições com status `em_espera`.

**Resposta**: Usuário aceitou a recomendação. `ocupadas` = inscrições `confirmada` + `convocada`; `vagasRestantes` = `vagas` − `ocupadas`, nunca negativa; `emEspera` = inscrições `em_espera`.

**Fonte**: Usuário, citando RN-111 e definições do M2.

**Cenários de verificação**: Atividade com 2 confirmadas, 1 convocada e 3 em espera reporta `ocupadas` 3, `vagasRestantes` `vagas` − 3 e `emEspera` 3; cancelamento e expiração reduzem `ocupadas` e `emEspera` e podem disparar novas convocações.

---

## Rodada 2 — Fronteira após P8–P14

### Lista de espera e relógio

❓ **P15 — Inscrição `expirada` na confirmação**: Tentar confirmar uma inscrição cujo status já é `expirada` retorna `SEM_CONVOCACAO` (prioridade do status em P13) ou `CONVOCACAO_EXPIRADA`?

➡️ Recomendo: consultar requisitos — conciliar com P8, que lista `expirada` sob `SEM_CONVOCACAO`.

**Resposta**: Status `expirada` retorna `CONVOCACAO_EXPIRADA` (422). `SEM_CONVOCACAO` vale apenas para inscrições que não estão nem estiveram em convocação vencida: `em_espera`, `confirmada`, `cancelada`.

**Fonte**: Usuário, citando RN-215. Não partiu da recomendação (que sugeria consultar requisitos); decisões colidentes em P8 foram ajustadas por esta.

**Cenários de verificação**: Convocação vencida e não confirmada fica `expirada`; confirmá-la retorna `CONVOCACAO_EXPIRADA`; confirmar inscrições `em_espera`, `confirmada` e `cancelada` retorna `SEM_CONVOCACAO`.

---

❓ **P16 — Instante exato do prazo de convocação**: Com `agora == convocadaAte`, a convocação ainda é válida ou já venceu?

➡️ Recomendo: considerar vencida; confirmar somente com `agora < convocadaAte`.

**Resposta**: Recomendação rejeitada. O prazo é inclusivo: com `agora == convocadaAte` a confirmação ainda é válida; vence somente com `agora > convocadaAte`.

**Fonte**: Usuário, citando a seção 5 do contrato e RN-211.

**Cenários de verificação**: Com relógio em `convocadaAte` exato, confirmar retorna 200 e fica `confirmada`; um milissegundo depois, retorna `CONVOCACAO_EXPIRADA`.

---

❓ **P17 — Até quando a fila convoca**: Qual o limite temporal para novas convocações a partir da lista de espera?

➡️ Recomendo: encerrar no início do primeiro encontro.

**Resposta**: Recomendação rejeitada. Novas convocações ocorrem apenas até o fechamento das inscrições, 30 min antes do primeiro encontro (P1). Vaga liberada após o fechamento não convoca ninguém; a fila congela.

**Fonte**: Usuário, citando RN-202 e RN-212.

**Cenários de verificação**: Vaga liberada antes do fechamento convoca o primeiro da fila; liberada depois, não convoca e `emEspera` permanece.

---

❓ **P18 — Empate na fila de espera**: Se duas inscrições `em_espera` tiverem o mesmo `criadaEm`, como ordenar?

➡️ Recomendo: preservar a ordem de inserção, inclusive com o relógio de teste parado.

**Resposta**: Usuário aceitou a recomendação. A fila respeita rigorosamente a ordem de chegada, mantendo a sequência de inserção quando `criadaEm` for idêntico.

**Fonte**: Usuário, citando RN-216.

**Cenários de verificação**: Duas inscrições `em_espera` criadas no mesmo instante mantêm posições 1 e 2 na ordem de inserção; após promoção da primeira, a segunda assume a posição 1.

---

❓ **P19 — Convocação próxima do fechamento**: Se a convocação ocorrer perto do fechamento das inscrições, `convocadaAte` mantém as 2 horas ou é limitado ao fechamento?

➡️ Recomendo: limitar `convocadaAte` ao fechamento das inscrições.

**Resposta**: Usuário aceitou a recomendação. `convocadaAte` = mínimo entre `agora + 2h` e o fechamento das inscrições (30 min antes do primeiro encontro). Após o fechamento não há novas convocações (P17), e convocação pendente vence no máximo no fechamento.

**Fonte**: Usuário — "aceito a recomendação de ambas"; coerente com P1, P7 e P17.

**Cenários de verificação**: Convocação a 2h30 do fechamento tem prazo de 2h; convocação a 1h do fechamento tem prazo no fechamento; após o fechamento nenhuma convocação nova ocorre.

---

❓ **P20 — Tempo avançando sem acessos**: Ao avançar o relógio por várias horas, expirações e convocações intermediárias são reconstruídas cronologicamente ou só no próximo acesso?

➡️ Recomendo: reconstruir cronologicamente, respeitando P17.

**Resposta**: Usuário aceitou a recomendação. O sistema processa os eventos pendentes em ordem cronológica ao avançar o relógio: expirações e promoções da fila ocorrem na sequência correta, respeitando o limite de P17.

**Fonte**: Usuário — "aceito a recomendação de ambas"; coerente com a seção 3 do contrato.

**Cenários de verificação**: Convocada com prazo de 2h e fechamento adiante: avançar o relógio além do prazo marca `expirada` e convoca o próximo da fila; avançar além do fechamento com fila pendente não convoca ninguém.

---

❓ **P21 — Visibilidade na listagem (`GET /inscricoes`, `GET /inscricoes/:id`)**: Outro participante vê a inscrição alheia? A organização vê todas? O que retorna ao consultar inscrição de outro?

➡️ Recomendo: participante recebe só as próprias (inscrição de outro → 404 `NAO_ENCONTRADO`); organização vê todas; filtro `?atividadeId=` restringe a própria listagem.

**Resposta**: Usuário aceitou a recomendação. Participante vê apenas as próprias inscrições; inscrição de outro participante responde 404 `NAO_ENCONTRADO`. Organização vê todas as inscrições. O filtro `?atividadeId=` restringe a listagem.

**Fonte**: Usuário — "p-21 aceitar recomendação".

**Cenários de verificação**: Participante lista e recebe só as próprias; organizador lista e recebe todas; participante consultando inscrição alheia por id recebe 404.

---

❓ **P22 — Vaga reaberta após o fechamento das inscrições**: Cancelamento ou expiração depois do fechamento reabre a vaga? `vagasRestantes` volta a subir? A fila é convocada?

➡️ Recomendo: após o fechamento, nada é convocado e `vagasRestantes` não muda — quem cancelou já foi, a vaga não é reofertada; contadores ficam congelados na leitura.

**Resposta**: A fila não é convocada: vaga liberada após o fechamento não convoca ninguém. A vaga não é reaberta para inscrição, pois as inscrições já estão encerradas. `vagasRestantes` volta a subir: o cancelamento é permitido até o início da atividade e, ao cancelar, a inscrição deixa de ocupar vaga, fazendo o cálculo `vagasRestantes = vagas - ocupadas` subir numericamente — mas a vaga fica ociosa.

**Fonte**: Usuário, citando RN-212, RN-202, RN-209 e RN-111.

---
