# Spec — M3 — Presença por QR

## 1. Objetivo
Gerenciar o registro de presença dos participantes nos encontros das atividades da Semana Acadêmica, permitindo a obtenção e validação de códigos QR (online e offline com sincronização tardia) pela ótica do participante e lançamento manual de presença com justificativa pela organização.

## 2. Fora de escopo
- Geração de certificados de participação (escopo do M4).
- Inscrição em atividades e gerenciamento de lista de espera (escopo do M2).
- Bloqueio automático de participantes por faltas ou painel da organização (escopo do M5).
- Criação, alteração ou cancelamento de atividades e salas (escopo do M1).

## 3. Modelo
### Presenca
- `id`: string (gerado, prefixo `pre_` + 8 hexadecimais)
- `encontroId`: string (informado na URL)
- `participanteId`: string (informado no corpo ou autenticado via `X-Usuario`)
- `origem`: string (`"qr"` | `"qr_offline"` | `"manual"`)
- `lidoEm`: string / instante ISO 8601 (informado ou calculado)
- `registradaEm`: string / instante ISO 8601 (calculado)
- `justificativa`: string ou null (informado quando manual)

### CodigoDoEncontro
- `encontroId`: string
- `codigo`: string (6 caracteres alfanuméricos maiúsculos)
- `trocaEm`: string / instante ISO 8601 (calculado)
- `validoAte`: string / instante ISO 8601 (calculado)

## 4. Endpoints
| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| GET | `/encontros/:id/codigo` | organização | 200 `CodigoDoEncontro` |
| POST | `/encontros/:id/presencas` | participante | 201 `Presenca` na primeira vez; 200 `Presenca` depois |
| POST | `/encontros/:id/presencas/manual` | organização | 201 `Presenca` na primeira vez; 200 `Presenca` depois |
| GET | `/encontros/:id/presencas` | organização | 200 `[Presenca]` |

## 5. Regras
- **R1 (P1):** A janela de registro (tanto para obtenção do código quanto para registro de presença via QR) vai de 15 minutos antes do início do encontro até 30 minutos após o início do encontro (bordas incluídas). Fora desse período, as rotas associadas (`GET /encontros/:id/codigo`, `POST /encontros/:id/presencas`) retornam `422 FORA_DA_JANELA`.
- **R2 (P4):** A presença manual (`POST /encontros/:id/presencas/manual`) é válida desde a abertura da janela de registro (15 min antes do início do encontro) até 2 horas depois do fim do encontro. Fora desse período, retorna `422 FORA_DA_JANELA`.
- **R3 (P2):** O código do encontro muda a cada minuto do relógio. `trocaEm` deve ser o início do próximo minuto e `validoAte` deve ser o final do próximo minuto (permitindo o minuto atual e o minuto anterior).
- **R4 (P2):** O código possui 6 caracteres escolhidos a partir do alfabeto restrito `'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'` (excluindo caracteres que causam confusão visual como I, O, 0, 1).
- **R5 (P2):** Qualquer código enviado em `POST /encontros/:id/presencas` que não corresponda ao minuto atual ou ao anterior no momento da leitura é recusado com `422 CODIGO_INVALIDO`.
- **R6 (P3):** Quando o parâmetro `lidoEm` é fornecido no `POST /encontros/:id/presencas`, o código enviado é validado no instante da leitura (`lidoEm`), sendo comparado com os códigos válidos para o minuto de `lidoEm` e o minuto anterior a ele.
- **R7 (P3):** O instante `lidoEm` precisa obrigatoriamente estar dentro da janela de registro do encontro (15 min antes a 30 min depois do início do encontro). Caso contrário, retorna `422 FORA_DA_JANELA`.
- **R8 (P3):** O envio da requisição de sincronização posterior (`POST /encontros/:id/presencas` com `lidoEm`) é aceito até no máximo 2 horas depois do fim do encontro (fim programado). Se o `agora` do relógio no momento do `POST` passar disso, a requisição é recusada com `422 SINCRONIZACAO_TARDIA`.
- **R9 (P5):** Tanto para o escaneamento do QR Code (`POST /encontros/:id/presencas`) quanto para a presença manual (`POST /encontros/:id/presencas/manual`), apenas participantes que possuem inscrição com status `"confirmada"` na atividade correspondente podem registrar presença. Caso contrário, retorna `403 NAO_INSCRITO`.
- **R10 (P4):** A presença é única por participante e encontro. Repetir o registro (seja via QR ou manual) devolve `200 OK` com a mesma presença já existente sem alterá-la; o primeiro registro com sucesso devolve `201 Created`.
- **R11 (P4):** O lançamento de presença manual (`POST /encontros/:id/presencas/manual`) exige obrigatoriamente uma justificativa com pelo menos 10 caracteres. Se a justificativa estiver ausente ou tiver menos de 10 caracteres, a requisição é recusada com `422 JUSTIFICATIVA_OBRIGATORIA`.

