# Spec — M2 — Inscrições e lista de espera

## 1. Objetivo
Permitir que o participante da Semana Acadêmica 2026 se inscreva em atividades (palestras e minicursos), ocupe ou espere por uma vaga, confirme sua convocação quando promovido da lista de espera e cancele inscrições — tudo antes do início da atividade — na ótica do participante que quer garantir seu lugar e da organização que precisa saber quantas vagas estão ocupadas, quantas aguardam e quem pode ser convocado quando uma vaga se libera.

## 2. Fora de escopo
- Criação, alteração e cancelamento de atividades e cálculo da situação da atividade (escopo do M1, que já expõe `ocupadas`, `vagasRestantes` e `emEspera` derivados das inscrições).
- Registro de presença nos encontros (escopo do M3).
- Emissão de certificados e extrato de horas (escopo do M4).
- Bloqueio de participantes por faltas (`INSCRICAO_BLOQUEADA` depende do M5; esta spec registra onde o erro entra na precedência, mas o gatilho é do M5).
- Painel da organização, planilha de frequência e gestão de bloqueios (escopo do M5).

## 3. Modelo
### Inscricao
| Campo | Tipo | Origem |
|---|---|---|
| `id` | string, prefixo `ins_` + 8 hexadecimais minúsculos | calculado (gerado pelo sistema) |
| `atividadeId` | string | informado (na URL da rota de criação) |
| `participanteId` | string | informado (cabeçalho `X-Usuario`) |
| `status` | `"confirmada" \| "em_espera" \| "convocada" \| "cancelada" \| "expirada"` | calculado (vagas disponíveis na criação; transições por convocação, confirmação, cancelamento e expiração) |
| `posicaoNaEspera` | número (1, 2, …) ou null | derivado (ordinal de `criadaEm` na fila de ativas `em_espera`; só quando `em_espera`) — nunca guardado |
| `convocadaAte` | instante ISO 8601 ou null | calculado no instante da convocação: `min(agora + 2h, fechamentoDasInscricoes)`; fica fixo a partir daí |
| `criadaEm` | instante ISO 8601 | calculado (relógio no momento da criação) |

Campo derivado nunca é guardado: `posicaoNaEspera` é sempre recalculado a partir das inscrições ativas `em_espera` — com `criadaEm` idêntico, vale a ordem de inserção (P18). `convocadaAte` é o oposto: fixado uma vez na convocação (P19) e não acompanha o relógio depois.

### Campos derivados de Atividade alimentados por inscrições (regra no M1, listados aqui como efeito)
- `ocupadas` = nº de inscrições `confirmada` + `convocada` na atividade.
- `vagasRestantes` = `vagas` − `ocupadas`, nunca menor que 0.
- `emEspera` = nº de inscrições `em_espera` na atividade.

## 4. Endpoints
| Método | Rota | Quem | Corpo de entrada | Sucesso |
|---|---|---|---|---|
| POST | `/atividades/:id/inscricoes` | participante | (sem corpo) | 201 `Inscricao` |
| GET | `/inscricoes` | todos (participante vê as próprias, organização vê todas) | — | 200 `[Inscricao]` — filtro `?atividadeId=` |
| GET | `/inscricoes/:id` | todos (participante vê as próprias, organização vê todas) | — | 200 `Inscricao` |
| POST | `/inscricoes/:id/cancelamento` | participante | (sem corpo) | 200 `Inscricao` |
| POST | `/inscricoes/:id/confirmacao` | participante | (sem corpo) | 200 `Inscricao` |

*(Nota: Organização tem acesso apenas de leitura (GET) em inscrições; tentar criar, confirmar ou cancelar inscrições retorna 403 `SOMENTE_PARTICIPANTE` — RN-201, RN-219).*

## 5. Regras
Ordem geral de verificações (contrato, seção 1): identificação (401) → perfil (403) → existência (404) → corpo (422 `DADOS_INVALIDOS`) → regras do recurso. As regras abaixo numeram as recusas de regras do recurso de cada operação; quando duas podem recusar a mesma operação, vale a primeira listada.

