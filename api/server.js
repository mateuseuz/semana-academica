import express from 'express';
import { fileURLToPath } from 'node:url';

const app = express();
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

export function criarServidor() {
  return app;
}

function calcularSituacao(atv) {
  if (atv._cancelada) return 'cancelada';
  const agora = new Date(relogio.agora);
  const primeiroInicio = new Date(atv.encontros[0]?.inicio);
  const ultimoFim = new Date(atv.encontros[atv.encontros.length - 1]?.fim);
  if (agora < primeiroInicio) return 'prevista';
  if (agora >= primeiroInicio && agora <= ultimoFim) return 'em_andamento';
  if (agora > ultimoFim) return 'encerrada';
  return 'prevista';
}

function atividadeResponse(atv) {
  return {
    ...atv,
    situacao: calcularSituacao(atv)
  };
}

// --- Modo de teste ---

app.post('/_teste/reset', (req, res) => {
  relogio = { agora: '2026-10-13T09:00:00-03:00' };
  atividades = [];
  proximoId = 1;
  res.status(204).send();
});

app.put('/_teste/relogio', (req, res) => {
  const { agora } = req.body;
  relogio = { agora };
  res.json({ agora });
});

app.get('/_teste/relogio', (req, res) => {
  res.json({ agora: relogio.agora });
});

// --- GET /salas ---

app.get('/salas', (req, res) => {
  res.json(salas);
});

// --- GET /atividades ---

app.get('/atividades', (req, res) => {
  const { dia, tipo } = req.query;
  let resultado = atividades.map(atividadeResponse);

  if (tipo) {
    if (tipo !== 'palestra' && tipo !== 'minicurso') {
      resultado = [];
    } else {
      resultado = resultado.filter(a => a.tipo === tipo);
    }
  }

  if (dia) {
    resultado = resultado.filter(a =>
      a.encontros.some(e => {
        const dataIni = e.inicio.split('T')[0];
        const dataFim = e.fim.split('T')[0];
        return dataIni <= dia && dataFim >= dia;
      })
    );
  }

  res.json(resultado);
});

// --- GET /atividades/:id ---

app.get('/atividades/:id', (req, res) => {
  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
  res.json(atividadeResponse(atv));
});

// --- POST /atividades ---

