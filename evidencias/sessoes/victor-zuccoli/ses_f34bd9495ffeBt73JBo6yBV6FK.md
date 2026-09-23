# Atualizar M4-certificados com regras P11 e P12

| | |
|---|---|
| Sessão | `ses_f34bd9495ffeBt73JBo6yBV6FK` |
| Pasta | Desktop/semana-academica |
| Período | 22/09 19:35 → 22/09 19:55 |
| Modelo | opencode/nemotron-3.5-lightning-free |
| Requisições ao modelo | 8 |
| Tokens de entrada / saída | 162.235 / 3.400 |
| Skills | — |
| Subagentes | — |
| Execuções de teste | 0 vermelhas, 0 verdes |
| TDD | 0 ciclo(s) vermelho → verde · 0 teste(s) que já nasceram verdes · 0 vez(es) teste e código juntos |
| Arquivos editados | 0 de teste, 0 de código, 0 de entrevista, 2 de spec, 0 de contexto, 0 de auditoria |
| Alertas | — |

## Linha do tempo

- `22/09 19:35` **prompt** — Use a skill to-spec. Atualize specs/M4-certificados.md a partir de entrevistas/M4-certificados.md e contrato-api.md. Preserve as regras já existentes e acrescente as regras originadas de P11 e P12, citando: - P11 / RN-408 - P12 / RN-409 Confira também se a seção de erros e rotas está de acordo com contrato-api.md. Não altere entrevistas/M4-certificados.md. Não implemente código. Ao terminar, most…
- `22/09 19:42` **prompt** — Faça agora a edição. Não explique e não faça novo planejamento. Edite somente specs/M4-certificados.md. 1. Preserve R1-R10. 2. Adicione: R11 — Verificação pública Origem: P11 / RN-408. A verificação por GET /certificados/:codigo é pública, não exige X-Usuario, aceita o código em minúsculas e retorna os dados definidos no contrato para a verificação do certificado. R12 — Nome abreviado Origem: P12…
- `22/09 19:45` edita spec `specs/M4-certificados.md`
- `22/09 19:47` **prompt** — Remova somente esta linha de specs/M4-certificados.md: - `FORA_DA_JANELA` — 422 (certificado, embora não haja regra própria para M4) Não altere mais nada. Salve e PARE.
- `22/09 19:50` edita spec `specs/M4-certificados.md`
