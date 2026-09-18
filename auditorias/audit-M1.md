# Auditoria — M1 (Grade de Atividades) vs specs/M1-grade.md

**Arquivo auditado:** `api/server.js` (funcao `criarServidor()`)
**Spec de referencia:** `specs/M1-grade.md` (regras R1–R16, criterios 1–28)
**Entrevista:** `entrevistas/M1-grade.md` (P1–P14, RN-102–RN-114)
**Contrato:** `contrato-api.md` (secoes 1, 3, 5/M1, 6)
**Testes:** `verificacoes/atividades.spec.js` (29 testes M1, via `criarServidor` de `api/server.js`)
**Data:** 2026-09-17
**Suite (`npm test`):** 45/45 verde (29 M1 + 16 M3 em `verificacoes/presenca.spec.js`, que usa `api/servidor.js` e nao diz respeito a M1)

> **Nota sobre a auditoria anterior (2026-09-17, manha):** analisava um esqueleto sem validacao
> (22 ok / 23 fail) e esta desatualizada. O `api/server.js` atual (363 linhas) implementa validacao
> completa R1–R16, modo de teste e campos calculados; `npm test` esta 45/45 verde. Este parecer
> substitui integralmente o anterior.

---

## Resumo

| Categoria | Qtde | IDs |
|---|---|---|
| Divergencia spec-texto x testes x codigo (bloqueante p/ aceite) | 1 | DIV-1 (R6: `salaId`/`encontros` imutaveis?) |
| Regras sem prova (nenhum teste executa o cenario) | 3 | R1, R7, R8 |
| Regras com prova parcial (ramo sem teste) | 5 | R3, R10, R11, R12, R13/R14 |
| Comportamento nao contratado (codigo faz o que a spec nao pediu) | 2 | NC-1 (`ocupadas`/`emEspera` no POST), NC-2 (modo de teste sempre exposto) |
| Divergencia com contrato-api (de passagem; assunto do revisor-de-contrato) | 2 | CT-1 (sem auth 401/403), CT-2 (`/_teste/*` sem 404 fora de MODO_TESTE) |
| Duplicidade de servidor (arquitetura, sem impacto funcional atual) | 1 | ARC-1 (`api/servidor.js` ainda existe) |

---

## Matriz de rastreabilidade

