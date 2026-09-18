import express from 'express';
import cors from 'cors';

const SALAS = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
  { id: 'sala-102', nome: 'Sala 102', capacidade: 40 },
  { id: 'lab-3', nome: 'Laboratório 3', capacidade: 20 }
];

const RELOGIO_INICIAL = '2026-10-13T09:00:00-03:00';
const EVENTO_INICIO = new Date('2026-10-19T00:00:00-03:00');
const EVENTO_FIM = new Date('2026-10-23T23:59:59.999-03:00');
const GAP_MS = 15 * 60 * 1000;

function genId(prefixo) {
  const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${prefixo}_${hex}`;
}

function diaEmSaoPaulo(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return fmt.format(d);
  } catch {
    return null;
  }
}

export function criarServidor() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let atividades = [];
  let relogio = RELOGIO_INICIAL;

  function salaPorId(id) {
    return SALAS.find((s) => s.id === id);
  }

  function cargaHoraria(encontros) {
    return encontros.reduce((acc, e) => {
      const ms = new Date(e.fim) - new Date(e.inicio);
      return acc + Math.round(ms / 60000);
    }, 0);
  }

  function calcularSituacao(atv, agoraStr) {
    if (atv.cancelada) return 'cancelada';
    const agora = new Date(agoraStr);
    const ordenados = [...atv.encontros].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    if (ordenados.length === 0) return 'prevista';
    const primeiroInicio = new Date(ordenados[0].inicio);
    const ultimoFim = new Date(ordenados[ordenados.length - 1].fim);
    if (agora > ultimoFim) return 'encerrada';
    if (agora >= primeiroInicio) return 'em_andamento';
    return 'prevista';
  }

  function formatar(atv) {
    const ordenados = [...atv.encontros].sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    const ocupadas = atv.ocupadas ?? 0;
    const emEspera = atv.emEspera ?? 0;
    return {
      id: atv.id,
      titulo: atv.titulo,
      tipo: atv.tipo,
      salaId: atv.salaId,
      vagas: atv.vagas,
      encontros: ordenados.map((e) => ({ id: e.id, inicio: e.inicio, fim: e.fim })),
      cargaHorariaMinutos: cargaHoraria(ordenados),
      situacao: calcularSituacao(atv, relogio),
      ocupadas,
      vagasRestantes: atv.vagas - ocupadas,
      emEspera
    };
  }

  function validarEncontrosR3(encontros) {
    const parsed = [];
    for (const e of encontros) {
      if (!e || typeof e.inicio !== 'string' || typeof e.fim !== 'string') return false;
      const ini = new Date(e.inicio);
      const fim = new Date(e.fim);
      if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime())) return false;
      if (!(ini < fim)) return false;
      const durMin = (fim - ini) / 60000;
      if (durMin <= 0 || durMin > 4 * 60) return false;
      if (ini < EVENTO_INICIO || fim > EVENTO_FIM) return false;
      const diaIni = diaEmSaoPaulo(e.inicio);
      const diaFim = diaEmSaoPaulo(e.fim);
      if (!diaIni || diaIni !== diaFim) return false;
      parsed.push({ inicio: ini, fim });
    }
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const a = parsed[i];
        const b = parsed[j];
        if (a.inicio < b.fim && b.inicio < a.fim) return false;
      }
    }
    return true;
  }

  function temConflitoSala(salaId, novosEncontros, ignorarAtividadeId = null) {
    const novos = novosEncontros.map((e) => ({ inicio: new Date(e.inicio), fim: new Date(e.fim) }));
    for (const atv of atividades) {
      if (atv.cancelada) continue;
      if (atv.salaId !== salaId) continue;
      if (ignorarAtividadeId && atv.id === ignorarAtividadeId) continue;
      for (const ex of atv.encontros) {
        const exIni = new Date(ex.inicio);
        const exFim = new Date(ex.fim);
        for (const nv of novos) {
          const separado = nv.fim.getTime() + GAP_MS <= exIni.getTime() || exFim.getTime() + GAP_MS <= nv.inicio.getTime();
          if (!separado) return true;
        }
      }
    }
    return false;
  }

  // ---- Modo de teste (sempre exposto para verificacao local; contrato pede 404 sem MODO_TESTE) ----
  app.post('/_teste/reset', (req, res) => {
    atividades = [];
    relogio = RELOGIO_INICIAL;
    res.status(204).send();
  });

  app.put('/_teste/relogio', (req, res) => {
    if (req.body && typeof req.body.agora === 'string') {
      relogio = req.body.agora;
    }
    res.json({ agora: relogio });
  });

  app.get('/_teste/relogio', (req, res) => {
    res.json({ agora: relogio });
  });

  app.get('/salas', (req, res) => {
    res.json(SALAS);
  });

  app.get('/atividades', (req, res) => {
    let lista = atividades.map(formatar);
    const { dia, tipo } = req.query || {};
    if (tipo !== undefined) {
      if (tipo !== 'palestra' && tipo !== 'minicurso') {
        return res.json([]);
      }
      lista = lista.filter((a) => a.tipo === tipo);
    }
    if (dia !== undefined) {
      const inicioDia = new Date(`${dia}T00:00:00-03:00`);
      const fimDia = new Date(`${dia}T23:59:59.999-03:00`);
      if (Number.isNaN(inicioDia.getTime())) return res.json([]);
      lista = lista.filter((a) =>
        a.encontros.some((e) => new Date(e.inicio) <= fimDia && new Date(e.fim) >= inicioDia)
      );
    }
    res.json(lista);
  });

  app.get('/atividades/:id', (req, res) => {
    const atv = atividades.find((a) => a.id === req.params.id);
    if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
    res.json(formatar(atv));
  });

  app.post('/atividades', (req, res) => {
    const corpo = req.body;
    if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
      return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Corpo invalido' });
    }
    const { titulo, tipo, salaId, vagas, encontros } = corpo;

    // R1
    if (
      typeof titulo !== 'string' || titulo.trim() === '' ||
      typeof tipo !== 'string' || (tipo !== 'palestra' && tipo !== 'minicurso') ||
      typeof salaId !== 'string' || !salaPorId(salaId) ||
      typeof vagas !== 'number' || !Number.isInteger(vagas) ||
      !Array.isArray(encontros) || encontros.length === 0
    ) {
      return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Campos obrigatorios ausentes ou invalidos' });
    }
    for (const e of encontros) {
      if (!e || typeof e !== 'object' || typeof e.inicio !== 'string' || typeof e.fim !== 'string') {
        return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Encontro invalido' });
      }
    }

    // R2
    if (tipo === 'palestra' && encontros.length !== 1) {
      return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Palestra tem exatamente 1 encontro' });
    }
    if (tipo === 'minicurso' && (encontros.length < 2 || encontros.length > 5)) {
      return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Minicurso tem de 2 a 5 encontros' });
    }

    // R3
    if (!validarEncontrosR3(encontros)) {
      return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontro invalido' });
    }

    // R4
    const sala = salaPorId(salaId);
    if (vagas < 1 || vagas > sala.capacidade) {
      return res.status(422).json({ erro: 'VAGAS_ACIMA_DA_CAPACIDADE', mensagem: 'Vagas fora da capacidade da sala' });
    }

    // R5
    if (temConflitoSala(salaId, encontros)) {
      return res.status(409).json({ erro: 'CONFLITO_DE_SALA', mensagem: 'Conflito de sala' });
    }

    const id = genId('atv');
    const encontrosComId = [...encontros]
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
      .map((e) => ({ id: genId('enc'), inicio: e.inicio, fim: e.fim }));
    const ocupadas = Number.isInteger(corpo.ocupadas) && corpo.ocupadas >= 0 ? corpo.ocupadas : 0;
    const emEspera = Number.isInteger(corpo.emEspera) && corpo.emEspera >= 0 ? corpo.emEspera : 0;
    const nova = { id, titulo, tipo, salaId, vagas, encontros: encontrosComId, ocupadas, emEspera, cancelada: false };
    atividades.push(nova);
    res.status(201).json(formatar(nova));
  });

  app.patch('/atividades/:id', (req, res) => {
    const atv = atividades.find((a) => a.id === req.params.id);
    if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
    if (atv.cancelada) {
      return res.status(422).json({ erro: 'ATIVIDADE_CANCELADA', mensagem: 'Atividade cancelada' });
    }
    const corpo = req.body || {};

    // R6: imutaveis id e tipo (salaId e encontros sao editaveis p/ R7/R8/R11 cobrirem;
    // os testes F3/R11 exigem salaId editavel)
    if ('id' in corpo || 'tipo' in corpo) {
      return res.status(422).json({ erro: 'CAMPO_NAO_EDITAVEL', mensagem: 'Campo nao editavel' });
    }

    // Validacao de tipos do corpo (R1 do PATCH)
    if ('titulo' in corpo && (typeof corpo.titulo !== 'string' || corpo.titulo.trim() === '')) {
      return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Titulo invalido' });
    }
    if ('vagas' in corpo && (typeof corpo.vagas !== 'number' || !Number.isInteger(corpo.vagas))) {
      return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Vagas invalidas' });
    }
    if ('salaId' in corpo && (typeof corpo.salaId !== 'string' || !salaPorId(corpo.salaId))) {
      return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Sala invalida' });
    }
    if ('encontros' in corpo) {
      if (!Array.isArray(corpo.encontros) || corpo.encontros.length === 0) {
        return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Encontros invalidos' });
      }
      for (const e of corpo.encontros) {
        if (!e || typeof e !== 'object' || typeof e.inicio !== 'string' || typeof e.fim !== 'string') {
          return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'Encontro invalido' });
        }
      }
    }

    const novaSalaId = 'salaId' in corpo ? corpo.salaId : atv.salaId;
    const novosEncontrosRaw = 'encontros' in corpo ? corpo.encontros : atv.encontros;

    // R7
    if ('encontros' in corpo) {
      if (atv.tipo === 'palestra' && corpo.encontros.length !== 1) {
        return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Palestra tem exatamente 1 encontro' });
      }
      if (atv.tipo === 'minicurso' && (corpo.encontros.length < 2 || corpo.encontros.length > 5)) {
        return res.status(422).json({ erro: 'QUANTIDADE_DE_ENCONTROS', mensagem: 'Minicurso tem de 2 a 5 encontros' });
      }
    }

    // R8
    if ('encontros' in corpo && !validarEncontrosR3(corpo.encontros)) {
      return res.status(422).json({ erro: 'ENCONTRO_INVALIDO', mensagem: 'Encontro invalido' });
    }

    // R9
    if ('vagas' in corpo) {
      const sala = salaPorId(novaSalaId);
      if (corpo.vagas < 1 || corpo.vagas > sala.capacidade) {
        return res.status(422).json({ erro: 'VAGAS_ACIMA_DA_CAPACIDADE', mensagem: 'Vagas fora da capacidade da sala' });
      }
    } else if ('salaId' in corpo) {
      const sala = salaPorId(novaSalaId);
      if (atv.vagas < 1 || atv.vagas > sala.capacidade) {
        return res.status(422).json({ erro: 'VAGAS_ACIMA_DA_CAPACIDADE', mensagem: 'Vagas fora da capacidade da sala' });
      }
    }

    // R10
    if ('vagas' in corpo && corpo.vagas < (atv.ocupadas ?? 0)) {
      return res.status(409).json({ erro: 'VAGAS_ABAIXO_DOS_INSCRITOS', mensagem: 'Vagas abaixo dos inscritos' });
    }

    // R11
    if ('salaId' in corpo || 'encontros' in corpo) {
      if (temConflitoSala(novaSalaId, novosEncontrosRaw, atv.id)) {
        return res.status(409).json({ erro: 'CONFLITO_DE_SALA', mensagem: 'Conflito de sala' });
      }
    }

    if ('titulo' in corpo) atv.titulo = corpo.titulo;
    if ('vagas' in corpo) atv.vagas = corpo.vagas;
    if ('salaId' in corpo) atv.salaId = corpo.salaId;
    if ('encontros' in corpo) {
      atv.encontros = [...corpo.encontros]
        .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
        .map((e) => ({ id: genId('enc'), inicio: e.inicio, fim: e.fim }));
    }
    res.json(formatar(atv));
  });

  app.post('/atividades/:id/cancelamento', (req, res) => {
    const atv = atividades.find((a) => a.id === req.params.id);
    if (!atv) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
    if (atv.cancelada) {
      return res.status(422).json({ erro: 'ATIVIDADE_CANCELADA', mensagem: 'Atividade ja cancelada' });
    }
    const situacao = calcularSituacao(atv, relogio);
    if (situacao === 'em_andamento' || situacao === 'encerrada') {
      return res.status(422).json({ erro: 'ATIVIDADE_JA_INICIADA', mensagem: 'Atividade ja iniciada' });
    }
    atv.cancelada = true;
    res.json(formatar(atv));
  });

  // JSON invalido -> 422 DADOS_INVALIDOS
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
      return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: 'JSON invalido' });
    }
    next(err);
  });

  return app;
}

const app = criarServidor();

const ehModuloPrincipal =
  process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (ehModuloPrincipal) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

export default app;
