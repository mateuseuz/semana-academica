Auditoria concluída. O relatório completo está em auditorias/audit-M1.md. Resumo dos 10 achados:
🔴 3 Bugs Críticos
1. R14 — encerrada usa >= em vez de >: no exato instante do fim do último encontro, a situação já muda para encerrada quando deveria ser em_andamento. Linha 30.
2. BUG-2 — Loop de sobreposição usa === em objetos: outro === e compara referências, não valores. Funciona na prática mas é frágil.
3. BUG-3 — R5 não detecta sobreposição entre atividades diferentes: gaps negativos de sobreposição não são capturados.
🟡 3 Regras Ausentes no PATCH
- R10 (VAGAS_ABAIXO_DOS_INSCRITOS) — não implementada
- R11 (CONFLITO_DE_SALA no PATCH) — não implementada
- R7/R8 — código comentado e morto no handler PATCH
🟠 + 🔵 Problemas de ordem e edge cases
- Ordem de validação do PATCH diverge do spec (R9 antes de R7/R8)
- !titulo rejeita string vazia como DADOS_INVALIDOS
- api/package.json contradiz o package.json raiz
Resultado dos 28 Critérios de Aceite
✅	⚠️	❌
21	2 (R14 parcial)	3 (R10, R11, R14)