# Entrevista M1 — Grade de Atividades

> Base: contrato-api.md (seção 5, M1).  
> Regras de negócio (prazos, limites, ordem, transições) **não** estão no contrato — são definidas aqui.  
> Quando o usuário responder "consultar requisitos", a pergunta fica **pendente** e será registrada como tal.

---

## Rodada 1 — Fronteira inicial

### Números e limites

❓ **P1 — Quantidade de encontros por atividade**: Qual o mínimo e máximo de encontros permitidos ao criar uma atividade? (Erro `QUANTIDADE_DE_ENCONTROS`)

➡️ Recomendo: mínimo 1, máximo 5 (compatível com minicursos de até 5 dias).

✅ **Resposta**: Palestra tem exatamente 1 encontro (RN-102). Minicurso tem de 2 a 5 encontros (RN-103).

📌 **Fonte**: RN-102, RN-103

---

❓ **P2 — Validação de encontro (`ENCONTRO_INVALIDO`)**: O que torna um encontro inválido? Marque todas que se aplicam:
- Início ≥ fim
- Fora do período do evento (19/10 a 23/10/2026)
- Duração zero ou negativa
- Duração acima de X horas (qual?)
- Início/fim não alinhados a intervalos (ex.: meias horas)
- Outro: ___________

➡️ Recomendo: início < fim, dentro do período do evento, duração > 0 e ≤ 8h por encontro.

✅ **Resposta**: Início ≥ fim; Fora do período do evento (19/10 a 23/10/2026); Duração zero ou negativa; Duração acima de X horas. Cada encontro dura no mínimo 1h e no máximo 4h (RN-104). Começa e termina no mesmo dia entre 19/10/2026 e 23/10/2026 (RN-105). Encontros da mesma atividade não se sobrepõem (RN-106).

📌 **Fonte**: RN-104, RN-105, RN-106

---

❓ **P3 — Vagas vs capacidade da sala (`VAGAS_ACIMA_DA_CAPACIDADE`)**: A regra é simplesmente `vagas ≤ capacidade`? Ou há margem (ex.: +10%)?

➡️ Recomendo: `vagas ≤ capacidade` estrito, sem margem.

✅ **Resposta**: As vagas vão de 1 até a capacidade máxima da sala informada (RN-107).

📌 **Fonte**: RN-107

---

❓ **P4 — Conflito de sala (`CONFLITO_DE_SALA`)**: Dois encontros na mesma sala se sobrepõem no tempo? Qual a granularidade — milissegundo, minuto, bloco de 30 min?

➡️ Recomendo: sobreposição qualquer (início < fim_do_outro E fim > início_do_outro), granularidade de minuto.

✅ **Resposta**: Na mesma sala, entre o fim de um encontro e o início do seguinte deve haver no mínimo 15 minutos (limpeza e troca de turma); encontros de atividades canceladas não contam (RN-108).

📌 **Fonte**: RN-108

---

❓ **P5 — Campo não editável (`CAMPO_NAO_EDITAVEL`)**: Quais campos **não** podem ser alterados no `PATCH /atividades/:id` depois de criada?
- `id` (óbvio)
- `tipo` (palestra ↔ minicurso)
- `salaId`
- `encontros` (lista inteira)
- Outro: ___________

➡️ Recomendo: `id`, `tipo`, `encontros` (lista) imutáveis; `titulo`, `salaId`, `vagas` editáveis.

✅ **Resposta**: id, tipo, salaId, encontros imutáveis.

📌 **Fonte**: (sem regra explícita citada — decisão de negócio)

---

### Estados e transições

❓ **P6 — Situação da atividade (`situacao`)**: As transições permitidas são:
```
prevista → em_andamento → encerrada
prevista → cancelada
```
Há transição `encerrada → cancelada`? `em_andamento → cancelada`?

➡️ Recomendo: apenas as duas setas acima. `cancelada` é terminal; `encerrada` não volta.

✅ **Resposta**: A situação é calculada pelo relógio: prevista -> em_andamento (no início do 1º encontro) -> encerrada (no fim do último encontro). cancelada prevalece sobre todas (RN-114).

📌 **Fonte**: RN-114

---

❓ **P7 — Gatilho de mudança de estado**: A situação muda **automaticamente** pelo relógio de teste (quando `agora` passa do início/fim dos encontros) ou **só** por ação explícita (cancelamento)?

➡️ Recomendo: automática pelo relógio — `prevista` → `em_andamento` no início do 1º encontro; `em_andamento` → `encerrada` após fim do último encontro.

✅ **Resposta**: Automática pelo relógio.

📌 **Fonte**: RN-114

---

