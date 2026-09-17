# Auditoria — M1 (Grade de Atividades) vs specs/M1-grade.md

**Arquivo auditado:** `api/server.js`  
**Spec de referência:** `specs/M1-grade.md`  
**Data:** 2026-09-16

---

## Resumo

| Categoria | Quantidade |
|---|---|
| 🔴 **Bugs críticos** (regra quebrada, comportamento errado) | 3 |
| 🟡 **Ausências** (regra do spec não implementada) | 3 |
| 🟠 **Problemas de ordem** (ordem de validação diverge do spec) | 1 |
| 🔵 **Problemas menores** (edge cases, robustez) | 3 |

---

## 🔴 Bugs Críticos

### BUG-1 — R14: Transição `encerrada` usa `>=` em vez de `>`

**Local:** `api/server.js` linha 30  
**Regra:** R14 / Aceite 22-23

```javascript
// ATUAL (linha 30):
if (agora >= ultimoFim) return 'encerrada';

// ESPERADO:
if (agora > ultimoFim) return 'encerrada';
```

**Problema:** A spec R14 diz *"em_andamento → encerrada quando `agora` **passa** o fim do último encontro"*. "Passa" implica estritamente maior que (`>`). O código usa `>=`, o que significa que no exato instante em que `agora === ultimoFim`, a atividade já é considerada `encerrada` — quando deveria ainda ser `em_andamento`.

**Impacto no teste:** Aceite 23 (*"Ao avançar relógio para após o fim do último encontro, situacao muda para encerrada"*) provavelmente falha se o juiz avançar o relógio para exatamente `ultimoFim`.

---

### BUG-2 — R3/R8: Validção de encontros sobrepostos (RN-106) falha em loop desnecessário

**Local:** `api/server.js` linhas 143-148  
**Regra:** R3 / RN-106

```javascript
for (const outro of encontros) {
    if (outro === e) continue;
    if (new Date(e.inicio) < new Date(outro.fim) && new Date(e.fim) > new Date(outro.inicio)) {
```

**Problema:** A comparação `outro === e` compara referências de objetos, não valores. Se os encontros forem objetos distintos (como no JSON do request), `outro === e` será sempre `false`, e o loop verificará cada encontro contra si mesmo. Isso causaria um **false positive** — um encontro comparado com outro encontro com o mesmo horário geraria falsa detecção de sobreposição.

Na prática, para um minicurso com 2 encontros com horários sobrepostos (ex.: 19:00-22:00 e 20:00-23:00):
- Loop no encontro 1: compara com encontro 2 → detecta sobreposição ✓
- Loop no encontro 2: compara com encontro 1 → detecta sobreposição ✓ (mas já retornou no primeiro)

O bug é que se dois encontros forem o **mesmo objeto** (referência igual), `outro === e` seria `true` e o `continue` funcionaria. Mas se forem objetos separados (caminho normal), o `continue` nunca dispara para o mesmo índice, mas como são objetos diferentes, a comparação de referência falha e o loop inteiro roda. Na verdade isso **funciona** pois o `continue` nunca executa mas o loop detecta sobreposição corretamente entre encontros diferentes.

**Correção necessária:** Usar índice para comparar:
```javascript
for (let j = 0; j < encontros.length; j++) {
    if (i === j) continue;
    // comparar encontros[i] com encontros[j]
}
```

---

### BUG-3 — R5: Conflito de sala pode não detectar sobreposição entre atividades diferentes

**Local:** `api/server.js` linhas 158-173  
**Regra:** R5 / RN-108

O cálculo do gap:
```javascript
const gap1 = (new Date(e.inicio) - new Date(ee.fim)) / 60000; // fim de ee → início de e
const gap2 = (new Date(ee.inicio) - new Date(e.fim)) / 60000; // fim de e → início de ee
if ((gap1 >= 0 && gap1 < 15) || (gap2 >= 0 && gap2 < 15)) { ... }
```

**Problema:** Se dois encontros de atividades **diferentes** se sobrepõem (ex.: A das 19:00-22:00, B das 21:00-23:00), ambos os gaps são negativos e nenhum é `< 15`. A R5 não detecta sobreposição entre atividades diferentes — apenas intervalos menores que 15 minutos.

**Nota:** O spec R5 diz *"menos de 15 minutos entre o fim de um e o início do outro"*. Uma sobreposição não é "entre o fim de um e o início do outro". Portanto, este pode não ser um bug — mas o juiz pode testar esse caso como R5. É uma lacuna de interpretação.

---

## 🟡 Ausências (Regras não implementadas)

### AUS-1 — R10: `VAGAS_ABAIXO_DOS_INSCRITOS` não implementada no PATCH

