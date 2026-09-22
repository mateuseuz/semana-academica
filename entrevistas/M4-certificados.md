# Entrevista M4 — Certificados e Horas Complementares

> Base: contrato-api.md (seção 5, M4).  
> Regras de negócio (prazos, limites, ordem, transições) **não** estão no contrato — são definidas aqui.  
> Quando o usuário responder "consultar requisitos", a pergunta fica **pendente** e será registrada como tal.

---

## Status das Perguntas
- [x] P1 — Regras de elegibilidade para certificado (CONCLUÍDO)
- [x] P2 — Carga horária mínima e cálculo de `aproveitadoMinutos` (CONCLUÍDO)
- [x] P3 — Validação de presença insuficiente (`PRESENCA_INSUFICIENTE`) (Fonte: RN-404, RN-405)
- [x] P4 — Janela de emissão de certificado (`FORA_DA_JANELA`, `ATIVIDADE_NAO_ENCERRADA`) (CONCLUÍDO)
- [x] P5 — Extrato de horas complementares (`palestrasMinutos`, `minicursosMinutos`, `totalMinutos`, `aproveitadoMinutos`) (CONCLUÍDO)
- [x] P6 — Acesso público a `/certificados/:codigo` (sem `X-Usuario`) (DECIDIDO: contrato diz "público, sem X-Usuario")
- [x] P7 — Reemissão/idempotência do certificado (CONCLUÍDO)
- [x] P8 — Formato e geração do código do certificado (CONCLUÍDO)
- [x] P9 — GET /certificados - o que exatamente é retornado (CONCLUÍDO)
- [x] P10 — NAO_INSCRITO (403) para rotas de certificado (CONCLUÍDO)

---

## Perguntas e Decisões

### P1 — Regras de elegibilidade para certificado
- **Pergunta:** Quais condições um participante deve satisfazer para poder emitir o certificado de uma atividade? É obrigatória presença em todos os encontros? É necessária uma carga horária mínima?
- **Decisão:** O certificado só pode ser emitido depois do fim do último encontro, para atividade não cancelada, participante com inscrição confirmada e frequência mínima de 75% dos encontros. (RN-401, RN-402, RN-403, RN-404)

### P2 — Carga horária mínima e cálculo de `aproveitadoMinutos`
- **Pergunta:** Como é calculada a carga horária `cargaHorariaMinutos` do certificado? O que diferencia `minicursosMinutos` de `palestrasMinutos` no extrato? Como `aproveitadoMinutos` é determinado — é o mínimo entre carga horária inscrita e presenças realizadas, ou há outra lógica?
- **Decisão:** O certificado considera a carga horária total da atividade, não proporcional à frequência. No extrato, palestras aproveitam no máximo 240 minutos e o total aproveitado é limitado a 1200 minutos, aplicando primeiro o teto das palestras. (RN-406, RN-411, RN-412)

### P3 — Validação de presença insuficiente (`PRESENCA_INSUFICIENTE`)
- **Pergunta:** Qual a regra que dispara o erro `PRESENCA_INSUFICIENTE` (422) ao solicitar certificado? É quantidade mínima de presenças (ex.: ≥ 75% dos encontros)? Ou carga horária mínima?
- **Decisão:** É necessário atingir pelo menos 75% dos encontros, sem arredondamento a favor. Em inteiros, presenças × 4 deve ser maior ou igual a encontros × 3. Presenças manuais e offline contam normalmente. (RN-404, RN-405)

### P4 — Janela de emissão de certificado (`FORA_DA_JANELA`, `ATIVIDADE_NAO_ENCERRADA`)
- **Pergunta:** Em que período o participante pode emitir o certificado? A atividade deve estar `encerrada`? Se a atividade ainda estiver `em_andamento` ou `prevista`, o certificado retorna `422 ATIVIDADE_NAO_ENCERRADA` ou `422 FORA_DA_JANELA`?
- **Decisão:** O certificado só pode ser emitido a partir do fim do último encontro. Atividade cancelada não certifica. Antes do encerramento aplica-se ATIVIDADE_NAO_ENCERRADA. Não existe regra FORA_DA_JANELA para o M4. (RN-401, RN-402)