❓ **P8 — Cancelamento (`ATIVIDADE_JA_INICIADA`, `ATIVIDADE_CANCELADA`)**:
- Pode cancelar uma atividade `prevista`? Sim/Não
- Pode cancelar `em_andamento`? Sim/Não
- Pode cancelar `encerrada`? Sim/Não
- Cancelar `cancelada` é idempotente (200) ou erro?

➡️ Recomendo: só `prevista` pode ser cancelada; cancelar já cancelada → 200 idempotente.

✅ **Resposta**: Pode cancelar prevista. O cancelamento só é permitido antes de a atividade começar (RN-112). O cancelamento é definitivo: atividade cancelada não é alterada nem cancelada de novo, gerando erro ao tentar alterar/cancelar novamente (RN-113).

📌 **Fonte**: RN-112, RN-113

---

### Ordem entre regras (mesma operação, múltiplos erros possíveis)

❓ **P9 — Prioridade de erro no `POST /atividades`**: Se a requisição viola várias regras (ex.: vagas > capacidade **E** conflito de sala **E** encontros inválidos), qual erro o cliente recebe?

➡️ Recomendo: validação de corpo primeiro (`DADOS_INVALIDOS` se JSON inválido), depois `QUANTIDADE_DE_ENCONTROS`, `ENCONTRO_INVALIDO`, `VAGAS_ACIMA_DA_CAPACIDADE`, `CONFLITO_DE_SALA` — nessa ordem.

✅ **Resposta**: Ordem recomendada.

📌 **Fonte**: (sem regra explícita citada — decisão de arquitetura)

---

❓ **P10 — Prioridade no `PATCH /atividades/:id`**: Mesma pergunta para alteração. Inclui `CAMPO_NAO_EDITAVEL` e `VAGAS_ABAIXO_DOS_INSCRITOS`.

➡️ Recomendo: `CAMPO_NAO_EDITAVEL` → `QUANTIDADE_DE_ENCONTROS` (se tentarem mexer em encontros) → `ENCONTRO_INVALIDO` → `VAGAS_ACIMA_DA_CAPACIDADE` → `VAGAS_ABAIXO_DOS_INSCRITOS` → `CONFLITO_DE_SALA`.

✅ **Resposta**: Ordem recomendada.

📌 **Fonte**: (sem regra explícita citada — decisão de arquitetura)

---

### Filtros e listagem

❓ **P11 — Filtro `?dia=AAAA-MM-DD` em `GET /atividades`**: Retorna atividades que têm **qualquer** encontro naquele dia? Ou só as que **começam** naquele dia?

➡️ Recomendo: qualquer encontro no dia (início ≤ fim_do_dia E fim ≥ início_do_dia).

✅ **Resposta**: Qualquer encontro no dia.

📌 **Fonte**: (sem regra explícita citada — decisão de API)

---

❓ **P12 — Filtro `?tipo=palestra|minicurso`**: Case-sensitive? Aceita apenas esses dois valores exatos?

➡️ Recomendo: exato, lowercase, só `palestra` ou `minicurso`; outro valor → lista vazia (não erro).

✅ **Resposta**: Case-sensitive, exato, lista vazia.

📌 **Fonte**: (sem regra explícita citada — decisão de API)

---

### Escopo — o que M1 **não** faz

❓ **P13 — Confirmação de escopo**: M1 **não** gerencia inscrições, presença, certificados, bloqueios, painel. Correto? Alguma regra de M1 impacta M2–M5 (ex.: `ocupadas`, `emEspera` calculados aqui)?

➡️ Recomendo: correto. `ocupadas`, `vagasRestantes`, `emEspera`, `cargaHorariaMinutos`, `situacao` são **calculados** no M1 a partir de dados de M2/M3, mas a regra de negócio de inscrição/presença fica nos outros módulos.

✅ **Resposta**: M1 calcula campos derivados.

📌 **Fonte**: (sem regra explícita citada — decisão de arquitetura)

---

### Como se verifica (critérios de aceite)

❓ **P14 — Cenários de teste obrigatórios**: Para cada erro da seção 6 que toca M1, quer que eu liste o cenário mínimo que o prova? (Ex.: "criar atividade com 0 encontros → 422 QUANTIDADE_DE_ENCONTROS")

➡️ Recomendo: sim, um cenário por código de erro + 2–3 casos de sucesso (criar, listar, alterar, cancelar).

✅ **Resposta**: Sim, cenários obrigatórios.

📌 **Fonte**: (sem regra explícita citada — decisão de qualidade)

---

> **Responda numerado (P1, P2…).**  
> Se quiser seguir todas as recomendações: **"todas as recomendadas"**.  
> Se precisar consultar o documento de requisitos: **"consultar requisitos"** (a pergunta fica pendente).  
> Pode misturar: ex.: "P1–P3 recomendadas, P4 consultar requisitos, P5 sim mas com X".