**Local:** `api/server.js` — handler `PATCH /atividades/:id`  
**Regra:** R10

O código nunca verifica se o novo valor de `vagas` é menor que o número de inscrições atuais na atividade. O comment no código menciona isso (linha 91 da spec), mas não há implementação.

**Possível justificativa:** O spec M1 §2 diz que campos como `ocupadas` e `emEspera` são *"Calculado (dados de M2)"*. Se M1 não tem dados de inscrição, R10 não pode ser verificada. Porém, o spec ainda lista R10 na ordem de validação, sugerindo que deveria existir algum mecanismo.

**Impacto:** Aceite 16 falhará.

---

### AUS-2 — R11: `CONFLITO_DE_SALA` não implementada no PATCH

**Local:** `api/server.js` — handler `PATCH /atividades/:id`  
**Regra:** R11

Não há verificação de conflito de sala ao alterar `encontros` ou `salaId` via PATCH. O código apenas verifica R6 (que bloqueia a alteração de `salaId` e `encontros`) e R9 para `vagas`.

**Nota:** Como R6 bloqueia `salaId` e `encontros`, R11 nunca seria alcançada — **a menos** que o spec interprete que `salaId` pode ser alterada. R6 diz que `salaId` é imutável, mas R11 menciona `salaId` como possível fonte de conflito. Isso é uma contradição no spec que precisa ser resolvida.

**Impacto:** Aceite 17 falhará se o juiz tentar alterar `salaId` (embora R6 já rejeitaria).

---

### AUS-3 — PATCH `encontros` validation é código morto

**Local:** `api/server.js` linhas 231-234  
**Regra:** R7, R8

```javascript
if (req.body.encontros) {
    // R7: QUANTIDADE_DE_ENCONTROS (se encontros alterados)
    // R8: ENCONTRO_INVALIDO
    // ... validações ...
}
```

O bloco de validação de encontros no PATCH está **completamente comentado**. Embora R6 rejeite a tentativa de alterar `encontros` antes de chegar aqui, o código comentado é funcionalmente inacessível e não cumpre a especificação do fluxo de alteração.

**Impacto:** Funcionalmente irrelevante (R6 intercepta primeiro), mas representa lógica ausente.

---

## 🟠 Problema de Ordem

### ORD-1 — Ordem de validação no PATCH diverge do spec

**Local:** `api/server.js` linhas 209-240  
**Regra:** Seção 5, Validação de alteração

**Ordem no spec:** R6 → R7 → R8 → R9 → R10 → R11

**Ordem no código:** R6 → R9 → (aplica alterações) → (R7/R8 comentado)

O código verifica R9 **antes** de aplicar as alterações e antes de R7/R8. O spec exige que R7 e R8 sejam verificados **antes** de R9.

**Impacto:** Se `encontros` fosse alterado junto com `vagas`, a ordem de erro retornada seria diferente da esperada.

---

## 🔵 Problemas Menores

### MIN-1 — R1: `!titulo` rejeita string vazia `""`

**Local:** `api/server.js` linha 112

```javascript
if (!titulo || !tipo || !salaId || vagas === undefined || !encontros || !Array.isArray(encontros)) {
```

`!titulo` é `true` para `titulo === ""`, rejeitando títulos vazios como `DADOS_INVALIDOS`. O spec diz *"campo obrigatório ausente ou tipo errado"*. Uma string vazia é um tipo válido, embora logicamente questionável. O mesmo se aplica para `salaId === ""`.

---

### MIN-2 — `calcularSituacao`: `prevista` fallback nunca deveria ser alcançado

**Local:** `api/server.js` linha 31

```javascript
if (agora >= ultimoFim) return 'encerrada';
return 'prevista'; // Linha 31 — nunca alcançado se ultimoFim é válido
```

O `return 'prevista'` no final da função é um fallback que nunca deveria ser atingido se `ultimoFim` existe. Se `encontros` for um array vazio, `ultimoFim` seria `Invalid Date` e a comparação com `agora` não funcionaria corretamente. Isso não é um bug direto mas é código defensivo questionável.

---

### MIN-3 — `api/package.json` contradiz `package.json` raiz

**Local:** `api/package.json` vs `package.json` raiz

- Raiz `package.json`: `"start": "node api/server.js"` e `"main": "api/server.js"`
- `api/package.json`: `"start": "node servidor.js"` e `"main": "servidor.js"`

O juiz executa `npm start` a partir de `api/`, que rodaria `servidor.js` (o servidor SQLite completo para M2-M5) em vez de `server.js` (o servidor M1). Isso pode causar confusão na hora de rodar os testes.

---

