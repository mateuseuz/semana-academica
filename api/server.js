import { criarServidor } from './servidor.js';

const porta = process.env.PORT || 3000;
criarServidor({ porta });
console.log(`Servidor rodando na porta ${porta}`);
