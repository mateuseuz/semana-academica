# Spec — Grade de Atividades (M1)

## 1. Objetivo
Permite à organização gerenciar a grade de atividades da Semana Acadêmica 2026 — criar, listar, alterar e cancelar atividades (palestras e minicursos), definindo seus encontros, salas e vagas, com validação completa de consistência e controle de situação automático pelo relógio de teste.

## 2. Fora de escopo
- M1 **não** gerencia inscrições, presença, certificados, bloqueios ou painel (ficam para M2–M5).
- M1 **não** cria nem altera usuários ou salas (dados iniciais são carregados pelo sistema).
- Campos derivados (`ocupadas`, `vagasRestantes`, `emEspera`) são calculados a partir de dados de M2/M3, mas M1 não valida regras de negócio de inscrição.

## 3. Modelo

### Atividade
| Campo | Tipo | Origem | Imutável |
|---|---|---|---|
| `id` | `string` (`atv_xxxxxxxx`) | Gerado pelo sistema | Sim |
| `titulo` | `string` | Cliente | Não |
| `tipo` | `"palestra" \| "minicurso"` | Cliente | Sim |
| `salaId` | `string` (ex.: `"lab-3"`) | Cliente | Sim |
| `vagas` | `integer` (1 a capacidade da sala) | Cliente | Não |
| `encontros` | `Array<Encontro>` | Cliente | Sim |
| `cargaHorariaMinutos` | `integer` | Calculado (soma das durações dos encontros) | Não |
| `situacao` | `"prevista" \| "em_andamento" \| "encerrada" \| "cancelada"` | Calculado (relógio de teste) | Não |
| `ocupadas` | `integer` | Calculado (dados de M2) | Não |
| `vagasRestantes` | `integer` | Calculado (`vagas - ocupadas`) | Não |
| `emEspera` | `integer` | Calculado (dados de M2) | Não |

### Encontro
| Campo | Tipo | Origem |
|---|---|---|
| `id` | `string` (`enc_xxxxxxxx`) | Gerado pelo sistema |
| `inicio` | `string` (ISO 8601) | Cliente |
| `fim` | `string` (ISO 8601) | Cliente |

### Sala
| Campo | Tipo | Origem |
|---|---|---|
| `id` | `string` | Dado inicial do sistema |
| `nome` | `string` | Dado inicial do sistema |
| `capacidade` | `integer` | Dado inicial do sistema |

## 4. Endpoints

### `GET /atividades`
- **Sucesso:** 200 `[Atividade]`
- **Filtros:** `?dia=AAAA-MM-DD` (qualquer encontro no dia), `?tipo=palestra|minicurso` (case-sensitive, lista vazia se valor inválido)

### `GET /atividades/:id`
- **Sucesso:** 200 `Atividade`

### `POST /atividades`
- **Entrada:** `{ titulo, tipo, salaId, vagas, encontros }`
- **Sucesso:** 201 `Atividade`

### `PATCH /atividades/:id`
- **Entrada:** qualquer subconjunto de `{ titulo, tipo, salaId, vagas, encontros }` (campos imutáveis rejeitados)
- **Sucesso:** 200 `Atividade`

### `POST /atividades/:id/cancelamento`
- **Sucesso:** 200 `Atividade`

## 5. Regras

### Validação de criação (`POST /atividades`) — ordem de verificação:

**R1** — `DADOS_INVALIDOS` (422): Corpo não é JSON, campo obrigatório ausente ou tipo errado.

**R2** — `QUANTIDADE_DE_ENCONTROS` (422): Quantidade de encontros fora do permitido. Palestra tem exatamente 1 encontro (RN-102). Minicurso tem de 2 a 5 encontros (RN-103).

**R3** — `ENCONTRO_INVALIDO` (422): Qualquer encontro viola uma das seguintes condições (RN-104, RN-105, RN-106):
- `inicio >= fim`
- Fora do período do evento (19/10/2026 a 23/10/2026)
- Duração ≤ 0 ou > 4h (RN-104)
- `inicio` e `fim` não no mesmo dia (RN-105)
- Encontros da mesma atividade se sobrepõem (RN-106)

