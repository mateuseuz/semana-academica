# Entrevista M4 — Certificados e Horas Complementares

> Base: contrato-api.md (seção 5, M4).  
> Regras de negócio (prazos, limites, ordem, transições) **não** estão no contrato — são definidas aqui.  
> Quando o usuário responder "consultar requisitos", a pergunta fica **pendente** e será registrada como tal.

---

## Status das Perguntas
- [x] P1 — Regras de elegibilidade para certificado (PENDENTE: consultar requisitos)
- [x] P2 — Carga horária mínima e cálculo de `aproveitadoMinutos` (PENDENTE: consultar requisitos)
- [x] P3 — Validação de presença insuficiente (`PRESENCA_INSUFICIENTE`) (PENDENTE: consultar requisitos)
- [x] P4 — Janela de emissão de certificado (`FORA_DA_JANELA`, `ATIVIDADE_NAO_ENCERRADA`) (PENDENTE: consultar requisitos)
- [x] P5 — Extrato de horas complementares (`palestrasMinutos`, `minicursosMinutos`, `totalMinutos`, `aproveitadoMinutos`) (PENDENTE: consultar requisitos)
- [x] P6 — Acesso público a `/certificados/:codigo` (sem `X-Usuario`) (DECIDIDO: contrato diz "público, sem X-Usuario")
- [x] P7 — Reemissão/idempotência do certificado (PENDENTE: consultar requisitos)
- [x] P8 — Formato e geração do código do certificado (PENDENTE: consultar requisitos)
- [x] P9 — GET /certificados - o que exatamente é retornado (PENDENTE: consultar requisitos)
- [x] P10 — NAO_INSCRITO (403) para rotas de certificado (PENDENTE: consultar requisitos)

---

## Perguntas e Decisões

### P1 — Regras de elegibilidade para certificado
- **Pergunta:** Quais condições um participante deve satisfazer para poder emitir o certificado de uma atividade? É obrigatória presença em todos os encontros? É necessária uma carga horária mínima?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P2 — Carga horária mínima e cálculo de `aproveitadoMinutos`
- **Pergunta:** Como é calculada a carga horária `cargaHorariaMinutos` do certificado? O que diferencia `minicursosMinutos` de `palestrasMinutos` no extrato? Como `aproveitadoMinutos` é determinado — é o mínimo entre carga horária inscrita e presenças realizadas, ou há outra lógica?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P3 — Validação de presença insuficiente (`PRESENCA_INSUFICIENTE`)
- **Pergunta:** Qual a regra que dispara o erro `PRESENCA_INSUFICIENTE` (422) ao solicitar certificado? É quantidade mínima de presenças (ex.: ≥ 75% dos encontros)? Ou carga horária mínima?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P4 — Janela de emissão de certificado (`FORA_DA_JANELA`, `ATIVIDADE_NAO_ENCERRADA`)
- **Pergunta:** Em que período o participante pode emitir o certificado? A atividade deve estar `encerrada`? Se a atividade ainda estiver `em_andamento` ou `prevista`, o certificado retorna `422 ATIVIDADE_NAO_ENCERRADA` ou `422 FORA_DA_JANELA`?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P5 — Extrato de horas complementares (`palestrasMinutos`, `minicursosMinutos`, `totalMinutos`, `aproveitadoMinutos`)
- **Pergunta:** Como o extrato (`GET /extrato`) calcula os campos `palestrasMinutos`, `minicursosMinutos`, `totalMinutos` e `aproveitadoMinutos`? O que conta como hora complementar? `aproveitadoMinutos` é sempre igual a `totalMinutos` ou há casos onde diferem?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P6 — Acesso público a `/certificados/:codigo` (sem `X-Usuario`)
- **Pergunta:** A rota `GET /certificados/:codigo` dispensa o cabeçalho `X-Usuario`? Qualquer pessoa pode verificar um certificado conhecendo seu código? Ou há alguma restrição de associação ao participante (ex.: o código deve pertencer ao participante autenticado, mesmo que sem o cabeçalho)?
- **Recomendação:** O contrato-api.md seção 5, M4 diz: "GET /certificados/:codigo | público, sem `X-Usuario` | 200 `Verificacao`". Decisão: acesso público confirmado, sem exigência de `X-Usuario`.
- **Decisão:** Acesso público confirmado — o contrato explícita "público, sem `X-Usuario`". Qualquer pessoa pode verificar o certificado pelo código.

### P7 — Reemissão/idempotência do certificado
- **Pergunta:** Ao solicitar a segunda emissão de um certificado, o sistema devolve o mesmo certificado ou gera um novo? Qual a regra de idempotência para emissão de certificados?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P8 — Formato e geração do código do certificado
- **Pergunta:** Qual o formato e a estrutura do código do certificado? Há padrões ou regras definidas para a composição do código, incluindo a quantidade de segmentos e caracteres por segmento?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P9 — GET /certificados - o que exatamente é retornado
- **Pergunta:** A rota GET /certificados retorna quais certificados? Apenas aqueles das atividades nas quais o participante está inscrito e tem presença suficiente, ou lista todos os certificados já emitidos independentemente de inscrição/presença? Há filtros por status ou tipo de atividade?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

### P10 — NAO_INSCRITO (403) para rotas de certificado
- **Pergunta:** Em que situação o erro NAO_INSCRITO (403) é retornado para as rotas de certificado? O contrato lista esse código para "registrar presença, presença manual, certificado" — quais são as condições exatas para seu retorno no contexto de certificados?
- **Decisão:** PENDENTE — aguardar consulta ao documento de requisitos. Pergunta registrada como PENDENTE pois usuário respondeu "consultar requisitos".

---

## Como se verifica (critérios de aceite)

> **Responda numerado (P1, P2…).**  
> Se quiser seguir todas as recomendações: **"todas as recomendadas"**.  
> Se precisar consultar o documento de requisitos: **"consultar requisitos"** (a pergunta fica pendente).  
> Pode misturar: ex.: "P1–P3 recomendadas, P4 consultar requisitos, P5 sim mas com X".