## 6. Critérios de aceite
1. (R1) `GET /encontros/:id/codigo` dentro da janela (15 min antes a 30 min depois do início) → 200 `CodigoDoEncontro`.
2. (R1) `GET /encontros/:id/codigo` fora da janela → 422 `FORA_DA_JANELA`.
3. (R3, R4, R5) `POST /encontros/:id/presencas` com código válido do minuto atual ou anterior dentro da janela por participante inscrito e confirmado → 201 `Presenca` (primeira vez) ou 200 `Presenca` (repetição - R10).
4. (R5) `POST /encontros/:id/presencas` com código inválido → 422 `CODIGO_INVALIDO`.
5. (R6, R7, R8) `POST /encontros/:id/presencas` com `lidoEm` dentro da janela e envio (POST) em até 2 horas após o fim do encontro → 201 `Presenca` / 200 `Presenca`.
6. (R8) `POST /encontros/:id/presencas` com `lidoEm` válido mas envio (POST) após 2 horas do fim do encontro → 422 `SINCRONIZACAO_TARDIA`.
7. (R9) `POST /encontros/:id/presencas` ou `POST /encontros/:id/presencas/manual` por participante sem inscrição confirmada (`NAO_INSCRITO`) → 403 `NAO_INSCRITO`.
8. (R2, R11) `POST /encontros/:id/presencas/manual` sem justificativa ou com justificativa menor que 10 caracteres → 422 `JUSTIFICATIVA_OBRIGATORIA`.
9. (R2, R10, R11) `POST /encontros/:id/presencas/manual` pela organização, dentro do prazo (até 2h após o fim do encontro), com justificativa válida e inscrição confirmada → 201 `Presenca` (ou 200 `Presenca` se repetido).

## 7. Como isto será verificado
Testes de integração HTTP utilizando o modo de teste (`MODO_TESTE=1`) e o relógio simulado (`PUT /_teste/relogio`), testando as rotas de código de encontro, escaneamento de QR Code (online e offline via `lidoEm`), presença manual, idempotência de registros e verificação dos códigos de erro esperados (`FORA_DA_JANELA`, `CODIGO_INVALIDO`, `SINCRONIZACAO_TARDIA`, `NAO_INSCRITO`, `JUSTIFICATIVA_OBRIGATORIA`).

## 8. Fatias de entrega
- **Fatia 1:** Geração de código do encontro e validação de janela (`GET /encontros/:id/codigo`, R1, R3, R4).
- **Fatia 2:** Registro de presença online via QR Code, verificação de inscrição e idempotência (`POST /encontros/:id/presencas`, R1, R5, R9, R10).
- **Fatia 3:** Sincronização offline com `lidoEm` e verificação de sincronização tardia (`POST /encontros/:id/presencas` com `lidoEm`, R6, R7, R8).
- **Fatia 4:** Presença manual, listagem de presenças e validação de justificativa (`POST /encontros/:id/presencas/manual`, `GET /encontros/:id/presencas`, R2, R9, R10, R11).
