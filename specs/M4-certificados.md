# Spec — M4 — Certificados e Horas Complementares

## 1. Objetivo
Definir as regras de negócio para emissão, verificação e extrato de certificados e horas complementares na Semana Acadêmica, conforme decisões da entrevista M4 e o contrato da API.

## 2. Fora de escopo
- Regras de grade, atividade, sala ou inscrição (escopos M1-M3, M5).
- Comportimento de presença via QR ou manual (escopo M3).

## 3. Modelo
### Certificado
- `codigo`: string (formato SA26-XXXX-XXXX, único, alfabeto restrito)
- `atividadeId`: string (identificador da atividade)
- `participanteId`: string (identificador do participante)
- `cargaHorariaMinutos`: número (número total de minutos da atividade)
- `presencas`: número (quantidade de encontros frequentados)
- `encontros`: número (total de encontros da atividade)
- `emitidoEm`: string / instante ISO 8601

### Verificacao
- `codigo`: string
- `participante`: string (nome formatado)
- `atividade`: string (nome da atividade)
- `cargaHorariaMinutos`: número
- `emitidoEm`: string / instante ISO 8601

### Extrato
{
  "itens": [
    { "atividadeId": "atv_1a2b3c4d", "titulo": "Flutter do zero", "tipo": "minicurso",
      "cargaHorariaMinutos": 360, "codigo": null }
  ],
  "palestrasMinutos": 0,
  "minicursosMinutos": 360,
  "totalMinutos": 360,
  "aproveitadoMinutos": 360
}

## 4. Endpoints
| Método | Rota | Quem | Sucesso |
|---|---|---|---|
| POST | `/atividades/:id/certificado` | participante | 201 `Certificado` na primeira vez; 200 `Certificado` depois |
| GET | `/certificados` | participante | 200 `[Certificado]` — os já emitidos |
| GET | `/certificados/:codigo` | **público, sem `X-Usuario`** | 200 `Verificacao` |
| GET | `/extrato` | participante | 200 `Extrato` |

## 5. Regras
- **R1 (P1):** O certificado só pode ser emitido após o fim do último encontro, para atividade não cancelada, com participante com inscrição confirmada e frequência mínima de 75% dos encontros (RN-401, RN-402, RN-403, RN-404).

- **R2 (P2):** A carga horária do certificado considera a carga horária total da atividade, não proporcional à frequência. No extrato, palestras contam no máximo 240 minutos no `aproveitadoMinutos` e o total aproveitado é limitado a 1200 minutos, aplicando primeiro o teto das palestras (RN-406, RN-411, RN-412).

- **R3 (P3):** É necessário atingir pelo menos 75% dos encontros para emissão do certificado, sem arredondamento a favor. Em inteiros, `presenças × 4 >= encontros × 3`. Presenças manuais e offline contam normalmente (RN-404, RN-405).

- **R4 (P4):** O certificado só pode ser emitido a partir do fim do último encontro. Atividade cancelada não certifica. Antes do encerramento aplica-se `422 ATIVIDADE_NAO_ENCERRADA`. Não existe regra `FORA_DA_JANELA` para o M4 (RN-401, RN-402).

- **R5 (P5):** O extrato (`GET /extrato`) lista toda atividade elegível, emitida ou não. Quando o certificado ainda não foi emitido, o código fica `null`. Palestras contam no máximo 240 minutos no `aproveitadoMinutos` e o total aproveitado é limitado a 1200 minutos, aplicando primeiro o teto das palestras (RN-410, RN-411, RN-412).

- **R6 (P6):** Acesso público confirmado a `GET /certificados/:codigo` — o contrato explícita "público, sem `X-Usuario`". Qualquer pessoa pode verificar o certificado pelo código, sem exigência de cabeçalho de identificação (contrato-api.md seção 5, M4).

- **R7 (P7):** O código do certificado é criado na primeira emissão e nunca muda. Reemitir o certificado retorna `200` com o mesmo certificado, sem criar um novo (RN-407, RN-413).

- **R8 (P8):** O código do certificado segue o formato `SA26-XXXX-XXXX`, deve ser único e usa o alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sem os caracteres 0, O, 1 e I (que causam confusão visual). É criado na primeira emissão e nunca muda (RN-407, conforme RN-305).

- **R9 (P9):** A rota `GET /certificados` deve seguir o comportamento definido no contrato-api.md. O documento de requisitos não acrescenta regra específica de filtro para esta rota.

- **R10 (P10):** Só certifica quem possui inscrição confirmada. Caso contrário aplica-se `403 NAO_INSCRITO`. A ordem de validação é: inexistente → cancelada → não inscrito → não encerrada → presença insuficiente (RN-403, RN-413).

- **R11 (P11 / RN-408):** A verificação por `GET /certificados/:codigo` é pública, não exige `X-Usuario`, aceita o código em minúsculas e retorna os dados definidos no contrato (`codigo`, `participante`, `atividade`, `cargaHorariaMinutos`, `emitidoEm`) para verificação do certificado.

- **R12 (P12 / RN-409):** O participante é exibido na verificação com o primeiro nome por extenso e as iniciais dos demais nomes com ponto. As partículas de, da, do, das e dos permanecem por extenso e em minúsculas.

## 6. Códigos de retorno relevantes (do contrato)
- `ATIVIDADE_NAO_ENCERRADA` — 422 (certificado)
- `NAO_INSCRITO` — 403 (registrar presença, presença manual, certificado)
- `PRESENCA_INSUFICIENTE` — 422 (certificado)

## 7. Critérios de aceite
1. (R1) `POST /atividades/:id/certificado` com participante inscrito, atividade encerrada e frequência ≥ 75% → 201 `Certificado` (ou 200 em repetição).
2. (R1) `POST /atividades/:id/certificado` com frequência < 75% → 422 `PRESENCA_INSUFICIENTE`.
3. (R4) `POST /atividades/:id/certificado` com atividade cancelada → não certifica (regra de negócio).
4. (R4) `POST /atividades/:id/certificado` antes do fim do último encontro → 422 `ATIVIDADE_NAO_ENCERRADA`.
5. (R6) `GET /certificados/:codigo` sem `X-Usuario` → 200 `Verificacao` (acesso público).
6. (R7) Reemitir certificado existente → 200 com o mesmo certificado, sem criar novo registro.
7. (R8) Código do certificado segue formato `SA26-XXXX-XXXX` com alfabeto restrito, único e imutável.
8. (R10) `POST /atividades/:id/certificado` por participante sem inscrição confirmada → 403 `NAO_INSCRITO`.
9. (R2) Extrato com palestras > 240 min → teto de 240 min no `aproveitadoMinutos`.
10. (R2) Extrato com total > 1200 min → teto de 1200 min no `aproveitadoMinutos`, aplicando primeiro teto das palestras.