**R4** — `VAGAS_ACIMA_DA_CAPACIDADE` (422): `vagas` maior que a capacidade da sala informada, ou `vagas < 1` (RN-107).

**R5** — `CONFLITO_DE_SALA` (409): Dois encontros de atividades (excluindo canceladas) na mesma sala com menos de 15 minutos entre o fim de um e o início do outro (RN-108).

### Validação de alteração (`PATCH /atividades/:id`) — ordem de verificação:

**R6** — `CAMPO_NAO_EDITAVEL` (422): Tentativa de alterar `id`, `tipo`, `salaId` ou `encontros`.

**R7** — `QUANTIDADE_DE_ENCONTROS` (422): Se `encontros` for alterado, a nova quantidade viola R2.

**R8** — `ENCONTRO_INVALIDO` (422): Se `encontros` for alterado, os novos encontros violam R3.

**R9** — `VAGAS_ACIMA_DA_CAPACIDADE` (422): Novo valor de `vagas` maior que a capacidade da sala.

**R10** — `VAGAS_ABAIXO_DOS_INSCRITOS` (409): Novo valor de `vagas` menor que o número de inscrições atuais na atividade.

**R11** — `CONFLITO_DE_SALA` (409): Novo `encontros` ou `salaId` causa conflito de sala conforme R5.

### Cancelamento (`POST /atividades/:id/cancelamento`) — ordem de verificação:

**R12** — `ATIVIDADE_JA_INICIADA` (422): Tentativa de cancelar atividade com `situacao` `em_andamento` ou `encerrada` (RN-112). O cancelamento só é permitido antes de a atividade começar.

**R13** — `ATIVIDADE_CANCELADA` (422): Tentativa de cancelar atividade já cancelada (RN-113). Cancelamento é definitivo e idempotente na recusa — não pode ser cancelado nem alterado novamente.

**R14** — Situação calculada pelo relógio (RN-114): `prevista` → `em_andamento` quando `agora` passa o início do 1º encontro; `em_andamento` → `encerrada` quando `agora` passa o fim do último encontro. `cancelada` prevalece sobre qualquer situação.

### Filtros e listagem:

**R15** — `GET /atividades?dia=`: Retorna atividades com qualquer encontro no dia informado (início ≤ fim_do_dia E fim ≥ início_do_dia).

**R16** — `GET /atividades?tipo=`: Case-sensitive, aceita apenas `"palestra"` ou `"minicurso"`. Qualquer outro valor → lista vazia (sem erro).

## 6. Critérios de aceite