| Regra | Origem | Teste que comprova | Veredito |
|---|---|---|---|
| R1 `DADOS_INVALIDOS` | Indireta: P9 (ordem, sem RN); contrato §1/§6 | — | SEM PROVA |
| R2 `QUANTIDADE_DE_ENCONTROS` (POST) | P1 / RN-102, RN-103 | `verificacoes/atividades.spec.js:28` «R2 - recusa minicurso com 1 encontro» + `:43` «R2 - recusa palestra com 2 encontros» | COMPROVADA |
| R3 `ENCONTRO_INVALIDO` (POST) | P2 / RN-104, RN-105, RN-106 | `verificacoes/atividades.spec.js:61` «inicio >= fim» + `:76` «fora do periodo» + `:91` «duracao > 4h» + `:106` «sobrepostos» | COMPROVADA, com ramo sem prova (mesmo dia) |
| R4 `VAGAS_ACIMA_DA_CAPACIDADE` (POST) | P3 / RN-107 | `verificacoes/atividades.spec.js:124` «vagas > capacidade» + `:139` «vagas < 1» | COMPROVADA |
| R5 `CONFLITO_DE_SALA` (POST) | P4 / RN-108 (15 min) | `verificacoes/atividades.spec.js:154` «10 min → 409» + `:177` «20 min → 201» + `:199` «sobreposicao entre atividades → 409» | COMPROVADA |
| R6 `CAMPO_NAO_EDITAVEL` (PATCH) | P5 (sem RN; decisao de negocio) | `verificacoes/atividades.spec.js:346` «PATCH tipo → 422» + `:367` «PATCH id → 422» | DIVERGENTE (spec x testes x codigo) — ver DIV-1 |
| R7 `QUANTIDADE_DE_ENCONTROS` (PATCH) | Indireta: P10 (ordem, sem RN) | — | SEM PROVA |
| R8 `ENCONTRO_INVALIDO` (PATCH) | Indireta: P10 (ordem, sem RN) | — | SEM PROVA |
| R9 `VAGAS_ACIMA_DA_CAPACIDADE` (PATCH) | Indireta: P10 (ordem, sem RN) | `verificacoes/atividades.spec.js:410` «PATCH vagas 100 → 422» | COMPROVADA |
| R10 `VAGAS_ABAIXO_DOS_INSCRITOS` | Indireta: P10 (ordem, sem RN) | `verificacoes/atividades.spec.js:433` «PATCH reduz vagas abaixo de inscritos → 409» (via hook `ocupadas` no POST) | PROVA FRACA (hook sem base na spec) — ver NC-1 |
| R11 `CONFLITO_DE_SALA` (PATCH) | Indireta: P10 (ordem, sem RN) | `verificacoes/atividades.spec.js:458` «PATCH muda sala p/ com conflito → 409» | COMPROVADA, com ramo sem prova (PATCH `encontros` conflitando) |
| R12 `ATIVIDADE_JA_INICIADA` | P8 / RN-112 | `verificacoes/atividades.spec.js:535` «cancela em_andamento → 422» | COMPROVADA, com ramo sem prova (`encerrada`) |
| R13 `ATIVIDADE_CANCELADA` | P8 / RN-113 | `verificacoes/atividades.spec.js:491` «cancela prevista → 200» + `:511` «cancela ja cancelada → 422» | COMPROVADA, com ramo sem prova (PATCH em cancelada) |
| R14 situacao pelo relogio | P6/P7 / RN-114 | `verificacoes/atividades.spec.js:563` «instante exato do fim → em_andamento» + `:587` «apos fim → encerrada» | COMPROVADA, com ramos sem prova (inicio exato→em_andamento; `cancelada` prevalece) |
| R15 filtro `?dia=` | P11 (sem RN; decisao de API) | `verificacoes/atividades.spec.js:268` «?dia=2026-10-19 retorna 1» | COMPROVADA |
| R16 filtro `?tipo=` | P12 (sem RN; decisao de API) | `verificacoes/atividades.spec.js:241` «?tipo=invalido → []» + `:249` «?tipo=palestra exclui minicurso» | COMPROVADA |

---

## Suite

`npm test` (= `node --test verificacoes/*.spec.js`, unico comando em `testes` de `projeto.json`) → resultado copiado da saida:

```
# tests 45
# suites 0
# pass 45
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 557.6474
```

29 testes de `verificacoes/atividades.spec.js` (M1, contra `api/server.js`) + 16 de
`verificacoes/presenca.spec.js` (M3, contra `api/servidor.js`). Nao ha testes de interface
(so existem `verificacoes/*.spec.js`; nenhum `*.test.*` em `app/`).

---

## Achados

### DIV-1 — [DIVERGENTE] R6: spec diz `salaId`/`encontros` imutaveis; testes e codigo exigem o contrario

