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

✅ **Resposta**: 

📌 **Fonte**: 

---

### Cancelamento de Inscrição

❓ **P9 — Cancelamento de inscrição inativa (`INSCRICAO_INATIVA`)**: O que acontece se o participante tentar cancelar uma inscrição com status `cancelada` ou `expirada`?

➡️ Recomendo: Retorna erro `INSCRICAO_INATIVA`.

✅ **Resposta**: 

📌 **Fonte**: 

---

❓ **P10 — Prazo para cancelamento (`ATIVIDADE_JA_INICIADA`)**: Até quando o participante pode cancelar sua inscrição em uma atividade?

➡️ Recomendo: Até o início do primeiro encontro da atividade. Se a atividade já estiver iniciada (relação de `agora` com o início do primeiro encontro), retorna erro `ATIVIDADE_JA_INICIADA`.

✅ **Resposta**: 

📌 **Fonte**: 

---

❓ **P11 — Inscrição em Atividade Cancelada (`ATIVIDADE_CANCELADA`)**: O que acontece ao tentar se inscrever, confirmar ou cancelar inscrição em uma atividade cancelada?

➡️ Recomendo: Retorna erro `ATIVIDADE_CANCELADA`.

✅ **Resposta**: 

📌 **Fonte**: 

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

✅ **Resposta**: 

📌 **Fonte**: 

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

✅ **Resposta**: 

📌 **Fonte**: 

---

### Escopo e Campos Derivados

❓ **P14 — Campos derivados da Atividade (M1)**: Como as inscrições ativas afetam a visualização das atividades?

➡️ Recomendo:
- `ocupadas` = quantidade de inscrições com status `confirmada` ou `convocada`.
- `vagasRestantes` = `vagas` - `ocupadas` (nunca menor que 0).
- `emEspera` = quantidade de inscrições com status `em_espera`.

✅ **Resposta**: 

📌 **Fonte**: 

---