app.post('/atividades', (req, res) => {
  const { "x-usuario": usuario } = req.headers;
  if (!usuario) return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'Usuário não informado' });

  // R1: DADOS_INVALIDOS
  if (!req.body || typeof req.body !== 'object') {
    return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Corpo inválido' });
  }
  const { titulo, tipo, salaId, vagas, encontros } = req.body;
  if (!titulo || !tipo || !salaId || vagas === undefined || !encontros || !Array.isArray(encontros)) {
    return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Campos obrigatórios ausentes ou de tipo errado' });
  }

  // R2: QUANTIDADE_DE_ENCONTROS
  if (tipo === 'palestra' && encontros.length !== 1) {
    return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Palestra deve ter exatamente 1 encontro' });
  }
  if (tipo === 'minicurso' && (encontros.length < 2 || encontros.length > 5)) {
    return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Minicurso deve ter entre 2 e 5 encontros' });
  }

  // R3: ENCONTRO_INVALIDO
  for (let i = 0; i < encontros.length; i++) {
    const e = encontros[i];
    if (new Date(e.inicio) >= new Date(e.fim)) {
      return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Início deve ser menor que fim' });
    }
    const duracao = (new Date(e.fim) - new Date(e.inicio)) / 3600000;
    if (duracao <= 0 || duracao > 4) {
      return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Duração fora do permitido' });
    }
    const dataInicio = e.inicio.split('T')[0];
    const dataFim = e.fim.split('T')[0];
    if (dataInicio !== dataFim) {
      return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontro deve começar e terminar no mesmo dia' });
    }
    const dtInicio = new Date(e.inicio);
    const dtFim = new Date(e.fim);
    if (dtInicio < new Date('2026-10-19T00:00:00-03:00') || dtFim > new Date('2026-10-23T23:59:59-03:00')) {
      return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontro fora do período do evento' });
    }
    for (let j = 0; j < encontros.length; j++) {
      if (i === j) continue;
      const outro = encontros[j];
      if (new Date(e.inicio).getTime() < new Date(outro.fim).getTime() && new Date(e.fim).getTime() > new Date(outro.inicio).getTime()) {
        return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontros da mesma atividade não podem se sobrepor' });
      }
    }
  }

  // R4: VAGAS_ACIMA_DA_CAPACIDADE
  const sala = salas.find(s => s.id === salaId);
  if (!sala) return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Sala não encontrada' });
  if (vagas > sala.capacidade || vagas < 1) {
    return res.status(422).json({ erro: 'VAGAS_ACIMA_DA_CAPACIDADE', mensagem: 'Vagas fora do permitido' });
  }

  // R5: CONFLITO_DE_SALA
  // Na mesma sala, entre o fim de um encontro e o início do seguinte deve haver no mínimo 15 minutos
  for (let i = 0; i < encontros.length; i++) {
    const e = encontros[i];
    for (const atvAtiva of atividades) {
      if (atvAtiva.salaId !== salaId) continue;
      for (let j = 0; j < atvAtiva.encontros.length; j++) {
        const ee = atvAtiva.encontros[j];
        if (calcularSituacao(atvAtiva) === 'cancelada') continue;
        // Verifica sobreposicao real usando timestamps
        if (new Date(e.inicio).getTime() < new Date(ee.fim).getTime() && new Date(e.fim).getTime() > new Date(ee.inicio).getTime()) {
          return res.status(409).json({ erro: 'CONFLITO_DE_SALA', mensagem: 'Conflito de sala: sobreposicao de horarios' });
        }
        // Calcula o gap entre os encontros (em minutos)
        const gap1 = (new Date(e.inicio).getTime() - new Date(ee.fim).getTime()) / 60000;
        const gap2 = (new Date(ee.inicio).getTime() - new Date(e.fim).getTime()) / 60000;
        if ((gap1 >= 0 && gap1 < 15) || (gap2 >= 0 && gap2 < 15)) {
          return res.status(409).json({ erro: 'CONFLITO_DE_SALA', mensagem: 'Conflito de sala: menos de 15 minutos de intervalo' });
        }
      }
    }
  }

  // Criar atividade
  const atividade = {
    id: `atv_${String(proximoId++).padStart(8, '0')}`,
    titulo,
    tipo,
    salaId,
    vagas,
    encontros: encontros.map(e => ({
      id: `enc_${String(Math.floor(Math.random() * 0xFFFFFFFF)).toString(16).padStart(8, '0')}`,
      inicio: e.inicio,
      fim: e.fim
    })),
    cargaHorariaMinutos: encontros.reduce((acc, e) => acc + (new Date(e.fim) - new Date(e.inicio)) / 60000, 0),
    ocupadas: req.body.ocupadas || 0,
    vagasRestantes: vagas,
    emEspera: 0
  };

  atividades.push(atividade);
  res.status(201).json(atividadeResponse(atividade));
});

// --- PATCH /atividades/:id ---

