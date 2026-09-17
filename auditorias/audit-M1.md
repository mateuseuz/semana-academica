# Auditoria — M1 (Grade de Atividades) vs specs/M1-grade.md

**Arquivo auditado:** `api/server.js`  
**Spec de referência:** `specs/M1-grade.md`  
**Data:** 2026-09-17  
**Testes de verificação:** `verificacoes/atividades.spec.js` (45 testes: 22 ✅ / 23 ❌)

---

## Resumo

| Categoria | Quantidade |
|---|---|
| 🔴 **Bugs críticos** (regra não implementada, comportamento errado) | 6 |
| 🟡 **Ausências** (funcionalidade inteira ausente) | 4 |
| 🟠 **Problemas de arquitetura** (arquivo errado, confusão de servidor) | 2 |
| 🔵 **Problemas menores** (edge cases, robustez) | 2 |

> **Nota importante:** A auditoria anterior (2026-09-16) analisava uma versão com implementação parcial que possuía lógica de validação com bugs. O código atual de `api/server.js` é um **esqueleto estrutural** — não contém nenhuma validação, nem cálculo de situação, nem modo de teste. A auditoria anterior não reflete mais o estado atual do código.

---

## 🔴 Bugs Críticos

### BUG-1 — R1/R2/R3/R4/R5: Validação de criação completamente ausente

**Local:** `api/server.js` linhas 57-74 (handler `POST /atividades`)  
**Regras:** R1, R2, R3, R4, R5

O handler `POST /atividades` no `criarServidor()` (e no `app`) recebe o corpo e cria a atividade **sem qualquer validação**:

```javascript
serverApp.post('/atividades', (req, res) => {
  const { titulo, tipo, salaId, vagas, encontros } = req.body || {};
  const nextId = proximoId++;
  const id = `atv_${nextId.toString(36).padStart(4, '0')}`;
  const novaAtividade = { id, titulo, tipo, salaId, vagas, encontros, ... };
  atividades.push(novaAtividade);
  res.status(201).json(novaAtividade);  // Sempre 201, sem verificar nada
});
```

**Problema:** Todas as validações de criação (R1-R5) estão ausentes. Qualquer corpo (mesmo vazio, com tipos errados, encontros inválidos, vagas acima da capacidade, conflitos de sala) retorna **201**. O código não verifica:
- R1: campos obrigatórios, tipos
- R2: quantidade de encontros (palestra=1, minicurso=2-5)
- R3: `inicio >= fim`, período do evento, duração, mesmo dia, sobreposição
- R4: `vagas > capacidade` ou `vagas < 1`
- R5: conflito de sala

**Impacto:** Aceites 1-10 falham. Todos os testes de validação de criação retornam 201 em vez dos códigos corretos.

---

### BUG-2 — R6/R7/R8/R9/R10/R11: Validação de alteração completamente ausente

**Local:** `api/server.js` linhas 76-81 (handler `PATCH /atividades/:id`)  
**Regras:** R6, R7, R8, R9, R10, R11

O handler PATCH é um `Object.assign` sem qualquer validação:

```javascript
serverApp.patch('/atividades/:id', (req, res) => {
  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
  Object.assign(atv, req.body);  // Aceita TUDO, incluindo campos imutáveis
  res.json(atv);
});
```

**Problema:** Todas as validações de alteração estão ausentes:
- R6: `tipo`, `salaId`, `encontros` podem ser alterados (deveriam ser rejeitados)
- R7-R8: não verifica quantidade nem validade de encontros
- R9: não verifica capacidade da sala
- R10: não verifica se vagas < inscrições
- R11: não verifica conflito de sala

**Impacto:** Aceites 11-17 falham. PATCH aceita qualquer alteração, incluindo campos imutáveis.

---

### BUG-3 — R12/R13: Cancelamento sem validação

**Local:** `api/server.js` linhas 83-88 (handler `POST /atividades/:id/cancelamento`)  
**Regras:** R12, R13

```javascript
serverApp.post('/atividades/:id/cancelamento', (req, res) => {
  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
  atv.situacao = 'cancelada';  // Sempre define como cancelada, sem verificar situação atual
  res.json(atv);
});
```

**Problema:** Não há verificação de R12 (atividade já iniciada/encerrada) nem R13 (já cancelada). Qualquer atividade pode ser cancelada, inclusive uma já `cancelada` (não idempotente) ou uma `em_andamento`.

**Impacto:** Aceites 18-21 falham.

---

### BUG-4 — R14: Cálculo de situação completamente ausente