### P5 — Extrato de horas complementares (`palestrasMinutos`, `minicursosMinutos`, `totalMinutos`, `aproveitadoMinutos`)
- **Pergunta:** Como o extrato (`GET /extrato`) calcula os campos `palestrasMinutos`, `minicursosMinutos`, `totalMinutos` e `aproveitadoMinutos`? O que conta como hora complementar? `aproveitadoMinutos` é sempre igual a `totalMinutos` ou há casos onde diferem?
- **Decisão:** O extrato lista toda atividade elegível, emitida ou não. Quando o certificado ainda não foi emitido, o código fica null. Palestras contam no máximo 240 minutos no aproveitado e o total aproveitado é limitado a 1200 minutos, aplicando primeiro o teto das palestras. (RN-410, RN-411, RN-412)

### P6 — Acesso público a `/certificados/:codigo` (sem `X-Usuario`)
- **Pergunta:** A rota `GET /certificados/:codigo` dispensa o cabeçalho `X-Usuario`? Qualquer pessoa pode verificar um certificado conhecendo seu código? Ou há alguma restrição de associação ao participante (ex.: o código deve pertencer ao participante autenticado, mesmo que sem o cabeçalho)?
- **Recomendação:** O contrato-api.md seção 5, M4 diz: "GET /certificados/:codigo | público, sem `X-Usuario` | 200 `Verificacao`". Decisão: acesso público confirmado, sem exigência de `X-Usuario`.
- **Decisão:** Acesso público confirmado — o contrato explícita "público, sem `X-Usuario`". Qualquer pessoa pode verificar o certificado pelo código.

### P7 — Reemissão/idempotência do certificado
- **Pergunta:** Ao solicitar a segunda emissão de um certificado, o sistema devolve o mesmo certificado ou gera um novo? Qual a regra de idempotência para emissão de certificados?
- **Decisão:** O código é criado na primeira emissão e nunca muda. Reemitir devolve 200 com o mesmo certificado, sem criar um novo. (RN-407, RN-413)

### P8 — Formato e geração do código do certificado
- **Pergunta:** Qual o formato e a estrutura do código do certificado? Há padrões ou regras definidas para a composição do código, incluindo a quantidade de segmentos e caracteres por segmento?
- **Decisão:** O código segue o formato SA26-XXXX-XXXX, deve ser único e usa o alfabeto ABCDEFGHJKLMNPQRSTUVWXYZ23456789, sem 0, O, 1 e I. É criado na primeira emissão e nunca muda. (RN-407, conforme RN-305)

### P9 — GET /certificados - o que exatamente é retornado
- **Pergunta:** A rota GET /certificados retorna quais certificados? Apenas aqueles das atividades nas quais o participante está inscrito e tem presença suficiente, ou lista todos os certificados já emitidos independentemente de inscrição/presença? Há filtros por status ou tipo de atividade?
- **Decisão:** O documento de requisitos não acrescenta regra específica de filtro para GET /certificados; deve ser seguido o comportamento definido no contrato-api.md.

### P10 — NAO_INSCRITO (403) para rotas de certificado
- **Pergunta:** Em que situação o erro NAO_INSCRITO (403) é retornado para as rotas de certificado? O contrato lista esse código para "registrar presença, presença manual, certificado" — quais são as condições exatas para seu retorno no contexto de certificados?
- **Decisão:** Só certifica quem possui inscrição confirmada. Caso contrário aplica-se NAO_INSCRITO. A ordem de validação é: inexistente → cancelada → não inscrito → não encerrada → presença insuficiente. (RN-403, RN-413)

---

## Como se verifica (critérios de aceite)

> **Responda numerado (P1, P2…).**  
> Se quiser seguir todas as recomendações: **"todas as recomendadas"**.  
> Se precisar consultar o documento de requisitos: **"consultar requisitos"** (a pergunta fica pendente).  
> Pode misturar: ex.: "P1–P3 recomendadas, P4 consultar requisitos, P5 sim mas com X".