> **Normalização das fontes:** a entrevista M2 numera as perguntas como `P1`–`P22`; referências no formato `P-01`, `P-11` etc. apontam para a mesma pergunta. As regras citam a pergunta e os RN-xxx/NE-xx quando a entrevista os cita.

### Criar inscrição — `POST /atividades/:id/inscricoes`
- **R1 (P12):** Ordem de recusa desta operação: `NAO_ENCONTRADO` (404) → `ATIVIDADE_CANCELADA` (422) → `INSCRICOES_ENCERRADAS` (422) → `INSCRICAO_BLOQUEADA` (422, só com M5) → `JA_INSCRITO` (409) → `CONFLITO_DE_HORARIO` (409) → `LIMITE_DE_MINICURSOS` (422). Fonte: usuário, citando RN-208.
- **R2 (P1):** O prazo de inscrição vai até 30 minutos antes do início do primeiro encontro (fechamento das inscrições). Inscrever nesse instante ou depois → 422 `INSCRICOES_ENCERRADAS`. Fonte: requisitos de inscrição.
- **R3 (P4):** Apenas uma inscrição ativa por participante e atividade. Ter inscrição `confirmada`, `em_espera` ou `convocada` na mesma atividade → 409 `JA_INSCRITO`. Quem cancelou (`cancelada`) ou expirou (`expirada`) pode se inscrever de novo, entrando pelo fim da fila. Fonte: RN-204, NE-02.
- **R4 (P3):** Conflito de horário: recusa com 409 `CONFLITO_DE_HORARIO` quando o participante já tem inscrição que ocupe vaga (`confirmada` ou `convocada`) em outra atividade com encontro sobreposto ao da atividade alvo. Horários encostados (ex.: uma atividade acaba às 12:00 e outra começa às 12:00) não configuram conflito e são permitidos — RN-206. Encontros de atividades canceladas e inscrições não ativas (`cancelada`, `expirada`) não geram conflito; quem está só `em_espera` não é verificado. Fonte: requisitos de inscrição / RN-206.
- **R5 (P2):** No máximo 3 minicursos por participante ocupando vaga. Ultrapassar → 422 `LIMITE_DE_MINICURSOS`. Fonte: requisitos de inscrição.
- **R6 (P5):** Se `vagasRestantes > 0` na criação, a inscrição nasce `confirmada`; se `vagasRestantes == 0`, nasce `em_espera`, no fim da fila. Fonte: requisitos de inscrição / recomendado (aceito).
- **R7 (P5, P18):** `posicaoNaEspera` é sequencial (1, 2, 3…) pela ordem de `criadaEm` das inscrições ativas `em_espera` da atividade; em empate de `criadaEm`, prevalece a ordem de inserção (inclusive com o relógio de teste parado). Fonte: requisitos / RN-216.
- **R8 (P11):** Nova inscrição em atividade cancelada → 422 `ATIVIDADE_CANCELADA`. Fonte: contrato seção 6; decisão P11.
- **R9 (P14):** `ocupadas` = inscrições `confirmada` + `convocada`; `vagasRestantes` = `vagas` − `ocupadas`, nunca negativa; `emEspera` = inscrições `em_espera`. Fonte: usuário, RN-111.