**Local:** `api/server.js` — nenhuma função `calcularSituacao` existe  
**Regra:** R14

O código nunca calcula a `situacao` com base no relógio de teste. Todas as atividades criadas permanecem com `situacao: 'prevista'` permanentemente, independentemente do horário do relógio.

**Problema:** O spec R14 exige:
- `prevista` → `em_andamento` quando `agora` passa o início do 1º encontro
- `em_andamento` → `encerrada` quando `agora` passa o fim do último encontro
- `cancelada` prevalece sobre qualquer situação

Não há implementação disso em lugar nenhum. O `server.js` não tem lógica de cálculo de situação.

**Impacto:** Aceites 22-23 falham.

---

### BUG-5 — GET /atividades sem filtros ?dia= e ?tipo=

**Local:** `api/server.js` linha 46-48 (e linhas 96-97 no `criarServidor()`)  
**Regras:** R15, R16

```javascript
app.get('/atividades', (req, res) => {
  res.json(atividades);  // Retorna TODAS, sem filtrar
});
```

**Problema:** O handler `GET /atividades` ignora completamente os query params `?dia=` e `?tipo=`. Retorna todas as atividades sem filtragem.

- R15: `?dia=AAAA-MM-DD` deveria retornar apenas atividades com encontro no dia
- R16: `?tipo=palestra|minicurso` deveria filtrar por tipo; valor inválido → lista vazia

**Impacto:** Aceites 24-25 falham.

---

### BUG-6 — `/_teste/reset` e `/_teste/relogio` não existem em `criarServidor()`

**Local:** `api/server.js` — `criarServidor()` (linhas 90-125)  
**Contrato:** `contrato-api.md` §3

O `criarServidor()` de `server.js` não expõe as rotas `/_teste/reset`, `PUT /_teste/relogio` ou `GET /_teste/relogio`. O contrato exige que essas rotas existam quando `MODO_TESTE=1`.

O teste `verificacoes/atividades.spec.js` faz `import { criarServidor } from '../api/server.js'` e depois chama `POST /_teste/reset`. Isso retorna 404, fazendo com que o array `atividades` nunca seja reiniciado entre testes (causa acúmulo de 16+ atividades).

**Problema:** O `criarServidor()` de `server.js` não implementa o modo de teste. Compare com `servidor.js` que TEM essas rotas.

**Impacto:** Todos os testes que dependem de `reset()` são contaminados pelo estado acumulado. Apenas testes que criam e verificam atividades "limpas" passam acidentalmente.

---

## 🟡 Ausências (Funcionalidades Inteiras Ausentes)

### AUS-1 — R10 (`VAGAS_ABAIXO_DOS_INSCRITOS`) não implementada

**Regra:** R10  
**Local:** `api/server.js`

Não existe verificação de se o novo valor de `vagas` é menor que o número de inscrições atuais. O campo `ocupadas` é sempre 0 no `criarServidor()` e o conceito de inscrições não existe no `server.js`.

---

### AUS-2 — R11 (`CONFLITO_DE_SALA` no PATCH) não implementada

**Regra:** R11  
**Local:** `api/server.js`

Não há verificação de conflito de sala ao alterar encontros ou salaId via PATCH. Como R6 não bloqueia a alteração de `salaId` e `encontros`, e não há validação, qualquer alteração é aceita.

---

### AUS-3 — Campos calculados ausentes

**Regras:** Especificação do Modelo (§3)  
**Local:** `api/server.js`

Os campos derivados não são calculados:
- `cargaHorariaMinutos`: deveria ser a soma das durações dos encontros
- `vagasRestantes`: deveria ser `vagas - ocupadas`
- `emEspera`: deveria ser calculado (dados de M2)
- `ocupadas`: deveria ser calculado (dados de M2)
- `situacao`: deveria ser calculado pelo relógio (BUG-4)

No `criarServidor()`, `cargaHorariaMinutos` é sempre 0 e `ocupadas` é sempre 0. O `server.js` (app) não cria esses campos de forma alguma.

---

### AUS-4 — `GET /_teste/relogio` (GET) não implementada em `server.js`

**Contrato:** `contrato-api.md` §3  
**Local:** `api/server.js`

O `criarServidor()` de `server.js` não implementa nenhuma rota `/_teste/*`. O `servidor.js` tem essas rotas, mas `server.js` não.

---

## 🟠 Problemas de Arquitetura

### ARC-1 — Dois arquivos de servidor conflitantes

