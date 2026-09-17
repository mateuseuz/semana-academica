# Diretrizes da Interface (app)

## Stack
- React com Vite
- Estilização: CSS Modules ou Tailwind CSS
- Testes: Vitest + React Testing Library (com API simulada/mock)

## Regras
- Consumir a API do M1 seguindo estritamente as rotas do contrato-api.md.
- Isolar as chamadas de API em um serviço/hook customizado (`useAtividades` ou `apiService`) para facilitar os mocks nos testes.
- Não alterar regras de negócio do backend no front-end.