- **Spec:** `specs/M1-grade.md:19,21` (tabela do modelo: `salaId` e `encontros` = `Sim` imutavel),
  `:56` (PATCH: "campos imutaveis rejeitados") e `:83` ("Tentativa de alterar `id`, `tipo`,
  `salaId` ou `encontros`" → 422). Origem: `entrevistas/M1-grade.md:68` (P5: "id, tipo, salaId,
  encontros imutaveis").
- **Testes:** `verificacoes/atividades.spec.js:388` «F3 - PATCH altera salaId com sucesso quando sem
  conflito» exige `PATCH {salaId}` → 200 (`:405`-`:407`); `:458` «R11 - PATCH recusa mudanca de sala»
  so faz sentido com `salaId` editavel. Nenhum teste exige 422 para `salaId`/`encontros`
  (criterios 12–13 sem prova).
- **Codigo:** `api/server.js:245`-`:249` rejeita apenas `id`/`tipo`, com comentario explicito de que
  "`salaId` e `encontros` sao editaveis p/ R7/R8/R11 cobrirem; os testes F3/R11 exigem salaId
  editavel". R7/R8/R11 (`api/server.js:276`-`:313`) validam `encontros`/`salaId` alterados — codigo
  morto se R6-texto valesse.
- **Consequencia em cascata:** com R6-texto, R7 (`:85`), R8 (`:87`) e o ramo `encontros` de R11 (`:93`)
  seriam inalancaveis; com R6-testes, os criterios de aceite 12–14 sao impossiveis de cumprir.
  P10 (`entrevistas/M1-grade.md:129`, ordem incluindo `QUANTIDADE/ENCONTRO` no PATCH) sugere que a
  intencao real sempre foi `encontros` editavel — a spec se contradiz internamente.
- **Cenario que expoe:** `PATCH /atividades/:id {salaId: outra}` → spec manda 422
  `CAMPO_NAO_EDITAVEL`; teste F3 (`:388`) manda 200. Ambos nao podem estar certos.
- **Sem juizo de correcao** (nao corrijo codigo): o aceite de M1 exige decisao registrada — ou a spec
  e emendada (R6 = so `id`+`tipo`, R7/R8/R11 passam a fazer sentido), ou os testes F3/R11 e o codigo
  (`:245`-`:249`) estao errados.

### 1. [SEM PROVA] R1 — nenhum teste executa `DADOS_INVALIDOS`

- A spec exige (`specs/M1-grade.md:66`): corpo nao-JSON, campo obrigatorio ausente ou tipo errado → 422.
- Implementacao existe e parece correta: `api/server.js:179`-`:200` (corpo nao-objeto, campos
  obrigatorios/tipos, `salaId` inexistente → 422, itens de `encontros` malformados → 422) e
  `api/server.js:342`-`:347` (JSON sintaticamente invalido → 422 via handler `entity.parse.failed`).
- Mas `verificacoes/atividades.spec.js` nao tem nenhum teste `DADOS_INVALIDOS`: nenhuma requisicao sem
  campo, com tipo errado (`vagas: "10"`), com `salaId` inexistente, ou com corpo nao-JSON.
- Ramos sem prova adicional: `titulo: ""`/ so espacos (`:188` usa `trim()` — decisao sem base na
  spec/entrevista, que nao definem "titulo vazio"); `vagas` nao-inteiro (`:191`); `tipo` invalido
  (`:189`); `encontros: []` (`:192`, cai em R1 antes de R2 — ordem nao testada).
- Cenario que expoe: `POST /atividades` com corpo `{}` → deveria ser 422 `DADOS_INVALIDOS`; nenhum
  teste o executa (se a guarda `:187`-`:195` regredir, nada acusa).

### 2. [SEM PROVA] R7 — nenhum teste altera `encontros` para quantidade invalida via PATCH

- Spec (`specs/M1-grade.md:85`) + criterio 14 (`:124`).
- Implementacao existe: `api/server.js:276`-`:283` (confere contra `atv.tipo`). Lida corretamente.
- Nenhum teste faz `PATCH {encontros}` com quantidade que viole R2 (ex.: palestra passando a 2
  encontros, minicurso passando a 1). `grep` em `verificacoes/atividades.spec.js` confirma: `encontros`
  so aparece em corpos de POST. Criterio 14 descoberto, incluindo a precedencia
  `QUANTIDADE_DE_ENCONTROS` antes de `ENCONTRO_INVALIDO` (ordem P10 nunca exercitada).

### 3. [SEM PROVA] R8 — nenhum teste altera `encontros` para valor invalido via PATCH

- Spec (`specs/M1-grade.md:87`). Implementacao existe: `api/server.js:286`-`:288` (reusa
  `validarEncontrosR3`). Lida corretamente.
- Mesmo motivo do achado 2: nenhum `PATCH {encontros}` invalido (ex.: `inicio >= fim`) e testado.

### 4. [PROVA FRACA] R3 — sub-condicao "mesmo dia" (RN-105) sem teste

- Testes cobrem (`:61`, `:76`, `:91`, `:106`): `inicio >= fim`, fora do evento, `> 4h`, sobreposicao
  interna. Implementacao cobre o resto: `api/server.js:95`-`:100` (duracao `<= 0` ou `> 4h`,
  dentro de `EVENTO_INICIO`/`EVENTO_FIM` de `:12`-`:13`, mesmo dia via `diaEmSaoPaulo` em
  `:21`-`:35` + comparacao `:98`-`:100`) e `:103`-`:109` (sobreposicao par-a-par).
- Falta: encontro dentro do evento e com duracao valida mas cruzando a meia-noite
  (ex.: `19/10 23:00 → 20/10 01:00`) → deveria ser 422 `ENCONTRO_INVALIDO` por RN-105; nenhum teste.
- Observacao de implementacao (sem defeito apontado): duracao zero/negativa e indistinguivel de
  `inicio >= fim` (`:94`), entao o teste `:61` a cobre por tabela; duracao minima de 1h citada na
  entrevista (`entrevistas/M1-grade.md:33`, "no minimo 1h") NAO esta na spec R3 nem no codigo
  (encontro de 10 min passa) — divergencia entrevista x spec/codigo registrada sem correcao.

### 5. [PROVA FRACA] R10 — comprovada apenas via hook `ocupadas`/`emEspera` no POST (NC-1)

- Teste `:433` cria a atividade com `ocupadas: 8` no corpo do POST (`:441`) e depois reduz
  `vagas → 3` esperando 409 (`:451`-`:453`). Status+erro conferidos — o teste e honesto quanto ao que
  a regra exige.
- Porem `api/server.js:230`-`:231` aceita `ocupadas`/`emEspera` no `POST /atividades`, o que nao tem
  base na spec: `specs/M1-grade.md:9` diz que esses campos sao "calculados a partir de dados de M2/M3"
  e que "M1 nao valida regras de negocio de inscricao"; a entrada do POST (`:52`) e so
  `{titulo, tipo, salaId, vagas, encontros}`; a entrevista P13 (`entrevistas/M1-grade.md:163`)
  confirma "calculados no M1 a partir de dados de M2/M3". Nenhuma inscricao real (M2) jamais eleva
  `ocupadas` neste servidor — a integracao verdadeira R10 x inscricoes nao e exercitada em teste
  algum. Ver [NAO CONTRATADO] NC-1 abaixo.

### 6. [PROVA PARCIAL] R11 — ramo `encontros` sem teste; auto-exclusao sem teste

- Teste `:458` cobre o ramo `salaId` (`sala-101 → lab-3` com conflito → 409, `:484`-`:486`).
  Implementacao `api/server.js:309`-`:312` + `temConflitoSala` (`:113`-`:129`, com
  `ignorarAtividadeId` em `:118`) lida corretamente, inclusive excluindo a propria atividade e as
  canceladas (`:116`).
- Sem prova: `PATCH {encontros}` que conflita na MESMA sala; e a nao-auto-colisao (alterar `titulo`
  de atividade isolada nao gera falso `CONFLITO_DE_SALA` — so e exercitada incidentalmente pelo teste
  `:324`, que nao isola o cenario com vizinho proximo). Criterio 17 coberto apenas pelo ramo sala.

### 7. [PROVA PARCIAL] R12 — ramo `encerrada` sem teste (criterio 19)

- Teste `:535` cobre `em_andamento` (relogio avancado para `19:30` no meio do encontro, `:550`;
  cancelamento → 422 `ATIVIDADE_JA_INICIADA`, `:556`-`:558`). Implementacao
  `api/server.js:332`-`:335` usa `calcularSituacao` — correta.
- Falta: avancar o relogio para DEPOIS do fim e tentar cancelar → 422 (criterio 19,
  `specs/M1-grade.md:129`). Nenhum teste o faz.

### 8. [PROVA PARCIAL] R13/R14 — `cancelada` prevalece sobre o relogio sem teste; PATCH em cancelada sem teste

- R13 coberta (`:491` prevista → 200 + `situacao: cancelada` em `:508`; `:511` duplo cancel → 422
  `ATIVIDADE_CANCELADA`). Implementacao `api/server.js:329`-`:337` correta.
- Sem prova: (a) cancelar e DEPOIS avancar o relogio para depois do fim — `situacao` deve continuar
  `cancelada` (`calcularSituacao`, `api/server.js:57`, implementa a prevalencia, mas nenhum teste le
  a atividade apos esse passo); (b) `PATCH` em atividade cancelada → 422 `ATIVIDADE_CANCELADA`
  (`api/server.js:240`-`:242`; a spec-texto em `:99` diz "nem alterado novamente" e o contrato §6
  lista `ATIVIDADE_CANCELADA` em "alterar e cancelar atividade" — comportamento implementado mas sem
  nenhum teste).
- R14: `:563` (instante EXATO do fim → `em_andamento`) casa com `agora > ultimoFim` em
  `api/server.js:63` ("passa o fim" = `>`, nao `>=`) — implementacao fiel a spec (`:101`) e ao teste;
  `:587` cobre `encerrada`. Falta a prova direta do criterio 22 (avancar para o instante EXATO do
  INICIO do 1º encontro e ler `em_andamento` via GET): hoje so ha prova indireta (o cancelamento
  recusado em `:535` pressupoe `em_andamento`, mas nenhum teste asserta `situacao` apos avancar para
  o inicio). Falta tambem `prevista` antes do inicio ser assertada apos reset (só incidental em `:311`).

### 9. [SEM PROVA] Campos calculados do criterio 26 — `cargaHorariaMinutos` nunca assertada; IDs nunca validados

- `formatar` (`api/server.js:68`-`:85`) calcula `cargaHorariaMinutos` (`:49`-`:54`),
  `vagasRestantes = vagas - ocupadas` (`:82`), propaga `ocupadas`/`emEspera` (`:70`-`:71`, `:81`, `:83`)
  e ordena encontros (`:69`, `:78`). Implementacao correta a leitura.
- Nenhum teste asserta `cargaHorariaMinutos` (ex.: encontro 19:00–22:00 → 180), `vagasRestantes`,
  `ocupadas`, `emEspera`, nem a ordenacao dos encontros. O teste `:311` asserta
  `situacao: prevista`, e `:342`-`:343` assertam `titulo`/`vagas` — o resto do corpo 201/200 nao e
  verificado. Criterio 26 ("campos calculados corretos") formalmente descoberto.
- IDs: `genId` (`api/server.js:16`-`:19`) gera `prefixo_ + 8 hex` minusculos, conforme contrato §1
  (`:14`) — mas nenhum teste valida o formato (`/^atv_[0-9a-f]{8}$/`, `enc_…`). Se o formato regredir,
  nada acusa. (Contrato e assunto do revisor-de-contrato; registro de passagem.)

### 10. [SEM PROVA] Ordem entre regras (P9/P10) nunca exercitada

- A spec fixa a ordem (`specs/M1-grade.md:64` criacao R1→R5; `:81` alteracao R6→R11) e a entrevista a
  confirma (P9 em `entrevistas/M1-grade.md:121`, P10 em `:131`). O codigo segue a ordem
  (`api/server.js:187`→`:203`→`:211`→`:217`→`:222` no POST; `:247`→`:276`→`:286`→`:291`→`:304`→`:310`
  no PATCH).
- Nenhum teste viola DUAS regras de proposito para conferir a precedencia (ex.: `vagas > capacidade`
  + conflito de sala → deve ser `VAGAS_ACIMA_DA_CAPACIDADE`; `tipo` + `vagas` invalida → deve ser
  `CAMPO_NAO_EDITAVEL`). Regressao de ordem passa silenciosa.

## Nao contratado

- **NC-1 — `POST /atividades` aceita `ocupadas`/`emEspera` no corpo** (`api/server.js:230`-`:231`).
  Sem base na spec (`:52` define a entrada sem esses campos; `:9` os declara calculados de M2/M3) e sem
  base na entrevista (P13). Existe apenas para viabilizar o teste `:433` (R10). Nao quebro nada —
  registro: ou a spec legitima o hook de teste, ou R10 fica sem prova honesta neste servidor.
- **NC-2 — modo de teste sempre exposto** (`api/server.js:131`, comentario admite "sempre exposto para
  verificacao local; contrato pede 404 sem MODO_TESTE"). O contrato §3 (`contrato-api.md:53`) exige
  404 em `/_teste/*` sem `MODO_TESTE`. Funcionalmente util aos testes; formalmente divergente do
  contrato. De passagem (revisor-de-contrato).

## Contrato (de passagem — nao e meu veredito)

- **CT-1 — sem autenticacao/autorizacao:** `api/server.js` nao menciona `X-Usuario` em nenhuma linha
  (`grep` por `X-Usuario|USUARIO_DESCONHECIDO|SOMENTE_|401|403` retorna vazio). O contrato §1
  (`contrato-api.md:12`) e §5/M1 (`:90`-`:92`, rotas de organizacao) exigem 401/403. Os testes enviam
  `X-Usuario: org-ana` mas o servidor ignora. O juiz, rodando com usuarios reais, pode recusar o que
  aqui passa. Assunto do revisor-de-contrato.
- **CT-2 — `PUT /_teste/relogio` sem validacao** (`api/server.js:138`-`:143`): corpo sem `agora` apenas
  mantem o relogio e responde 200; contrato pede eco de `{"agora"}` (`:48`) — cumprido — mas sem
  422 para ISO invalido. Menor; de passagem.

## Arquitetura

- **ARC-1 — `api/servidor.js` ainda existe** (ao lado de `api/server.js`). A auditoria anterior temia
  juiz x testes em servidores distintos; hoje: `package.json:8` (`test: node --test verificacoes/*.spec.js`),
  raiz `package.json:6` (`main: api/server.js`) e os testes M1 importam `../api/server.js`
  (`verificacoes/atividades.spec.js:4`). O `presenca.spec.js` (M3) importa `../api/servidor.js`
  (`:3`) — outro modulo, fora do meu escopo, mas a duplicidade continua armadilha para quem rodar o
  juiz contra o arquivo errado. Recomendo remover ou declarar `servidor.js` fora de M1.

---

## Checklist dos 28 criterios (`specs/M1-grade.md:111`-`:138`)

| # | Criterio | Teste | Status |
|---|---|---|---|
| 1 | (R2) minicurso 1 encontro → 422 | `:28` status+erro | OK |
| 2 | (R2) palestra 2 encontros → 422 | `:43` status+erro | OK |
| 3 | (R3) `inicio >= fim` → 422 | `:61` status+erro | OK |
| 4 | (R3) fora de 19/10–23/10 → 422 | `:76` status+erro | OK |
| 5 | (R3) 5h → 422 | `:91` (4h01 → 422) status+erro | OK |
| 6 | (R3) sobrepostos → 422 | `:106` (+ duplicata `:223`) status+erro | OK |
| 7 | (R4) vagas > capacidade → 422 | `:124` status+erro | OK |
| 8 | (R4) vagas = 0 → 422 | `:139` status+erro | OK |
| 9 | (R5) 10 min → 409 | `:154` status+erro | OK |
| 10 | (R5) 20 min → 201 | `:177` duplo 201 | OK |
| 11 | (R6) PATCH `tipo` → 422 | `:346` status+erro | OK |
| 12 | (R6) PATCH `salaId` → 422 | — (teste `:388` exige 200) | DESCOBERTO — ver DIV-1 |
| 13 | (R6) PATCH `encontros` → 422 | — | DESCOBERTO — ver DIV-1 |
| 14 | (R7+R8) PATCH `encontros` qtd invalida → 422 QUANTIDADE | — | DESCOBERTO — ver achados 2–3 |
| 15 | (R9) PATCH vagas > capacidade → 422 | `:410` status+erro | OK |
| 16 | (R10) PATCH vagas < inscricoes → 409 | `:433` status+erro (via hook) | OK c/ ressalva — ver achado 5 / NC-1 |
| 17 | (R11) PATCH p/ sala com conflito → 409 | `:458` status+erro (ramo sala) | OK c/ ressalva — ver achado 6 |
| 18 | (R12) cancela `em_andamento` → 422 | `:535` status+erro | OK |
| 19 | (R12) cancela `encerrada` → 422 | — | DESCOBERTO — ver achado 7 |
| 20 | (R13) cancela ja `cancelada` → 422 | `:511` status+erro | OK |
| 21 | (R13) cancela `prevista` → 200 `cancelada` | `:491` status+`situacao` | OK |
| 22 | (R14) relogio no inicio → `em_andamento` | — (so indireta via `:535`) | DESCOBERTO — ver achado 8 |
| 23 | (R14) apos fim → `encerrada` | `:587` | OK |
| 24 | (R15) `?dia=` | `:268` length+titulo | OK |
| 25 | (R16) `?tipo=` + invalido → `[]` | `:241` + `:249` | OK |
| 26 | POST valido → 201 + calculados | 201 OK em varios; `cargaHorariaMinutos` etc. nunca assertados | PARCIAL — ver achado 9 |
| 27 | `GET /:id` | `:295` id+titulo+`situacao` (+ `:314` 404) | OK |
| 28 | PATCH `titulo`+`vagas` → 200 | `:324` status+valores | OK |

**Contagem:** 20 OK / 2 OK com ressalva / 1 parcial / 5 descobertos (12, 13, 14, 19, 22).

---

## Acoes recomendadas (sem precedencia de codigo — apenas o que falta para o aceite)

1. **Decidir DIV-1 por escrito** (spec x testes): ou emendar `specs/M1-grade.md` (R6 = so `id`+`tipo`;
   reescrever criterios 12–14 e legitimar R7/R8/R11-encontros), ou corrigir testes F3/R11 + codigo
   (`api/server.js:245`-`:249`). Sem isso, o aceite 12–14 e logicamente impossivel.
2. **Adicionar provas:** R1 (corpo ausente/tipo errado/JSON invalido), R7+R8 (PATCH `encontros`
   invalido, incluindo precedencia QUANTIDADE antes de ENCONTRO), criterio 19 ( cancela `encerrada`),
   criterio 22 (inicio exato → `em_andamento` lido via GET), `cargaHorariaMinutos`/`vagasRestantes`/
   formato `atv_xxxxxxxx` no 201, e um teste de precedencia por ordem (P9/P10).
3. **Legitimar ou remover NC-1:** ou a spec autoriza `ocupadas`/`emEspera` como hook de teste no POST,
   ou R10 passa a ser provado via inscricao real (M2) — hoje a prova depende de campo nao contratado.
4. **Revisor-de-contrato:** CT-1 (auth 401/403 ausente em `api/server.js`) e CT-2/NC-2 (modo de teste).
5. **Higiene:** resolver ARC-1 (`api/servidor.js` duplicado) para eliminar o risco juiz x testes em
   servidores distintos.

---

## Veredito

M1 nao pode ser aceito ainda: apesar dos 45/45 verdes, a divergencia DIV-1 (R6) torna os criterios
12–14 impossiveis, R1/R7/R8 nao tem nenhuma prova, os criterios 19 e 22 e os campos calculados do
criterio 26 estao descobertos, e a prova de R10 depende de campos nao contratados (NC-1).