app.patch('/atividades/:id', (req, res) => {
  const { "x-usuario": usuario } = req.headers;
  if (!usuario) return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'Usuário não informado' });

  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });

  const camposImutaveis = ['id', 'tipo'];
  const camposAlterados = Object.keys(req.body);

  // R6: CAMPO_NAO_EDITAVEL (id e tipo são imutáveis)
  const campoProibido = camposAlterados.find(c => camposImutaveis.includes(c));
  if (campoProibido) {
    return res.status(422).json({ erro: 'CAMPO_NAO_EDITAVEL', mensagem: `Campo ${campoProibido} não pode ser alterado` });
  }

  const novosEncontros = req.body.encontros;
  const novaSalaId = req.body.salaId;
  const novasVagas = req.body.vagas;

  // R7: QUANTIDADE_DE_ENCONTROS (se encontros alterados)
  if (novosEncontros) {
    if (atv.tipo === 'palestra' && novosEncontros.length !== 1) {
      return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Palestra deve ter exatamente 1 encontro' });
    }
    if (atv.tipo === 'minicurso' && (novosEncontros.length < 2 || novosEncontros.length > 5)) {
      return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Minicurso deve ter entre 2 e 5 encontros' });
    }
  }

  // R8: ENCONTRO_INVALIDO (se encontros alterados)
  if (novosEncontros) {
    for (const e of novosEncontros) {
      if (new Date(e.inicio) >= new Date(e.fim)) {
        return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Início deve ser menor que fim' });
      }
      const duracao = (new Date(e.fim) - new Date(e.inicio)) / 3600000;
      if (duracao <= 0 || duracao > 4) {
        return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Duração fora do permitido' });
      }
      const dataInicio = e.inicio.split('T')[0];
      const dataFim = e.fim.split('T')[0];
      if (dataInicio !== dataFim) {
        return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontro deve começar e terminar no mesmo dia' });
      }
      const dtInicio = new Date(e.inicio);
      const dtFim = new Date(e.fim);
      if (dtInicio < new Date('2026-10-19T00:00:00-03:00') || dtFim > new Date('2026-10-23T23:59:59-03:00')) {
        return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontro fora do período do evento' });
      }
      for (let i = 0; i < novosEncontros.length; i++) {
        for (let j = 0; j < novosEncontros.length; j++) {
          if (i === j) continue;
          if (new Date(novosEncontros[i].inicio).getTime() < new Date(novosEncontros[j].fim).getTime() &&
              new Date(novosEncontros[i].fim).getTime() > new Date(novosEncontros[j].inicio).getTime()) {
            return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontros da mesma atividade não podem se sobrepor' });
          }
        }
      }
    }
  }

  // R9: VAGAS_ACIMA_DA_CAPACIDADE (se vagas sendo alteradas)
  if (novasVagas !== undefined) {
    const sala = salas.find(s => s.id === (novaSalaId || atv.salaId));
    if (sala && (novasVagas > sala.capacidade || novasVagas < 1)) {
      return res.status(422).json({ erro: 'VAGAS_ACIMA_DA_CAPACIDADE', mensagem: 'Vagas fora do permitido' });
    }
  }

  // R10: VAGAS_ABAIXO_DOS_INSCRITOS (se vagas sendo alteradas)
  if (novasVagas !== undefined && novasVagas < atv.ocupadas) {
    return res.status(409).json({ erro: 'VAGAS_ABAIXO_DOS_INSCRITOS', mensagem: 'Vagas não pode ser menor que o número de inscritos' });
  }

  // R11: CONFLITO_DE_SALA (se salaId ou encontros alterados)
  const salaAlvo = novaSalaId || atv.salaId;
  const encontrosAlvo = novosEncontros || atv.encontros;
  for (const e of encontrosAlvo) {
    for (const atvAtiva of atividades) {
      if (atvAtiva.id === atv.id) continue;
      if (atvAtiva.salaId !== salaAlvo) continue;
      if (calcularSituacao(atvAtiva) === 'cancelada') continue;
      for (const ee of atvAtiva.encontros) {
        if (new Date(e.inicio).getTime() < new Date(ee.fim).getTime() &&
            new Date(e.fim).getTime() > new Date(ee.inicio).getTime()) {
          return res.status(409).json({ erro: 'CONFLITO_DE_SALA', mensagem: 'Conflito de sala: sobreposicao de horarios' });
        }
      }
    }
  }

  // Aplicar alterações
  for (const [key, value] of Object.entries(req.body)) {
    if (['titulo', 'vagas'].includes(key)) {
      atv[key] = value;
    }
    if (key === 'salaId') {
      atv.salaId = value;
    }
    if (key === 'encontros') {
      atv.encontros = value.map(enc => ({
        id: `enc_${String(Math.floor(Math.random() * 0xFFFFFFFF)).toString(16).padStart(8, '0')}`,
        inicio: enc.inicio,
        fim: enc.fim
      }));
    }
  }

  // Atualizar carga horária
  atv.cargaHorariaMinutos = atv.encontros.reduce((acc, e) => acc + (new Date(e.fim) - new Date(e.inicio)) / 60000, 0);

  res.json(atividadeResponse(atv));
});

// --- POST /atividades/:id/cancelamento ---

app.post('/atividades/:id/cancelamento', (req, res) => {
  const { "x-usuario": usuario } = req.headers;
  if (!usuario) return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'Usuário não informado' });

  const atv = atividades.find(a => a.id === req.params.id);
  if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });

  // R12: ATIVIDADE_JA_INICIADA
  if (calcularSituacao(atv) === 'em_andamento' || calcularSituacao(atv) === 'encerrada') {
    return res.status(422).json({ erro: 'ATIVIDADE_JA_INICIADA', mensagem: 'Atividade já foi iniciada' });
  }

  // R13: ATIVIDADE_CANCELADA
  if (calcularSituacao(atv) === 'cancelada') {
    return res.status(422).json({ erro: 'ATIVIDADE_CANCELADA', mensagem: 'Atividade já está cancelada' });
  }

  atv._cancelada = true;
  res.json(atividadeResponse(atv));
});

const PORT = process.env.PORT || 3000;
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}