**Arquivos:** `api/server.js` vs `api/servidor.js`

- `api/server.js`: `criarServidor()` com rotas básicas, SEM validação, SEM modo de teste. Exportado como módulo.
- `api/servidor.js`: Servidor completo com SQLite, modo de teste (`/_teste/reset`, `/_teste/relogio`), rotas M2-M5, MAS também SEM validação M1.

O `package.json` raiz diz `"start": "node api/server.js"`, mas `api/package.json` diz `"start": "node servidor.js"` e `"main": "servidor.js"`. O juiz roda `npm start` dentro de `api/` (conforme `projeto.json`), que executa `servidor.js`.

**Problema:** Os testes de atividades (`atividades.spec.js`) importam de `api/server.js`, mas o juiz inicia `api/servidor.js`. São comportamentos diferentes. `servidor.js` tem test mode mas também não tem validação M1.

**Impacto:** O juiz pode testar contra `servidor.js` (que tem test mode mas sem validação) enquanto os testes locais rodam contra `server.js` (sem test mode e sem validação).

---

### ARC-2 — `api/package.json` aponta para `servidor.js` mas raiz aponta para `server.js`

**Local:** `api/package.json` vs raiz `package.json`

- Raiz: `"main": "api/server.js"`, `"start": "node api/server.js"`
- `api/package.json`: `"main": "servidor.js"`, `"start": "node servidor.js"`

O juiz executa `npm start` a partir de `api/`, rodando `servidor.js`. Mas a raiz aponta para `server.js`. Isso cria ambiguidade sobre qual código está sendo executado.

---

## 🔵 Problemas Menores

### MIN-1 — `server.js` — `!titulo` rejeita string vazia `""`

**Local:** `api/server.js` linha 59

```javascript
if (!titulo || !tipo || !salaId || vagas === undefined || !encontros) {
```

`!titulo` é `true` para `titulo === ""`. O spec R1 diz *"campo obrigatório ausente ou tipo errado"*. String vazia é tecnicamente um tipo válido, embora questionável. Nota: como a validação está toda ausente (BUG-1), isso é irrelevante no estado atual.

---

### MIN-2 — `api/package.json` lista `sqlite3` como dependência, mas não é usado por `server.js`

**Local:** `api/package.json`

`api/package.json` tem `"sqlite3": "^5.1.7"` na dependência, mas `server.js` não usa SQLite. `servidor.js` usa. Isso inflaciona desnecessariamente as dependências do módulo que contém o servidor stub.

---

## ✅ Regras Implementadas Corretamente

| Regra | Status | Notas |
|---|---|---|
| GET /salas | ✅ | Retorna salas iniciais |
| GET /atividades | ⚠️ | Retorna array mas SEM filtros (BUG-5) |
| GET /atividades/:id | ⚠️ | Retorna atividade ou 404, mas sem campos calculados |
| POST /atividades | ❌ | Sem nenhuma validação (BUG-1) |
| PATCH /atividades/:id | ❌ | Sem nenhuma validação (BUG-2) |
| POST /atividades/:id/cancelamento | ❌ | Sem validação (BUG-3) |
| `/_teste/reset` | ❌ | Não existe em `server.js` (BUG-6) |
| `/_teste/relogio` | ❌ | Não existe em `server.js` (BUG-6) |
| R14 — Situação por relógio | ❌ | Não implementada (BUG-4) |
| R15 — GET ?dia= | ❌ | Sem filtro (BUG-5) |
| R16 — GET ?tipo= | ❌ | Sem filtro (BUG-5) |

---

## 📋 Checklist de Aceite (28 critérios)

