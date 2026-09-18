## Matriz de rastreabilidade

| Regra | Origem | Teste que comprova | Veredito |
|---|---|---|---|
| R1 | P12 | `api/verificacoes/inscricoes.spec.js:159` («respeita a precedência de erro: INSCRICOES_ENCERRADAS antes de JA_INSCRITO») | COMPROVADA |
| R2 | P1 | `api/verificacoes/inscricoes.spec.js:192` («recusa inscrição exatamente 30 minutos antes do início do primeiro encontro com INSCRICOES_ENCERRADAS») | COMPROVADA |
| R3 | P4 | `api/verificacoes/inscricoes.spec.js:54` («recusa segunda inscrição ativa na mesma atividade com JA_INSCRITO») | COMPROVADA |
| R4 | P3 | `api/verificacoes/inscricoes.spec.js:74` («recusa inscrição com conflito de horário com 409 CONFLITO_DE_HORARIO») | COMPROVADA |
| R5 | P2 | `api/verificacoes/inscricoes.spec.js:110` («recusa quarta inscrição em minicurso com 422 LIMITE_DE_MINICURSOS») | COMPROVADA |
| R6 | P5 | `api/verificacoes/inscricoes.spec.js:5` («cria inscrição confirmada quando há vagas disponíveis») | COMPROVADA |
| R7 | P5, P18 | `api/verificacoes/inscricoes.spec.js:28` («cria inscrição em_espera com posicaoNaEspera correta quando vagasRestantes é zero») | COMPROVADA |
| R8 | P11 | `api/verificacoes/inscricoes.spec.js:216` («recusa inscrição em atividade cancelada com ATIVIDADE_CANCELADA») | COMPROVADA |
| R9 | P14 | `api/verificacoes/inscricoes.spec.js:1265` («verifica que GET /atividades/:id retorna ocupadas, vagasRestantes e emEspera corretos após inscrições mistas») | COMPROVADA |
| R10 | P6 | `api/verificacoes/inscricoes.spec.js:395` («promove o primeiro da fila para convocada com convocadaAte preenchido quando inscrição confirmada é cancelada») | COMPROVADA |
| R11 | P7, P19 | `api/verificacoes/inscricoes.spec.js:441` («define convocadaAte como o fechamento das inscrições quando a convocação ocorre a menos de 2h do fechamento») | COMPROVADA |
| R12 | P7 | `api/verificacoes/inscricoes.spec.js:537` («expira convocação quando relógio avança além de convocadaAte e promove o próximo da fila») | COMPROVADA |
| R13 | P16 | `api/verificacoes/inscricoes.spec.js:599` («confirmação com relógio em convocadaAte exato é válida (200), mas 1ms depois responde 422 CONVOCACAO_EXPIRADA») | COMPROVADA |
| R14 | P17 | `api/verificacoes/inscricoes.spec.js:890` («vaga liberada após o fechamento das inscrições não convoca ninguém e mantém inscrição em_espera») | COMPROVADA |
| R15 | P18 | `api/verificacoes/inscricoes.spec.js:1013` («fila respeita ordem de inserção com criadaEm idêntico: posições 1 e 2; após promoção da primeira, a segunda assume posição 1») | COMPROVADA |
| R16 | P20 | `api/verificacoes/inscricoes.spec.js:945` («reconstrução cronológica: expiração antes do fechamento promove o próximo, mas expiração no/após o fechamento não convoca ninguém (fila congelada)») | COMPROVADA |
| R17 | P22 | `api/verificacoes/inscricoes.spec.js:890` («vaga liberada após o fechamento das inscrições não convoca ninguém e mantém inscrição em_espera») | COMPROVADA |
| R18 | P21 | `api/verificacoes/inscricoes.spec.js:1109` («participante lista apenas suas inscrições, organização lista todas e filtro por atividade funciona») | COMPROVADA |
| R19 | P13 | `api/verificacoes/inscricoes.spec.js:764` («precedência na confirmação: CONVOCACAO_EXPIRADA antes de CONFLITO_DE_HORARIO; e CONFLITO_DE_HORARIO antes de LIMITE_DE_MINICURSOS mantendo convocação válida») | COMPROVADA |
| R20 | P8, P15 | `api/verificacoes/inscricoes.spec.js:706` («recusa confirmação de inscrição em_espera ou expirada com os erros corretos») | COMPROVADA |
| R21 | P8 | `api/verificacoes/inscricoes.spec.js:764` («precedência na confirmação: CONVOCACAO_EXPIRADA antes de CONFLITO_DE_HORARIO; e CONFLITO_DE_HORARIO antes de LIMITE_DE_MINICURSOS mantendo convocação válida») | COMPROVADA |
| R22 | P8 | `api/verificacoes/inscricoes.spec.js:491` («confirma convocação dentro do prazo com sucesso (200, status confirmada)») | COMPROVADA |
| R23 | P9 | `api/verificacoes/inscricoes.spec.js:296` («recusa cancelamento de inscrição já cancelada com 422 INSCRICAO_INATIVA») | COMPROVADA |
| R24 | P10 | `api/verificacoes/inscricoes.spec.js:327` («recusa cancelamento no instante exato do primeiro encontro com 422 ATIVIDADE_JA_INICIADA») | COMPROVADA |
| R25 | P11 | `api/verificacoes/inscricoes.spec.js:357` («respeita a precedência no cancelamento: INSCRICAO_INATIVA antes de ATIVIDADE_JA_INICIADA») | COMPROVADA |
| R26 | P11 | `api/verificacoes/inscricoes.spec.js:1167` («cancelar atividade passa todas inscrições confirmada, convocada e em_espera para cancelada e recusa ações subsequentes») | COMPROVADA |

## Suíte

`node --test api/verificacoes/inscricoes.spec.js verificacoes/presenca.spec.js` → `# tests 44`, `# pass 44`, `# fail 0`

## Achados

1. **R9 corrigida** — O teste em `api/verificacoes/inscricoes.spec.js:1265` agora comprova o cálculo dos campos derivados (`occupadas`, `vagasRestantes`, `emEspera`) no endpoint GET /atividades/:id, resolvendo a lacuna identificada anteriormente.

## Veredito

Todos os itens da especificação M2 estão completamente cobertos: todas as 26 regras têm origem na entrevista (P1-P22) e são comprovadas pelos testes da API. Não há regras marcadas como [SEM PROVA] ou [SEM ORIGEM]. A correção do teste R9 confirma que os contadores derivados da atividade são expostos e calculados corretamente.