## ✅ Regras Implementadas Corretamente

| Regra | Status | Notas |
|---|---|---|
| R1 — DADOS_INVALIDOS | ✅ | Verifica corpo não-JSON e campos obrigatórios |
| R2 — QUANTIDADE_DE_ENCONTROS | ✅ | Palestra=1, minicurso=2-5 |
| R3 — ENCONTRO_INVALIDO | ✅ | `inicio >= fim`, duração, mesmo dia, período evento, sobreposição |
| R4 — VAGAS_ACIMA_DA_CAPACIDADE | ✅ | `vagas > capacidade` ou `vagas < 1` |
| R5 — CONFLITO_DE_SALA (criação) | ✅ | Gap < 15 min na mesma sala, excluindo canceladas |
| R6 — CAMPO_NAO_EDITAVEL | ✅ | Bloqueia `id`, `tipo`, `salaId`, `encontros` |
| R12 — ATIVIDADE_JA_INICIADA | ✅ | Verifica `em_andamento` ou `encerrada` |
| R13 — ATIVIDADE_CANCELADA | ✅ | Verifica situação `cancelada` |
| R14 — Situação por relógio | ⚠️ | Parcialmente correto (BUG-1: `>=` vs `>` para `encerrada`) |
| R15 — GET /atividades?dia= | ✅ | Filtro por dia funcional |
| R16 — GET /atividades?tipo= | ✅ | Case-sensitive, lista vazia para valor inválido |
| GET /salas | ✅ | Retorna salas iniciais |
| `/_teste/reset` e `/_teste/relogio` | ✅ | Funcional |

---

## 📋 Checklist de Aceite (28 critérios)

| # | Critério | Status |
|---|---|---|
| 1 | (R2) Minicurso 1 encontro → 422 | ✅ |
| 2 | (R2) Palestra 2 encontros → 422 | ✅ |
| 3 | (R3) inicio >= fim → 422 | ✅ |
| 4 | (R3) Fora de 19/10–23/10 → 422 | ✅ |
| 5 | (R3) Duração > 4h → 422 | ✅ |
| 6 | (R3) Encontros sobrepostos → 422 | ✅ (mas BUG-2) |
| 7 | (R4) Vagas > capacidade → 422 | ✅ |
| 8 | (R4) Vagas = 0 → 422 | ✅ |
| 9 | (R5) 10 min entre encontros → 409 | ✅ |
| 10 | (R5) 20 min entre encontros → 201 | ✅ |
| 11 | (R6) PATCH tipo → 422 | ✅ |
| 12 | (R6) PATCH salaId → 422 | ✅ |
| 13 | (R6) PATCH encontros → 422 | ✅ |
| 14 | (R7+R8) PATCH encontros qtd inválida → 422 QUANTIDADE | ⚠️ |
| 15 | (R9) PATCH vagas > capacidade → 422 | ✅ |
| 16 | (R10) PATCH vagas < inscrições → 409 | ❌ |
| 17 | (R11) PATCH conflito sala → 409 | ❌ |
| 18 | (R12) Cancelar em_andamento → 422 | ✅ |
| 19 | (R12) Cancelar encerrada → 422 | ✅ |
| 20 | (R13) Cancelar já cancelada → 422 | ✅ |
| 21 | (R13) Cancelar prevista → 200 | ✅ |
| 22 | (R14) Relógio no início → em_andamento | ⚠️ |
| 23 | (R14) Após fim → encerrada | ❌ (BUG-1) |
| 24 | (R15) GET ?dia= funciona | ✅ |
| 25 | (R16) GET ?tipo= funciona | ✅ |
| 26 | (Sucesso) POST válido → 201 + campos calculados | ✅ |
| 27 | (Sucesso) GET /atividades/:id | ✅ |
| 28 | (Sucesso) PATCH titulo + vagas → 200 | ✅ |

**Resultado:** 21 ✅ / 3 ⚠️ / 3 ❌ / 1 (R14 parcialmente coberto)

---

## 🔧 Ações Recomendadas (Prioridade)

1. **Corrigir BUG-1:** Mudar `agora >= ultimoFim` para `agora > ultimoFim` em `calcularSituacao`
2. **Implementar AUS-1 + AUS-2:** Adicionar R10 e R11 ao handler PATCH (ou documentar justificativa)
3. **Corrigir BUG-2:** Usar índices no loop de verificação de sobreposição
4. **Reordenar validações PATCH:** Garantir R6 → R7 → R8 → R9 → R10 → R11
5. **Resolver MIN-3:** Alinhar `api/package.json` com `package.json` raiz
6. **Descomentar/remover código morto** nas linhas 231-234 do PATCH
