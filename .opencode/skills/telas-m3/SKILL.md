---
name: telas-m3
description: Orienta a implementação e testes da interface do módulo M3 — Presença por QR, incluindo QR fullscreen, leitura manual/câmera e funcionamento offline.
---

# Skill: Telas do M3 — Presença por QR

Use esta skill ao implementar ou testar a interface do módulo M3 da Semana Acadêmica.

## Objetivo

Implementar a interface do M3 de acordo com:

- `../specs/M3-presenca.md`
- `../contrato-api.md`
- requisitos do projeto
- comportamento já implementado e testado na API

Não invente regras de negócio que não estejam na especificação.

## Antes de implementar

Leia obrigatoriamente:

1. `specs/M3-presenca.md`
2. `contrato-api.md`
3. código atual da API do M3
4. testes existentes da API
5. estrutura atual da interface

Identifique quais telas e comportamentos do M3 estão definidos na especificação.

## Telas mínimas

A interface do M3 deve contemplar:

### Organização

Tela para exibição do QR Code do encontro.

Requisitos:

- exibição em tela cheia;
- apresentação clara do código;
- atualização automática conforme as regras da especificação;
- tratamento de erros da API;
- não implementar regras de validade diferentes das definidas na spec.

### Participante

Tela para registrar presença.

Deve permitir:

- leitura do QR Code pela câmera, caso suportado pela tecnologia escolhida;
- entrada manual do código;
- envio da presença para a API;
- feedback visual de sucesso;
- feedback visual de erro;
- tratamento de código expirado ou inválido conforme o contrato.

### Funcionamento offline

Quando a especificação exigir funcionamento offline:

- detectar indisponibilidade da rede;
- armazenar localmente os dados necessários para sincronização;
- não perder uma leitura válida por falta de conexão;
- sincronizar automaticamente quando a conexão voltar;
- tratar duplicidades conforme a regra definida na spec;
- informar ao usuário o estado da sincronização.

## Testes

Os testes da interface devem utilizar uma API fake/mocked.

Não depender de:

- servidor real;
- banco de dados real;
- internet;
- serviços externos.

Os testes devem comprovar os comportamentos definidos na especificação.

Para cada regra da spec que possuir comportamento na interface:

1. identificar a regra R-xx;
2. criar o teste correspondente;
3. executar o teste antes da implementação;
4. confirmar a falha;
5. implementar o mínimo necessário;
6. executar novamente;
7. confirmar que o teste passou.

Não alterar um teste existente apenas para fazê-lo passar.

## TDD

Implementar uma fatia por vez.

Fluxo obrigatório:

1. escolher a próxima regra/fatia;
2. criar o teste;
3. executar e verificar falha;
4. implementar;
5. executar e verificar sucesso;
6. revisar o diff;
7. commitar a fatia;
8. iniciar nova sessão para a próxima fatia.

Usar commits identificando a regra quando aplicável:

`M3-Rxx: descrição da regra`

## API

A interface deve respeitar rigorosamente `contrato-api.md`.

Não:

- alterar endpoints existentes para facilitar a interface;
- alterar nomes de campos;
- inventar códigos HTTP;
- criar comportamentos diferentes dos definidos no contrato.

Se a interface precisar de uma informação que não esteja disponível na API/contrato, pare e informe o problema em vez de inventar um endpoint.

## Offline

A estratégia de armazenamento local deve ser simples e compatível com a tecnologia utilizada pelo projeto.

Antes de implementar sincronização:

- verificar como o projeto já trata armazenamento local;
- verificar se existe biblioteca já utilizada pelo projeto;
- evitar adicionar dependências desnecessárias.

A fila offline deve ser persistente enquanto necessária e deve permitir identificar os registros já sincronizados.

## UX

As telas devem deixar claramente visível:

- estado atual da conexão;
- sucesso ou falha da operação;
- presença pendente de sincronização;
- erros que exigem ação do usuário.

Não esconder falhas silenciosamente.

## Escopo

Esta skill é exclusiva da interface do M3.

Não implementar:

- M1;
- M2;
- M4;
- M5;
- regras futuras não presentes na spec do M3.

Se uma dependência de outro módulo for necessária, sinalizar antes de alterar o escopo.

## Regra principal

A especificação é a fonte de verdade.

Quando houver dúvida entre uma implementação conveniente e o comportamento descrito em `specs/M3-presenca.md`, seguir a especificação e o contrato da API.