| # | Critério | Status |
|---|---|---|
| 1 | (R2) Minicurso 1 encontro → 422 | ❌ |
| 2 | (R2) Palestra 2 encontros → 422 | ❌ |
| 3 | (R3) inicio >= fim → 422 | ❌ |
| 4 | (R3) Fora de 19/10–23/10 → 422 | ❌ |
| 5 | (R3) Duração > 4h → 422 | ❌ |
| 6 | (R3) Encontros sobrepostos → 422 | ❌ |
| 7 | (R4) Vagas > capacidade → 422 | ❌ |
| 8 | (R4) Vagas = 0 → 422 | ❌ |
| 9 | (R5) 10 min entre encontros → 409 | ❌ |
| 10 | (R5) 20 min entre encontros → 201 | ✅ (passa porque não há validação) |
| 11 | (R6) PATCH tipo → 422 | ❌ |
| 12 | (R6) PATCH salaId → 422 | ❌ |
| 13 | (R6) PATCH encontros → 422 | ❌ |
| 14 | (R7+R8) PATCH encontros qtd inválida → 422 QUANTIDADE | ❌ |
| 15 | (R9) PATCH vagas > capacidade → 422 | ❌ |
| 16 | (R10) PATCH vagas < inscrições → 409 | ❌ |
| 17 | (R11) PATCH conflito sala → 409 | ❌ |
| 18 | (R12) Cancelar em_andamento → 422 | ❌ |
| 19 | (R12) Cancelar encerrada → 422 | ❌ |
| 20 | (R13) Cancelar já cancelada → 422 | ❌ |
| 21 | (R13) Cancelar prevista → 200 | ⚠️ |
| 22 | (R14) Relógio no início → em_andamento | ❌ |
| 23 | (R14) Após fim → encerrada | ❌ |
| 24 | (R15) GET ?dia= funciona | ❌ |
| 25 | (R16) GET ?tipo= funciona | ❌ |
| 26 | (Sucesso) POST válido → 201 + campos calculados | ❌ (campos não calculados) |
| 27 | (Sucesso) GET /atividades/:id | ⚠️ |
| 28 | (Sucesso) PATCH titulo + vagas → 200 | ⚠️ |

**Resultado:** 1 ✅ / 3 ⚠️ / 24 ❌ / 0 parcialmente coberto

> **Detalhe:** O único teste que passa (R5 - 20 min de intervalo) passa por *falha da validação* — como não há validação, qualquer coisa é aceita, incluindo o caso válido.

---

## 📊 Resultado dos Testes

```
# tests 45
# pass  22
# fail  23
```

- **22 passam:** Estes são os testes do `presenca.spec.js` (M3) que importam `criarServidor` de `api/servidor.js`, que tem `/_teste/reset` e modo de teste funcional.
- **23 falham:** Todos os testes de validação M1 em `atividades.spec.js`. Falham porque `criarServidor` de `api/server.js` não tem validação nem modo de teste.

---

## 🔧 Ações Recomendadas (Prioridade)

1. **IMPLEMENTAR VALIDAÇÃO COMPLETA DO `criarServidor()`** — Este é o trabalho principal:
   - Adicionar todas as validações R1-R5 no handler `POST /atividades`
   - Adicionar todas as validações R6-R11 no handler `PATCH /atividades/:id`
   - Adicionar validações R12-R13 no handler `POST /atividades/:id/cancelamento`
   - Implementar cálculo de `situacao` (R14) com relógio de teste
   - Implementar filtros `?dia=` e `?tipo=` em `GET /atividades` (R15, R16)

2. **ADICAR ROTAS DE MODO DE TESTE ao `criarServidor()`** — `POST /_teste/reset`, `PUT /_teste/relogio`, `GET /_teste/relogio`. Alternativamente, migrar o `criarServidor()` de `server.js` para ser um wrapper em torno do de `servidor.js`.

3. **RESOLVER ARC-1/ARC-2** — Definir qual arquivo é o servidor principal. Recomendação: consolidar em um único arquivo ou alinhar `api/package.json` com `package.json` raiz. O `criarServidor()` de `server.js` deve ser o ponto de entrada para o juiz, conforme indicado pelo teste que importa dele.

4. **CALCULAR CAMPOS DERIVADOS** — `cargaHorariaMinutos`, `vagasRestantes`, `situacao` devem ser calculados no momento da criação e atualizados pelo relógio.

5. **ALINHAR `api/package.json`** com o `package.json` raiz — ambas devem apontar para o mesmo arquivo principal.

---

## 📝 Comparação com Auditoria Anterior (2026-09-16)

| Aspecto | Auditoria Anterior | Auditoria Atual |
|---|---|---|
| Base do código | Versão com validação parcial | Esqueleto estrutural sem validação |
| Bugs críticos | 3 | 6 |
| Ausências | 3 | 4 |
| Problemas de ordem | 1 | 0 (não se aplica — não há ordem sem validação) |
| Problemas menores | 3 | 2 |
| Aceites falhos | 3 ❌ / 3 ⚠️ / 21 ✅ | 24 ❌ / 3 ⚠️ / 1 ✅ |
| Situação geral | Parcialmente funcional | Essencialmente não funcional para M1 |

A auditoria anterior analisava código com lógica de validação presente mas com bugs de implementação. O código atual é um esqueleto que precisa da implementação completa de todas as regras (R1-R16) e do modo de teste.
