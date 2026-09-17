import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(cors());
app.use(express.json());

let relogio = { agora: '2026-10-13T09:00:00-03:00' };
let atividades = [];
let proximoId = 1;

// Dados iniciais do contrato
const salas = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
  { id: 'sala-102', nome: 'Sala 102', capacidade: 40 },
  { id: 'lab-3', nome: 'Laboratório 3', capacidade: 20 }
];

// Dados iniciais de atividades
const atividadesIniciais = [
  {
    id: 'atv_1a2b3c4d',
    titulo: 'Flutter do zero',
    tipo: 'minicurso',
    salaId: 'lab-3',
    vagas: 20,
    encontros: [
      { id: 'enc_5e6f7a8b', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }
    ],
    cargaHorariaMinutos: 180,
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: 20,
    emEspera: 0
  }
];
atividades = [...atividadesIniciais];

// Rotas públicas (sem autenticação)
app.get('/salas', (req, res) => {
  res.json(salas);
});

app.get('/atividades', (req, res) => {
  res.json(atividades);
});

app.get('/atividades/:id', (req, res) => {
  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
  res.json(atv);
});

// Rotas de organização
app.post('/atividades', (req, res) => {
  const { titulo, tipo, salaId, vagas, encontros } = req.body || {};
  if (!titulo || !tipo || !salaId || vagas === undefined || !encontros) {
    return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Campos obrigatórios ausentes' });
  }
  const nextId = proximoId++;
  const id = `atv_${nextId.toString(36).padStart(4, '0')}`;
  const novaAtividade = {
    id, titulo, tipo, salaId, vagas, encontros,
    cargaHorariaMinutos: encontros.reduce((acc, e) => acc + (new Date(e.fim) - new Date(e.inicio)) / 60000, 0),
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: vagas,
    emEspera: 0
  };
  atividades.push(novaAtividade);
  res.status(201).json(novaAtividade);
});

app.patch('/atividades/:id', (req, res) => {
  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
  Object.assign(atv, req.body);
  res.json(atv);
});

app.post('/atividades/:id/cancelamento', (req, res) => {
  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
  atv.situacao = 'cancelada';
  res.json(atv);
});

export function criarServidor() {
  const serverApp = express();
  serverApp.use(cors());
  serverApp.use(express.json());

  // Mesmas rotas no serverApp
  serverApp.get('/salas', (req, res) => res.json(salas));
  serverApp.get('/atividades', (req, res) => res.json(atividades));
  serverApp.get('/atividades/:id', (req, res) => {
    const atv = atividades.find(a => a.id === req.params.id);
    if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
    res.json(atv);
  });
  serverApp.post('/atividades', (req, res) => {
    const { titulo, tipo, salaId, vagas, encontros } = req.body || {};
    const nextId = proximoId++;
    const id = `atv_${nextId.toString(36).padStart(4, '0')}`;
    const novaAtividade = { id, titulo, tipo, salaId, vagas, encontros, cargaHorariaMinutos: 0, situacao: 'prevista', ocupadas: 0, vagasRestantes: vagas, emEspera: 0 };
    atividades.push(novaAtividade);
    res.status(201).json(novaAtividade);
  });
  serverApp.patch('/atividades/:id', (req, res) => {
    const atv = atividades.find(a => a.id === req.params.id);
    if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
    Object.assign(atv, req.body);
    res.json(atv);
  });
  serverApp.post('/atividades/:id/cancelamento', (req, res) => {
    const atv = atividades.find(a => a.id === req.params.id);
    if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
    atv.situacao = 'cancelada';
    res.json(atv);
  });

  return serverApp;
}

// Iniciar servidor automaticamente quando executado diretamente
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});