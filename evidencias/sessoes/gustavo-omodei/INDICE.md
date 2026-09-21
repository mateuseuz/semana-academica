# Sessões — Gustavo Omodei

Cada execução de teste é lida pelo que mudou desde a anterior:

- **Ciclo** — vermelho logo depois de mexer só em teste, e depois verde logo depois de mexer só em código. É o TDD.
- **Nasceu verde** — verde logo depois de mexer só em teste. Ou o comportamento já existia, ou o teste não testa o que diz.
- **Juntos** — teste e código mudaram antes da mesma execução. Não houve vermelho para ver.

**Alertas:** *colou* = prompt com 10 palavras seguidas ou mais iguais às do documento de requisitos (só aparece quando o resumo é gerado com `--requisitos`); *leu* = o agente acessou um arquivo de requisitos; *anexou* = o documento foi anexado à conversa.

Requisições são chamadas ao modelo: cada passo do agente é uma. Skills contam tanto a ferramenta `skill` quanto o comando `/nome`.

| Início | Sessão | Requisições | Skills | Subagentes | Vermelhas / verdes | Ciclos | Nasceu verde | Juntos | Alertas |
|---|---|---|---|---|---|---|---|---|---|
| 15/09 11:33 | [New session - 2026-09-15T14:33:49.858Z](ses_f5a82f7ddffe7aNrt02fwVWW4Z.md) | 0 | — | — | 0 / 0 | 0 | 0 | 0 | — |
| 15/09 11:59 | [New session - 2026-09-15T14:59:46.309Z](ses_f5a6b37faffe1kaJOj1daUSg4G.md) | 6 | grilling | — | 0 / 0 | 0 | 0 | 0 | — |
| 15/09 13:31 | [New session - 2026-09-15T16:31:06.448Z](ses_f5a17992fffeYLXPRtCVtk354y.md) | 26 | grilling | — | 0 / 0 | 0 | 0 | 0 | — |
| 15/09 14:09 | [New session - 2026-09-15T17:09:11.769Z](ses_f59f4ba26ffe798lqLtBafaqby.md) | 12 | to-spec | — | 0 / 0 | 0 | 0 | 0 | — |
| 15/09 14:15 | [New session - 2026-09-15T17:15:36.218Z](ses_f59eedc65ffepZBUJMxmlSNUir.md) | 23 | tdd | — | 1 / 2 | 0 | 1 | 1 | — |
| 15/09 14:39 | [New session - 2026-09-15T17:39:47.273Z](ses_f59d8b836ffeGapXhFJJZluzin.md) | 36 | tdd | — | 4 / 5 | 4 | 0 | 0 | — |
| 15/09 15:02 | [New session - 2026-09-15T18:02:05.411Z](ses_f59c44d1cffeOraKvMZV5gfT6k.md) | 31 | tdd | — | 4 / 3 | 2 | 0 | 0 | — |
| 15/09 15:17 | [New session - 2026-09-15T18:17:08.620Z](ses_f59b684f3ffebGgBj8qgsWmdd4.md) | 11 | — | — | 0 / 0 | 0 | 0 | 0 | — |
| 17/09 14:30 | [Primeira fatia da interface do M3 com TDD](ses_f4f942e14ffe0pLAP9gPyeWFMQ.md) | 63 | telas-m3 | — | 1 / 5 | 1 | 0 | 0 | — |
| | **Total: 9 sessões** | 208 | grilling (2), to-spec, tdd (3), telas-m3 | — | 10 / 15 | 7 | 1 | 1 | — |
