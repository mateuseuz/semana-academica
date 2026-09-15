# Entrevista M3 — Presença por QR

Este documento registra as perguntas, recomendações e decisões de regras de negócio para o módulo M3 (Presença por QR) da Semana Acadêmica 2026.

## Status das Perguntas
- [x] P1 — Janela de Geração do Código do Encontro
- [x] P2 — Tempo de Expiração, Troca e Formato do Código (QR Code)
- [x] P3 — Presença Offline, Sincronização Posterior e Código de Erro `SINCRONIZACAO_TARDIA`
- [x] P4 — Duplicidade, Idempotência e Conflito entre Tipos de Presença (`qr` vs `manual`)
- [x] P5 — Relação entre Inscrição, Status do Participante e Presença

---

## Perguntas e Decisões

### P1 — Janela de Geração do Código do Encontro
- **Pergunta:** A rota `GET /encontros/:id/codigo` é usada pela organização para obter o QR Code atual. Em qual janela de tempo (em relação ao horário de início e fim do encontro) essa rota pode ser chamada com sucesso? O que acontece fora dessa janela (retorna `FORA_DA_JANELA` ou outro erro)?
- **Recomendação:** Permitir obter o código desde 15 minutos antes do início do encontro até o fim do encontro (ou até 15 minutos após o fim). Fora dessa janela, retornar `422 FORA_DA_JANELA`.
- **Decisão:** A janela de registro (tanto para obtenção quanto para registro de presença) vai de 15 minutos antes do início do encontro até 30 minutos após o início do encontro (bordas incluídas). Fora desse período, as rotas associadas retornam `422 FORA_DA_JANELA`.

### P2 — Tempo de Expiração, Troca e Formato do Código (QR Code)
- **Pergunta:** Como devem ser calculados os campos `trocaEm` e `validoAte` no retorno de `GET /encontros/:id/codigo`? Qual é o tempo de validade de um código (ex.: ele muda a cada 30 segundos, mas vale por 60 segundos)? Como o código de 6 caracteres é gerado (ex.: aleatório de A-Z e 0-9)?
- **Recomendação:** O código muda a cada 30 segundos (ou seja, `trocaEm` é `agora + 30s`) e permanece válido por 60 segundos (ou seja, `validoAte` é `agora + 60s`). O código é composto por 6 caracteres alfanuméricos maiúsculos (A-Z, 0-9) gerados aleatoriamente.
- **Decisão:** O código muda a cada minuto do relógio. `trocaEm` deve ser o início do próximo minuto e `validoAte` deve ser o final do próximo minuto (permitindo o minuto atual e o minuto anterior). Qualquer outro código que não corresponda ao minuto atual ou ao anterior no momento da leitura é recusado com `422 CODIGO_INVALIDO`. O código possui 6 caracteres escolhidos a partir do alfabeto restrito `'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'` (excluindo caracteres que causam confusão visual como I, O, 0, 1).

### P3 — Presença Offline, Sincronização Posterior e Código de Erro `SINCRONIZACAO_TARDIA`
- **Pergunta:** No `POST /encontros/:id/presencas`, se o participante enviar o parâmetro `lidoEm` (indicando leitura sem internet):
  1. A validação do código deve ser feita comparando o código enviado com os códigos válidos no instante `lidoEm` (minuto de `lidoEm` e minuto anterior)?
  2. O valor de `lidoEm` precisa obrigatoriamente estar dentro da janela de registro do encontro (15 min antes a 30 min depois do início)?
  3. Qual é o limite de tempo (atraso) para que o participante faça a sincronização posterior? Se ele enviar o lote de presenças muito tempo após o encontro, qual regra aciona `422 SINCRONIZACAO_TARDIA`?
- **Recomendação:** 
  1. Sim, validar o código com base no instante `lidoEm`.
  2. Sim, `lidoEm` deve estar na janela válida de presença do encontro.
  3. O participante deve sincronizar em até 24 horas após o fim do encontro. Se a sincronização (momento do `POST`) for feita após esse prazo, retorna `422 SINCRONIZACAO_TARDIA`.
- **Decisão:** 
  1. O código é validado no instante da leitura (`lidoEm`), e não do envio. Portanto, o código enviado é comparado com os códigos válidos para o minuto de `lidoEm` e o minuto anterior a ele.
  2. Sim, o instante `lidoEm` precisa obrigatoriamente estar dentro da janela de registro do encontro (15 min antes a 30 min depois do início do encontro).
  3. O envio da requisição (quando `lidoEm` é fornecido) é aceito até no máximo 2 horas depois do fim do encontro (fim programado). Se o `agora` do relógio no momento do `POST` passar disso, a requisição é recusada com `422 SINCRONIZACAO_TARDIA`.

### P4 — Duplicidade, Idempotência e Conflito entre Tipos de Presença (`qr` vs `manual`)
- **Pergunta:** Como o sistema deve se comportar quando o participante já possui uma presença registrada para o encontro e uma nova requisição é feita?
  1. Se ele escanear novamente o QR Code (mesmo ou outro válido), o sistema apenas retorna a presença existente com status `200` sem alterar nada?
  2. Se a organização registrar presença manualmente para um participante que já possui presença via QR (ou vice-versa), o que acontece? A presença é atualizada de um tipo para o outro (ex.: `qr` vira `manual` com justificativa, ou `manual` vira `qr`), mantém a original e retorna `200`, ou retorna um erro de conflito?
- **Recomendação:** 
  1. Se escanear o QR Code novamente, apenas retornar a presença existente com `200 OK` (idempotência).
  2. Presença manual tem maior peso: se já existe presença via QR, o registro manual a substitui (passa a ser do tipo `manual`, adicionando a `justificativa`). Se já existe presença manual, um escaneamento de QR Code posterior é ignorado (retorna `200 OK` sem alterar a presença manual existente).
- **Decisão:** A presença é única por participante e encontro. Repetir o registro (seja via QR ou manual) devolve `200 OK` com a mesma presença já existente sem alterá-la; o primeiro registro com sucesso devolve `201 Created`. A presença manual é restrita à organização, aplicável apenas a participantes com inscrição confirmada, exigindo uma justificativa com pelo menos 10 caracteres (`422 JUSTIFICATIVA_OBRIGATORIA` se ausente ou menor), e é válida desde a abertura da janela de registro até 2 horas depois do fim do encontro.

### P5 — Relação entre Inscrição, Status do Participante e Presença
- **Pergunta:** Tanto para o escaneamento do QR Code (`POST /encontros/:id/presencas`) quanto para a presença manual (`POST /encontros/:id/presencas/manual`):
  1. Se o participante não tiver nenhuma inscrição na atividade associada ao encontro, o erro retornado deve ser `403 NAO_INSCRITO`?
  2. Se ele possuir inscrição, mas o status dela não for `"confirmada"` (ex: `"em_espera"`, `"convocada"`, `"cancelada"`, `"expirada"`), também deve retornar `403 NAO_INSCRITO`?
- **Recomendação:** Sim, para ambas as situações, se o participante não tiver uma inscrição ativa com status `"confirmada"` na atividade correspondente, o sistema deve recusar o registro de presença retornando `403 NAO_INSCRITO`.
- **Decisão:** Só registra presença (seja via QR Code ou por lançamento manual) quem possui inscrição com status `"confirmada"` na atividade correspondente. Caso contrário, retorna `403 NAO_INSCRITO`.