### Lista de espera, convocação e relógio
- **R10 (P6):** Liberada a vaga (por cancelamento ou expiração de inscrição `confirmada`/`convocada`, ou por aumento de vagas da atividade realizado pela organização) antes do fechamento, o primeiro da fila (`posicaoNaEspera = 1`) é promovido para `convocada` — não para `confirmada` — exigindo confirmação explícita. Fonte: requisitos / recomendado (aceito); RN-111, RN-211.
- **R11 (P7, P19):** `convocadaAte` = mínimo entre `agora + 2h` (contado da convocação) e o fechamento das inscrições (30 min antes do primeiro encontro, P1). Fonte: requisitos de inscrição; P19 (recomendação aceita).
- **R12 (P7):** Sem confirmação até o prazo, a inscrição vira `expirada` e o próximo da fila (`posicaoNaEspera = 1`) é promovido para `convocada`. Fonte: requisitos de inscrição.
- **R13 (P16):** O prazo é inclusivo: com `agora == convocadaAte` a confirmação ainda é válida; a convocação vence somente com `agora > convocadaAte`. Fonte: usuário, seção 5 do contrato e RN-211 (recomendação contrária rejeitada).
- **R14 (P17):** Novas convocações ocorrem apenas até o fechamento das inscrições. Vaga liberada depois não convoca ninguém — a fila congela. Fonte: usuário, RN-202 e RN-212 (recomendação de convocar até o início rejeitada).
- **R15 (P18):** A fila respeita rigorosamente a ordem de chegada; com `criadaEm` idêntico, mantém a sequência de inserção. Promovido o primeiro, o segundo assume a posição 1. Fonte: usuário, RN-216.
- **R16 (P20):** Avançando o relógio sem acessos, eventos pendentes são reconstruídos em ordem cronológica: expirações e promoções da fila ocorrem na sequência correta dos instantes, respeitando o limite de P17 — nenhuma promoção anterior ao fechamento é pulada e nada é convocado depois dele. Fonte: usuário ("aceito a recomendação de ambas"); coerente com a seção 3 do contrato.
- **R17 (P22):** Após o fechamento das inscrições, vaga liberada (cancelamento ou expiração) não é reofertada e não convoca ninguém; `vagasRestantes` volta a subir numericamente pelo cálculo `vagas − ocupadas` — a vaga fica ociosa. Fonte: usuário, RN-212, RN-202, RN-209, RN-111 (recomendação de contadores congelados rejeitada em parte).
- **R18 (P21):** Participante vê apenas as próprias inscrições; a inscrição de outro participante responde 404 `NAO_ENCONTRADO` na consulta por id. Organização vê todas as inscrições. Contudo, a organização tem apenas perfil de leitura (GET); tentar criar, confirmar ou cancelar inscrições (inclusive por outros usuários) retorna 403 `SOMENTE_PARTICIPANTE` — RN-201, RN-219. O filtro `?atividadeId=` restringe a listagem. Fonte: usuário ("p-21 aceitar recomendação"), RN-201, RN-219.

### Confirmar convocação — `POST /inscricoes/:id/confirmacao`
- **R19 (P13):** Ordem de recusa, após as verificações gerais do contrato: `SEM_CONVOCACAO` → `CONVOCACAO_EXPIRADA` → `CONFLITO_DE_HORARIO` → `LIMITE_DE_MINICURSOS`. Primeiro o estado de convocação, depois o prazo. `ATIVIDADE_CANCELADA` não se usa nesta operação (P11). Fonte: usuário, RN-214, RN-215, RN-208; esclarecimento em P15.
- **R20 (P8, P15):** Confirma apenas o próprio participante, com inscrição `convocada` dentro do prazo. Inscrições `em_espera`, `confirmada` ou `cancelada` → 422 `SEM_CONVOCACAO`; status `expirada` → 422 `CONVOCACAO_EXPIRADA`. Não é idempotente. Fonte: usuário — RN-201, RN-218, RN-219, RN-215; resposta substitui a recomendação idempotente de P8.
- **R21 (P8):** Na confirmação, revalidar conflito de horário (R4) e limite de 3 minicursos (R5) contando inscrições que ocupam vaga. Havendo conflito ou limite excedido, recusar a confirmação mantendo a convocação válida até expirar. Fonte: usuário — RN-206, RN-207, RN-214, RN-211, RN-212.
- **R22 (P8):** Confirmação bem-sucedida muda o status de `convocada` para `confirmada`. Fonte: P8.

### Cancelar inscrição — `POST /inscricoes/:id/cancelamento`
- **R23 (P9):** Cancelar inscrição `cancelada` ou `expirada` → 422 `INSCRICAO_INATIVA`. Fonte: usuário aceitou a recomendação de P9.
- **R24 (P10):** O cancelamento é permitido apenas antes do início do primeiro encontro; no instante exato do início ou depois → 422 `ATIVIDADE_JA_INICIADA`. Fonte: usuário, incluindo a fronteira exata do início.
- **R25 (P11, complemento registrado na entrevista):** No cancelamento, o estado da inscrição é verificado antes do relógio: cancelar inscrição inativa (`cancelada`/`expirada`), inclusive no instante do início ou depois, responde `INSCRICAO_INATIVA` antes de `ATIVIDADE_JA_INICIADA`.
- **R26 (P11):** Cancelar a atividade passa todas as suas inscrições `confirmada`, `convocada` e `em_espera` para `cancelada`, sem novas convocações. Depois disso: confirmar → 422 `SEM_CONVOCACAO`; cancelar novamente → 422 `INSCRICAO_INATIVA`; nova inscrição → 422 `ATIVIDADE_CANCELADA` (R8). Fonte: usuário ("aceitar recomendada para pergunta 11"); contrato seção 6; decisões P8/P9.