1. **(R2)** `POST /atividades` com minicurso e 1 encontro → 422 `QUANTIDADE_DE_ENCONTROS`.
2. **(R2)** `POST /atividades` com palestra e 2 encontros → 422 `QUANTIDADE_DE_ENCONTROS`.
3. **(R3)** `POST /atividades` com encontro onde `inicio >= fim` → 422 `ENCONTRO_INVALIDO`.
4. **(R3)** `POST /atividades` com encontro fora de 19/10–23/10/2026 → 422 `ENCONTRO_INVALIDO`.
5. **(R3)** `POST /atividades` com encontro de 5h de duração → 422 `ENCONTRO_INVALIDO`.
6. **(R3)** `POST /atividades` com encontros da mesma atividade se sobrepondo → 422 `ENCONTRO_INVALIDO`.
7. **(R4)** `POST /atividades` com vagas > capacidade da sala → 422 `VAGAS_ACIMA_DA_CAPACIDADE`.
8. **(R4)** `POST /atividades` com vagas = 0 → 422 `VAGAS_ACIMA_DA_CAPACIDADE`.
9. **(R5)** `POST /atividades` com dois encontros na mesma sala com 10 min de intervalo → 409 `CONFLITO_DE_SALA`.
10. **(R5)** `POST /atividades` com dois encontros na mesma sala com 20 min de intervalo → 201 (aceito).
11. **(R6)** `PATCH /atividades/:id` alterando `tipo` → 422 `CAMPO_NAO_EDITAVEL`.
12. **(R6)** `PATCH /atividades/:id` alterando `salaId` → 422 `CAMPO_NAO_EDITAVEL`.
13. **(R6)** `PATCH /atividades/:id` alterando `encontros` → 422 `CAMPO_NAO_EDITAVEL`.
14. **(R7+R8)** `PATCH /atividades/:id` alterando `encontros` para quantidade inválida → 422 `QUANTIDADE_DE_ENCONTROS` (verificado antes de `ENCONTRO_INVALIDO`).
15. **(R9)** `PATCH /atividades/:id` aumentando vagas além da capacidade → 422 `VAGAS_ACIMA_DA_CAPACIDADE`.
16. **(R10)** `PATCH /atividades/:id` reduzindo vagas abaixo de inscrições → 409 `VAGAS_ABAIXO_DOS_INSCRITOS`.
17. **(R11)** `PATCH /atividades/:id` movendo encontros para sala com conflito → 409 `CONFLITO_DE_SALA`.
18. **(R12)** `POST /atividades/:id/cancelamento` em atividade `em_andamento` → 422 `ATIVIDADE_JA_INICIADA`.
19. **(R12)** `POST /atividades/:id/cancelamento` em atividade `encerrada` → 422 `ATIVIDADE_JA_INICIADA`.
20. **(R13)** `POST /atividades/:id/cancelamento` em atividade já `cancelada` → 422 `ATIVIDADE_CANCELADA`.
21. **(R13)** `POST /atividades/:id/cancelamento` em atividade `prevista` → 200, atividade passa a `cancelada`.
22. **(R14)** Após `POST /_teste/reset`, relógio em 19/10/2026 09:00, criada atividade com encontro iniciando às 19/10 19:00 → ao avançar relógio para 19/10 19:00, `situacao` muda para `em_andamento`.
23. **(R14)** Ao avançar relógio para após o fim do último encontro, `situacao` muda para `encerrada`.
24. **(R15)** `GET /atividades?dia=2026-10-19` retorna atividades com qualquer encontro em 19/10/2026.
25. **(R16)** `GET /atividades?tipo=palestra` retorna apenas palestras; `GET /atividades?tipo=invalido` retorna lista vazia.
26. **(Sucesso)** `POST /atividades` com dados válidos → 201 com campos calculados corretos (`cargaHorariaMinutos`, `situacao: "prevista"`).
27. **(Sucesso)** `GET /atividades/:id` retorna atividade criada.
28. **(Sucesso)** `PATCH /atividades/:id` com `titulo` e `vagas` válidos → 200.

## 7. Como isto será verificado
A costura é HTTP, via `criarServidor()` do projeto, conforme definido em `contrato-api.md`. O juiz roda a API com `MODO_TESTE=1` e `PORT=3000`, usando `POST /_teste/reset` para inicializar e `PUT /_teste/relogio` para controlar o tempo. Testes verificam status, corpo de erro (`{"erro": "CODIGO", "mensagem": "..."}`) e campos da atividade retornada.

## 8. Fatias de entrega

**Fatia 1 — Criação básica (R1, R2, R3, R4, R5, R15, R16)**
- Implementar `POST /atividades` com todas as validações de criação.
- Implementar `GET /atividades` com filtros `?dia` e `?tipo`.
- Verificar: criar atividade válida → 201; cada erro individual → status e código corretos.

**Fatia 2 — Consulta e detalhes (R15, R16)**
- Implementar `GET /atividades/:id`.
- Confirmar filtros funcionam corretamente.
- Verificar: listar por dia e tipo retorna resultados esperados.

**Fatia 3 — Alteração (R6, R7, R8, R9, R10, R11)**
- Implementar `PATCH /atividades/:id` com todas as validações de alteração.
- Verificar: campos imutáveis são rejeitados; cada erro na ordem correta; sucesso com campos editáveis.

**Fatiar 4 — Cancelamento e situação (R12, R13, R14)**
- Implementar `POST /atividades/:id/cancelamento`.
- Implementar cálculo automático de `situacao` pelo relógio de teste.
- Verificar: cancelar prevista → 200; cancelar já cancelada → erro; cancelar iniciada → erro; relógio avança situação corretamente.