### Lacunas reais registradas (sem política inventada)
- **L1:** Tratamento de candidato `em_espera` que, ao ser convocado, esteja em conflito de horário ou exceda o limite de minicursos não está definido (a revalidação de R21 cobre a confirmação, mas não se decidiu o que acontece com a convocação em si — se é recusada, pulada ou mantida).

## 6. Critérios de aceite
1. (R1, R2, R3) Prazo encerrado com inscrição ativa na mesma atividade → 422 `INSCRICOES_ENCERRADAS` (a precedência de R1 vale: `INSCRICOES_ENCERRADAS` antes de `JA_INSCRITO`).
2. (R1, R4, R5) Conflito de horário e limite de minicursos simultâneos → 409 `CONFLITO_DE_HORARIO` (R1: conflito antes do limite), com as verificações anteriores satisfeitas.
3. (R2) Inscrição em atividade com vagas, antes do fechamento (30 min antes do 1º encontro) → 201, status `confirmada`.
4. (R2) Inscrição exatamente 30 min antes do 1º encontro ou depois → 422 `INSCRICOES_ENCERRADAS`.
5. (R3) Segunda inscrição ativa na mesma atividade → 409 `JA_INSCRITO`; após cancelar ou expirar, nova inscrição → 201 no fim da fila.
6. (R4) Inscrição em atividade cujo encontro encosta no de outra inscrição `confirmada` (fim de uma às 12:00 e início de outra às 12:00) → 201, sem conflito (RN-206).
7. (R5) Quarta inscrição `confirmada` em minicurso → 422 `LIMITE_DE_MINICURSOS`.
8. (R6) Inscrição com `vagasRestantes == 0` → 201, status `em_espera` e `posicaoNaEspera` no fim da fila.
9. (R7, R15) Duas inscrições `em_espera` criadas no mesmo instante (relógio parado) mantêm posições 1 e 2 na ordem de inserção; após promoção da primeira, a segunda assume a posição 1.
10. (R9) Atividade com 2 confirmadas, 1 convocada e 3 em espera reporta `ocupadas` 3, `vagasRestantes` = `vagas` − 3 e `emEspera` 3; cancelamento e expiração reduzem `ocupadas`/`emEspera` e podem disparar convocações.
11. (R10, R12) Cancelada uma inscrição `confirmada` antes do fechamento (ou aumentada a capacidade da atividade pela organização), o primeiro da fila passa a `convocada` com `convocadaAte` preenchido.
12. (R11) Convocação a 2h30 do fechamento tem `convocadaAte` = agora + 2h; convocação a 1h do fechamento tem `convocadaAte` = fechamento.
13. (R12, R13, R16) Convocada com prazo de 2h e fechamento adiante: avançar o relógio além do prazo marca `expirada` e convoca o próximo da fila.
14. (R13) Com relógio em `convocadaAte` exato, confirmar → 200 e status `confirmada`; um milissegundo depois → 422 `CONVOCACAO_EXPIRADA`.
15. (R14, R17) Vaga liberada antes do fechamento convoca o primeiro da fila; liberada depois, não convoca, `emEspera` permanece e `vagasRestantes` sobe sem reoferta.
16. (R16) Avançar o relógio além do fechamento com fila pendente não convoca ninguém — promoções anteriores ao fechamento não são puladas (reconstrução cronológica).
17. (R18) Participante lista e recebe só as próprias inscrições; organizador lista e recebe todas; filtro `?atividadeId=` restringe a listagem; participante consultando inscrição alheia por id → 404 `NAO_ENCONTRADO`. Organização tentando criar, confirmar ou cancelar inscrições → 403 `SOMENTE_PARTICIPANTE`.
18. (R19, R20) Confirmar inscrição já `confirmada` (ou `em_espera`/`cancelada`) → 422 `SEM_CONVOCACAO`.
19. (R19, R20) Confirmar inscrição `expirada` → 422 `CONVOCACAO_EXPIRADA`.
20. (R13, R19) Convocação vencida com conflito → 422 `CONVOCACAO_EXPIRADA` (prazo antes de conflito).
21. (R19, R21) Convocação válida com conflito e limite simultâneos → 409 `CONFLITO_DE_HORARIO` (conflito antes do limite), convocação permanece válida.
22. (R22) Confirmar convocação dentro do prazo → 200, status `confirmada`.
23. (R23) Cancelar inscrição já `cancelada` ou `expirada` → 422 `INSCRICAO_INATIVA`.
24. (R24) Cancelar inscrição ativa antes do 1º encontro → 200; no instante exato do início e depois → 422 `ATIVIDADE_JA_INICIADA`.
25. (R23, R25) Cancelar inscrição inativa depois do início → 422 `INSCRICAO_INATIVA` (antes de `ATIVIDADE_JA_INICIADA`).
26. (R26) Cancelar atividade com inscrições `confirmada`, `convocada` e `em_espera`: todas ficam `cancelada`, sem promover a fila; antes do início previsto, confirmar → 422 `SEM_CONVOCACAO`, cancelar novamente → 422 `INSCRICAO_INATIVA`, nova inscrição → 422 `ATIVIDADE_CANCELADA`.
27. (R8) Nova inscrição em atividade cancelada → 422 `ATIVIDADE_CANCELADA`.
28. (R25) Cancelar inscrição inativa em atividade cujo início já passou → 422 `INSCRICAO_INATIVA` (e não `ATIVIDADE_JA_INICIADA`).

## 7. Como isto será verificado
Testes de integração HTTP pela costura mais externa existente: servidor subido com `criarServidor()` (porta efêmera `porta: 0`), falando por `fetch`, com `POST /_teste/reset` antes de cada cenário e o relógio simulado controlado por `PUT /_teste/relogio` (contrato, seção 3: no modo de teste o relógio fica parado e toda regra temporal usa esse relógio — nunca a hora do sistema). Padrão do projeto: `node --test` + `node:assert/strict`, arquivo em `verificacoes/` espelhando `verificacoes/presenca.spec.js`. Toda fronteira temporal (fechamento 30 min antes, `convocadaAte` inclusivo, início exato do encontro) é verificada posicionando o relógio no instante exato e um milissegundo adiante. Cenários de M5 (`INSCRICAO_BLOQUEADA`) só são verificáveis quando o M5 existir.

## 8. Fatias de entrega
- **Fatia 1:** Criar inscrição com vagas e enfileirar (R2, R3, R6, R7, R9) — 201 `confirmada`, 201 `em_espera` com posição, erros `JA_INSCRITO`, `LIMITE_DE_MINICURSOS`, `CONFLITO_DE_HORARIO`.
- **Fatia 2:** Prazo de inscrição e atividade cancelada (R1, R2, R8) — `INSCRICOES_ENCERRADAS` na fronteira exata, `ATIVIDADE_CANCELADA`, ordem de precedência da criação.
- **Fatia 3:** Cancelamento de inscrição (R23, R24, R25) — `INSCRICAO_INATIVA`, `ATIVIDADE_JA_INICIADA` na fronteira exata, precedência `INSCRICAO_INATIVA` antes do relógio.
- **Fatia 4:** Convocação e confirmação (R10, R11, R12, R13, R19, R20, R21, R22) — promoção da fila, `convocadaAte` com teto do fechamento, expiração, `SEM_CONVOCACAO`/`CONVOCACAO_EXPIRADA`, revalidação de conflito e limite.
- **Fatia 5:** Relógio avançando e limites da fila (R14, R15, R16, R17) — fila congelada após o fechamento, reconstrução cronológica, `vagasRestantes` ocioso.
- **Fatia 6:** Cancelamento de atividade e listagem (R26, R18) — transição em massa para `cancelada`, erros subsequentes, visibilidade de `GET /inscricoes` e `GET /inscricoes/:id`, restrição de perfil da organização.
