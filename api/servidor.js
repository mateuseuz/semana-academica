import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';

export function criarServidor(options = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let db = new sqlite3.Database(':memory:');

  let currentClock = '2026-10-13T09:00:00-03:00';

  function initDb() {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT,
        papel TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS encontros (
        id TEXT PRIMARY KEY,
        atividadeId TEXT,
        inicio TEXT,
        fim TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS atividades (
        id TEXT PRIMARY KEY,
        titulo TEXT,
        tipo TEXT,
        salaId TEXT,
        vagas INTEGER,
        situacao TEXT DEFAULT 'prevista'
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inscricoes (
        id TEXT PRIMARY KEY,
        atividadeId TEXT,
        participanteId TEXT,
        status TEXT,
        convocadaAte TEXT,
        criadaEm TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS presencas (
        id TEXT PRIMARY KEY,
        encontroId TEXT,
        participanteId TEXT,
        origem TEXT,
        lidoEm TEXT,
        registradaEm TEXT,
        justificativa TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS codigos_gerados (
        encontroId TEXT,
        codigo TEXT,
        minuto TEXT
      )`);
            db.run(`CREATE TABLE IF NOT EXISTS certificados (
        codigo TEXT PRIMARY KEY,
        atividadeId TEXT,
        participanteId TEXT,
        cargaHorariaMinutos INTEGER,
        presencas INTEGER,
        encontros INTEGER,
        emitidoEm TEXT,
        UNIQUE (atividadeId, participanteId)
      )`);

      // Seed initial users
      const users = [
        ['org-ana', 'Ana Beatriz Lima', 'organizacao'],
        ['org-bruno', 'Bruno Tavares', 'organizacao'],
        ['p-carla', 'Carla Mendes Souza', 'participante'],
        ['p-diego', 'Diego Alves', 'participante'],
        ['p-elisa', 'Elisa Fernandes da Rocha', 'participante'],
        ['p-fabio', 'FÃ¡bio Nogueira', 'participante'],
        ['p-gabriela', 'Gabriela Moura Castro', 'participante'],
        ['p-heitor', 'Heitor Campos', 'participante'],
        ['p-isadora', 'Isadora Ribeiro dos Santos', 'participante'],
        ['p-joao', 'JoÃ£o Pedro Martins', 'participante']
      ];

      db.run('DELETE FROM usuarios');
      const stmt = db.prepare('INSERT INTO usuarios (id, nome, papel) VALUES (?, ?, ?)');
      for (const u of users) {
        stmt.run(u);
      }
      stmt.finalize();

      // Seed initial atividades
      db.run('DELETE FROM atividades');
      db.run(`INSERT INTO atividades (id, titulo, tipo, salaId, vagas) VALUES (?, ?, ?, ?, ?)`, [
        'atv_1a2b3c4d',
        'Flutter do zero',
        'minicurso',
        'lab-3',
        20
      ]);

      // Seed initial inscricoes
      db.run('DELETE FROM inscricoes');
      db.run(`INSERT INTO inscricoes (id, atividadeId, participanteId, status, criadaEm) VALUES (?, ?, ?, ?, ?)`, [
        'ins_1',
        'atv_1a2b3c4d',
        'p-carla',
        'confirmada',
        '2026-10-13T09:00:00-03:00'
      ]);

      // Seed initial encontros (including enc_5e6f7a8b for testing)
      db.run('DELETE FROM encontros');
      db.run(`INSERT INTO encontros (id, atividadeId, inicio, fim) VALUES (?, ?, ?, ?)`, [
        'enc_5e6f7a8b',
        'atv_1a2b3c4d',
        '2026-10-19T19:00:00-03:00',
        '2026-10-19T22:00:00-03:00'
      ]);

      db.run('DELETE FROM codigos_gerados');
      db.run('DELETE FROM presencas');
      db.run('DELETE FROM certificados');
    });
  }

  initDb();

  // Test routes
  app.post('/_teste/reset', (req, res) => {
    currentClock = '2026-10-13T09:00:00-03:00';
    initDb();
    res.status(204).send();
  });

  app.put('/_teste/relogio', (req, res) => {
    if (req.body && req.body.agora) {
      currentClock = req.body.agora;
    }
    res.json({ agora: currentClock });
  });

  app.get('/_teste/relogio', (req, res) => {
    res.json({ agora: currentClock });
  });


    app.put('/_teste/atividades/:id', (req, res) => {
  const { vagas, situacao } = req.body || {};

  if (situacao !== undefined) {
    db.run(
      'UPDATE atividades SET situacao = ? WHERE id = ?',
      [situacao, req.params.id],
      () => {
        res.status(204).send();
      }
    );
    return;
  }

  if (vagas !== undefined) {
    db.run(
      'UPDATE atividades SET vagas = ? WHERE id = ?',
      [vagas, req.params.id],
      () => {
        processarVagaLiberada(req.params.id, currentClock, () => {
          res.status(204).send();
        });
      }
    );
  } else {
    res.status(204).send();
  }
});

  app.post('/_teste/atividades', (req, res) => {
    const { id, titulo, tipo, salaId, vagas } = req.body;
    db.run('INSERT INTO atividades (id, titulo, tipo, salaId, vagas) VALUES (?, ?, ?, ?, ?)', [
      id, titulo, tipo, salaId, vagas
    ], () => {
      res.status(201).json({ id });
    });
  });

  app.post('/_teste/encontros', (req, res) => {
    const { id, atividadeId, inicio, fim } = req.body;
    db.run('INSERT INTO encontros (id, atividadeId, inicio, fim) VALUES (?, ?, ?, ?)', [
      id, atividadeId, inicio, fim
    ], () => {
      res.status(201).json({ id });
          });
  });
  // Rotas pÃºblicas (sem autenticaÃ§Ã£o) - GET /salas e GET /atividades
  app.get('/salas', (req, res) => {
    const salas = [
      { id: 'auditorio', nome: 'AuditÃ³rio Central', capacidade: 200 },
      { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
      { id: 'sala-102', nome: 'Sala 102', capacidade: 40 },
      { id: 'lab-3', nome: 'LaboratÃ³rio 3', capacidade: 20 }
    ];
    res.json(salas);
  });

  app.get('/atividades', (req, res) => {
    const atividades = [];
    db.all('SELECT * FROM atividades', (err, rows) => {
      if (err) return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
      res.json(rows);
    });
  });

  // Auth middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/_teste/') || req.path.startsWith('/certificados/')) {
      return next();
    }
    // Isentar rotas pÃºblicas de autenticaÃ§Ã£o
    if (req.path === '/salas' || req.path === '/atividades' || req.path.startsWith('/atividades/')) {
      return next();
    }
    // Tratamento de preflight OPTIONS
    if (req.method === 'OPTIONS') {
      return next();
    }
    const usuarioId = req.headers['x-usuario'];
    if (!usuarioId) {
      return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'UsuÃ¡rio nÃ£o informado' });
    }
    db.get('SELECT * FROM usuarios WHERE id = ?', [usuarioId], (err, row) => {
      if (err || !row) {
        return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'UsuÃ¡rio desconhecido' });
      }
      req.usuario = row;
      next();
    });
  });

  // POST /atividades/:id/cancelamento
  app.post('/atividades/:id/cancelamento', (req, res) => {
    if (req.usuario.papel !== 'organizacao') {
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organizaÃ§Ã£o' });
    }

    const atividadeId = req.params.id;
    const usuarioId = req.headers['x-usuario'];
    db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atividade) => {
      if (err || !atividade) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade nÃ£o encontrada' });
      }

      db.run("UPDATE atividades SET situacao = 'cancelada' WHERE id = ?", [atividadeId], (err) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }

        db.run("UPDATE inscricoes SET status = 'cancelada' WHERE atividadeId = ? AND status IN ('confirmada', 'convocada', 'em_espera')", [atividadeId], (err) => {
          if (err) {
            return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
          }

          db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atv) => {
            db.all('SELECT * FROM encontros WHERE atividadeId = ?', [atividadeId], (err, encontros) => {
              res.json({
                id: atv.id,
                titulo: atv.titulo,
                tipo: atv.tipo,
                salaId: atv.salaId,
                vagas: atv.vagas,
                encontros: encontros.map(e => ({ id: e.id, inicio: e.inicio, fim: e.fim })),
                situacao: atv.situacao || 'cancelada'
              });
            });
          });
        });
      });
    });
  });

  // POST /atividades/:id/inscricoes
  app.post('/atividades/:id/inscricoes', (req, res) => {
    if (req.usuario.papel !== 'participante') {
      return res.status(403).json({ erro: 'SOMENTE_PARTICIPANTE', mensagem: 'Apenas participante' });
    }

    const atividadeId = req.params.id;
    db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atividade) => {
      if (err || !atividade) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade nÃ£o encontrada' });
      }

      // Check ATIVIDADE_CANCELADA (R8 / R1)
      if (atividade.situacao === 'cancelada') {
        return res.status(422).json({ erro: 'ATIVIDADE_CANCELADA', mensagem: 'Atividade cancelada' });
      }

      // Check INSCRICOES_ENCERRADAS (R2 / R1)
      db.all('SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC', [atividadeId], (err, encontrosAlvo) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }

        if (encontrosAlvo.length > 0) {
          const primeiroInicio = new Date(encontrosAlvo[0].inicio).getTime();
          const fechamento = primeiroInicio - 30 * 60 * 1000;
          const agora = new Date(currentClock).getTime();
          if (agora >= fechamento) {
            return res.status(422).json({ erro: 'INSCRICOES_ENCERRADAS', mensagem: 'InscriÃ§Ãµes encerradas' });
          }
        }

        // Check JA_INSCRITO (R3): active inscription in the same activity
        db.all('SELECT * FROM inscricoes WHERE participanteId = ?', [req.usuario.id], (err, todasInscricoes) => {
          if (err) {
            return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
          }

          const ativaNaMesma = todasInscricoes.find(i => i.atividadeId === atividadeId && ['confirmada', 'em_espera', 'convocada'].includes(i.status));
          if (ativaNaMesma) {
            return res.status(409).json({ erro: 'JA_INSCRITO', mensagem: 'Participante jÃ¡ inscrito nesta atividade' });
          }

          // Find active inscriptions occupying vaga (confirmada or convocada) in other activities
          const ocupandoVagaOutras = todasInscricoes.filter(i => ['confirmada', 'convocada'].includes(i.status) && i.atividadeId !== atividadeId);

          // Check minicursos limit (R5)
          if (atividade.tipo === 'minicurso' && ocupandoVagaOutras.length > 0) {
            const outrasAtvIds = [...new Set(ocupandoVagaOutras.map(i => i.atividadeId))];
            db.all(`SELECT * FROM atividades WHERE id IN (${outrasAtvIds.map(() => '?').join(',')})`, outrasAtvIds, (err, outrasAtividades) => {
              if (err) {
                return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
              }
              const minicursosOcupados = outrasAtividades.filter(a => a.tipo === 'minicurso').length;
              if (minicursosOcupados >= 3) {
                return res.status(422).json({ erro: 'LIMITE_DE_MINICURSOS', mensagem: 'Limite de minicursos atingido' });
              }
              proceedWithConflictsCheck();
            });
          } else {
            proceedWithConflictsCheck();
          }

          function proceedWithConflictsCheck() {
            if (ocupandoVagaOutras.length === 0 || encontrosAlvo.length === 0) {
              return proceedWithCreation();
            }

            const otherAtvIds = [...new Set(ocupandoVagaOutras.map(i => i.atividadeId))];
            db.all(`SELECT * FROM encontros WHERE atividadeId IN (${otherAtvIds.map(() => '?').join(',')})`, otherAtvIds, (err, encontrosOutros) => {
              if (err) {
                return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
              }

              // Check overlap: inicio1 < fim2 && inicio2 < fim1
              let hasConflict = false;
              for (const eAlvo of encontrosAlvo) {
                for (const eOutro of encontrosOutros) {
                  const inicio1 = new Date(eAlvo.inicio).getTime();
                  const fim1 = new Date(eAlvo.fim).getTime();
                  const inicio2 = new Date(eOutro.inicio).getTime();
                  const fim2 = new Date(eOutro.fim).getTime();
                  if (inicio1 < fim2 && inicio2 < fim1) {
                    hasConflict = true;
                    break;
                  }
                }
                if (hasConflict) break;
              }

              if (hasConflict) {
                return res.status(409).json({ erro: 'CONFLITO_DE_HORARIO', mensagem: 'Conflito de horÃ¡rio com outra atividade' });
              }

              proceedWithCreation();
            });
          }

          function proceedWithCreation() {
            db.all('SELECT * FROM inscricoes WHERE atividadeId = ?', [atividadeId], (err, inscricoesAtividade) => {
              if (err) {
                return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
              }

              const ocupadas = inscricoesAtividade.filter(i => i.status === 'confirmada' || i.status === 'convocada').length;
              const vagasRestantes = Math.max(0, atividade.vagas - ocupadas);
              const status = vagasRestantes > 0 ? 'confirmada' : 'em_espera';

              const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
              const id = `ins_${hex}`;
              const criadaEm = currentClock;

              db.run('INSERT INTO inscricoes (id, atividadeId, participanteId, status, criadaEm) VALUES (?, ?, ?, ?, ?)', [
                id, atividadeId, req.usuario.id, status, criadaEm
              ], (err) => {
                if (err) {
                  return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
                }

                if (status === 'em_espera') {
                  db.all("SELECT id FROM inscricoes WHERE atividadeId = ? AND status = 'em_espera' ORDER BY criadaEm ASC, rowid ASC", [atividadeId], (err, rows) => {
                    const idx = rows.findIndex(r => r.id === id);
                    const posicaoNaEspera = idx >= 0 ? idx + 1 : null;
                    res.status(201).json({
                      id,
                      atividadeId,
                      participanteId: req.usuario.id,
                      status,
                      posicaoNaEspera,
                      convocadaAte: null,
                      criadaEm
                    });
                  });
                } else {
                  res.status(201).json({
                    id,
                    atividadeId,
                    participanteId: req.usuario.id,
                    status,
                    posicaoNaEspera: null,
                    convocadaAte: null,
                    criadaEm
                  });
                }
              });
            });
          }
        });
      });
    });
  });

  function atualizarEventos(callback) {
    const agoraMs = new Date(currentClock).getTime();
    db.all("SELECT * FROM inscricoes WHERE status = 'convocada' AND convocadaAte IS NOT NULL", [], (err, rows) => {
      if (err || !rows || rows.length === 0) {
        if (callback) callback();
        return;
      }

      const expiredRows = rows.filter(r => agoraMs > new Date(r.convocadaAte).getTime());
      if (expiredRows.length === 0) {
        if (callback) callback();
        return;
      }

      expiredRows.sort((a, b) => new Date(a.convocadaAte).getTime() - new Date(b.convocadaAte).getTime());
      const rowToProcess = expiredRows[0];

      db.run("UPDATE inscricoes SET status = 'expirada' WHERE id = ?", [rowToProcess.id], (err) => {
        processarVagaLiberada(rowToProcess.atividadeId, rowToProcess.convocadaAte, () => {
          atualizarEventos(callback);
        });
      });
    });
  }

  function processarVagaLiberada(atividadeId, instanteLiberacao, callback) {
    db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atividade) => {
      if (err || !atividade) {
        if (callback) callback();
        return;
      }

      db.all('SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC', [atividadeId], (err, encontros) => {
        if (!encontros || encontros.length === 0) {
          if (callback) callback();
          return;
        }

        const primeiroInicio = new Date(encontros[0].inicio).getTime();
        const fechamento = primeiroInicio - 30 * 60 * 1000;
        const agoraMs = new Date(currentClock).getTime();

        if (agoraMs >= fechamento) {
          if (callback) callback();
          return;
        }

        db.all('SELECT * FROM inscricoes WHERE atividadeId = ?', [atividadeId], (err, inscricoes) => {
          if (err) {
            if (callback) callback();
            return;
          }
          const ocupadas = inscricoes.filter(i => i.status === 'confirmada' || i.status === 'convocada').length;
          const vagasRestantes = Math.max(0, atividade.vagas - ocupadas);

          if (vagasRestantes <= 0) {
            if (callback) callback();
            return;
          }

          db.all("SELECT * FROM inscricoes WHERE atividadeId = ? AND status = 'em_espera' ORDER BY criadaEm ASC LIMIT 1", [atividadeId], (err, rows) => {
            if (err || !rows || rows.length === 0) {
              if (callback) callback();
              return;
            }

            const proximo = rows[0];
            const convocadaAtMs = agoraMs;
            const doisHorasMs = convocadaAtMs + 2 * 60 * 60 * 1000;
            const convocadaAteMs = Math.min(doisHorasMs, fechamento);
            const convocadaAte = new Date(convocadaAteMs).toISOString();

            db.run("UPDATE inscricoes SET status = 'convocada', convocadaAte = ? WHERE id = ?", [convocadaAte, proximo.id], (err) => {
              if (callback) callback();
            });
          });
        });
      });
    });
  }

  // GET /atividades/:id
  app.get('/atividades/:id', (req, res) => {
    atualizarEventos(() => {
      const atividadeId = req.params.id;
      db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atividade) => {
        if (err || !atividade) {
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade nÃ£o encontrada' });
        }

        db.all('SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC', [atividadeId], (err, encontros) => {
          db.all('SELECT * FROM inscricoes WHERE atividadeId = ?', [atividadeId], (err, inscricoes) => {
            if (err) {
              return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
            }

            const ocupadas = inscricoes.filter(i => i.status === 'confirmada' || i.status === 'convocada').length;
            const vagasRestantes = Math.max(0, atividade.vagas - ocupadas);
            const emEspera = inscricoes.filter(i => i.status === 'em_espera').length;

            let cargaHorariaMinutos = 0;
            for (const enc of encontros) {
              const inicioMs = new Date(enc.inicio).getTime();
              const fimMs = new Date(enc.fim).getTime();
              cargaHorariaMinutos += Math.max(0, Math.floor((fimMs - inicioMs) / 60000));
            }

            res.json({
              id: atividade.id,
              titulo: atividade.titulo,
              tipo: atividade.tipo,
              salaId: atividade.salaId,
              vagas: atividade.vagas,
              encontros: encontros.map(e => ({ id: e.id, inicio: e.inicio, fim: e.fim })),
              cargaHorariaMinutos,
              situacao: atividade.situacao || 'prevista',
              ocupadas,
              vagasRestantes,
              emEspera
            });
          });
        });
      });
    });
  });

  // GET /inscricoes
  app.get('/inscricoes', (req, res) => {
    atualizarEventos(() => {
      const { atividadeId } = req.query;
      let query = 'SELECT * FROM inscricoes';
      let params = [];
      let conditions = [];

      if (req.usuario.papel === 'participante') {
        conditions.push('participanteId = ?');
        params.push(req.usuario.id);
      }

      if (atividadeId) {
        conditions.push('atividadeId = ?');
        params.push(atividadeId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }

        const atvIds = [...new Set(rows.map(r => r.atividadeId))];
        if (atvIds.length === 0) {
          return res.json([]);
        }

        db.all(`SELECT id, atividadeId, status, criadaEm, rowid FROM inscricoes WHERE atividadeId IN (${atvIds.map(() => '?').join(',')}) AND status = 'em_espera' ORDER BY criadaEm ASC, rowid ASC`, atvIds, (err, esperaRows) => {
          if (err) {
            return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
          }

          const mapPos = new Map();
          const porAtividade = {};
          for (const r of esperaRows) {
            if (!porAtividade[r.atividadeId]) porAtividade[r.atividadeId] = [];
            porAtividade[r.atividadeId].push(r.id);
          }

          for (const [atvId, ids] of Object.entries(porAtividade)) {
            ids.forEach((id, index) => {
              mapPos.set(id, index + 1);
            });
          }

          const result = rows.map(r => ({
            id: r.id,
            atividadeId: r.atividadeId,
            participanteId: r.participanteId,
            status: r.status,
            posicaoNaEspera: r.status === 'em_espera' ? (mapPos.get(r.id) || null) : null,
            convocadaAte: r.convocadaAte || null,
            criadaEm: r.criadaEm
          }));

          res.json(result);
        });
      });
    });
  });

  // GET /inscricoes/:id
  app.get('/inscricoes/:id', (req, res) => {
    atualizarEventos(() => {
      const inscricaoId = req.params.id;
      db.get('SELECT * FROM inscricoes WHERE id = ?', [inscricaoId], (err, inscricao) => {
        if (err || !inscricao) {
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'InscriÃ§Ã£o nÃ£o encontrada' });
        }

        if (req.usuario.papel === 'participante' && inscricao.participanteId !== req.usuario.id) {
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'InscriÃ§Ã£o nÃ£o encontrada' });
        }

        if (inscricao.status === 'em_espera') {
          db.all("SELECT id FROM inscricoes WHERE atividadeId = ? AND status = 'em_espera' ORDER BY criadaEm ASC, rowid ASC", [inscricao.atividadeId], (err, rows) => {
            const idx = rows.findIndex(r => r.id === inscricao.id);
            const posicaoNaEspera = idx >= 0 ? idx + 1 : null;
            res.json({
              id: inscricao.id,
              atividadeId: inscricao.atividadeId,
              participanteId: inscricao.participanteId,
              status: inscricao.status,
              posicaoNaEspera,
              convocadaAte: inscricao.convocadaAte || null,
              criadaEm: inscricao.criadaEm
            });
          });
        } else {
          res.json({
            id: inscricao.id,
            atividadeId: inscricao.atividadeId,
            participanteId: inscricao.participanteId,
            status: inscricao.status,
            posicaoNaEspera: null,
            convocadaAte: inscricao.convocadaAte || null,
            criadaEm: inscricao.criadaEm
          });
        }
      });
    });
  });

  // POST /inscricoes/:id/confirmacao
  app.post('/inscricoes/:id/confirmacao', (req, res) => {
    if (req.usuario.papel !== 'participante') {
      return res.status(403).json({ erro: 'SOMENTE_PARTICIPANTE', mensagem: 'Apenas participante' });
    }

    atualizarEventos(() => {
      const inscricaoId = req.params.id;
      db.get('SELECT * FROM inscricoes WHERE id = ?', [inscricaoId], (err, inscricao) => {
        if (err || !inscricao || inscricao.participanteId !== req.usuario.id) {
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'InscriÃ§Ã£o nÃ£o encontrada' });
        }

        if (['em_espera', 'confirmada', 'cancelada'].includes(inscricao.status)) {
          return res.status(422).json({ erro: 'SEM_CONVOCACAO', mensagem: 'InscriÃ§Ã£o sem convocaÃ§Ã£o ativa' });
        }

        if (inscricao.status === 'expirada') {
          return res.status(422).json({ erro: 'CONVOCACAO_EXPIRADA', mensagem: 'ConvocaÃ§Ã£o expirada' });
        }

        db.get('SELECT * FROM atividades WHERE id = ?', [inscricao.atividadeId], (err, atividade) => {
          if (err || !atividade) {
            return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade nÃ£o encontrada' });
          }

          db.all('SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC', [inscricao.atividadeId], (err, encontrosAlvo) => {
            db.all('SELECT * FROM inscricoes WHERE participanteId = ?', [req.usuario.id], (err, todasInscricoes) => {
              const ocupandoVagaOutras = todasInscricoes.filter(i => ['confirmada', 'convocada'].includes(i.status) && i.atividadeId !== inscricao.atividadeId);

              function checkMinicursos() {
                if (atividade.tipo === 'minicurso' && ocupandoVagaOutras.length > 0) {
                  const outrasAtvIds = [...new Set(ocupandoVagaOutras.map(i => i.atividadeId))];
                  db.all(`SELECT * FROM atividades WHERE id IN (${outrasAtvIds.map(() => '?').join(',')})`, outrasAtvIds, (err, outrasAtividades) => {
                    const minicursosOcupados = outrasAtividades.filter(a => a.tipo === 'minicurso').length;
                    if (minicursosOcupados >= 3) {
                      return res.status(422).json({ erro: 'LIMITE_DE_MINICURSOS', mensagem: 'Limite de minicursos atingido' });
                    }
                    checkConflitos();
                  });
                } else {
                  checkConflitos();
                }
              }

              function checkConflitos() {
                if (ocupandoVagaOutras.length === 0 || encontrosAlvo.length === 0) {
                  return performConfirmation();
                }

                const otherAtvIds = [...new Set(ocupandoVagaOutras.map(i => i.atividadeId))];
                db.all(`SELECT * FROM encontros WHERE atividadeId IN (${otherAtvIds.map(() => '?').join(',')})`, otherAtvIds, (err, encontrosOutros) => {
                  let hasConflict = false;
                  for (const eAlvo of encontrosAlvo) {
                    for (const eOutro of encontrosOutros) {
                      const inicio1 = new Date(eAlvo.inicio).getTime();
                      const fim1 = new Date(eAlvo.fim).getTime();
                      const inicio2 = new Date(eOutro.inicio).getTime();
                      const fim2 = new Date(eOutro.fim).getTime();
                      if (inicio1 < fim2 && inicio2 < fim1) {
                        hasConflict = true;
                        break;
                      }
                    }
                    if (hasConflict) break;
                  }

                  if (hasConflict) {
                    return res.status(409).json({ erro: 'CONFLITO_DE_HORARIO', mensagem: 'Conflito de horÃ¡rio com outra atividade' });
                  }

                  performConfirmation();
                });
              }

              function performConfirmation() {
                db.run("UPDATE inscricoes SET status = 'confirmada' WHERE id = ?", [inscricao.id], (err) => {
                  if (err) {
                    return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
                  }
                  res.json({
                    id: inscricao.id,
                    atividadeId: inscricao.atividadeId,
                    participanteId: inscricao.participanteId,
                    status: 'confirmada',
                    posicaoNaEspera: null,
                    convocadaAte: inscricao.convocadaAte || null,
                    criadaEm: inscricao.criadaEm
                  });
                });
              }

              checkMinicursos();
            });
          });
        });
      });
    });
  });

  // POST /inscricoes/:id/cancelamento
  app.post('/inscricoes/:id/cancelamento', (req, res) => {
    if (req.usuario.papel !== 'participante') {
      return res.status(403).json({ erro: 'SOMENTE_PARTICIPANTE', mensagem: 'Apenas participante' });
    }

    const inscricaoId = req.params.id;
    db.get('SELECT * FROM inscricoes WHERE id = ?', [inscricaoId], (err, inscricao) => {
      if (err || !inscricao || inscricao.participanteId !== req.usuario.id) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'InscriÃ§Ã£o nÃ£o encontrada' });
      }

      if (['cancelada', 'expirada'].includes(inscricao.status)) {
        return res.status(422).json({ erro: 'INSCRICAO_INATIVA', mensagem: 'InscriÃ§Ã£o inativa' });
      }

      db.all('SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC', [inscricao.atividadeId], (err, encontros) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }

        if (encontros.length > 0) {
          const primeiroInicio = new Date(encontros[0].inicio).getTime();
          const agora = new Date(currentClock).getTime();
          if (agora >= primeiroInicio) {
            return res.status(422).json({ erro: 'ATIVIDADE_JA_INICIADA', mensagem: 'Atividade jÃ¡ iniciada' });
          }
        }

        db.run("UPDATE inscricoes SET status = 'cancelada' WHERE id = ?", [inscricaoId], (err) => {
          if (err) {
            return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
          }

          processarVagaLiberada(inscricao.atividadeId, currentClock, () => {
            res.json({
              id: inscricao.id,
              atividadeId: inscricao.atividadeId,
              participanteId: inscricao.participanteId,
              status: 'cancelada',
              posicaoNaEspera: null,
              convocadaAte: inscricao.convocadaAte || null,
              criadaEm: inscricao.criadaEm
            });
          });
        });
      });
    });
  });
  // POST /atividades
  app.post('/atividades', (req, res) => {
    const { titulo, tipo, salaId, vagas, encontros } = req.body || {};
    const id = `atv_${Date.now().toString(36)}`;
    const novaAtividade = { id, titulo, tipo, salaId, vagas, encontros, cargaHorariaMinutos: 0, situacao: 'prevista', ocupadas: 0, vagasRestantes: vagas, emEspera: 0 };
    db.run('INSERT INTO atividades (id, titulo, tipo, salaId, vagas) VALUES (?, ?, ?, ?, ?)', [id, titulo, tipo, salaId, vagas], function(err) {
      if (err) return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: err.message });
      res.status(201).json(novaAtividade);
    });
  });

  // PATCH /atividades/:id
  app.patch('/atividades/:id', (req, res) => {
    const { titulo, tipo, salaId, vagas } = req.body || {};
    db.get('SELECT * FROM atividades WHERE id = ?', [req.params.id], (err, row) => {
      if (err || !row) return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade nÃ£o encontrada' });
      db.run('UPDATE atividades SET titulo = COALESCE(?, titulo), tipo = COALESCE(?, tipo), salaId = COALESCE(?, salaId), vagas = COALESCE(?, vagas) WHERE id = ?', [titulo, tipo, salaId, vagas, req.params.id], function(err) {
        if (err) return res.status(422).json({ erro: 'DADOS_INVALIDOS', mensagem: err.message });
        db.get('SELECT * FROM atividades WHERE id = ?', [req.params.id], (err, updated) => {
          res.json(updated);
        });
      });
    });
  });

  // GET /encontros/:id/codigo
  app.get('/encontros/:id/codigo', (req, res) => {
    if (req.usuario.papel !== 'organizacao') {
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organizaÃ§Ã£o' });
    }

    const encontroId = req.params.id;
    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro nÃ£o encontrado' });
      }

      const agoraDate = new Date(currentClock);
      const inicioDate = new Date(encontro.inicio);

      // Window: 15 min before start to 30 min after start
      const inicioJanela = new Date(inicioDate.getTime() - 15 * 60 * 1000);
      const fimJanela = new Date(inicioDate.getTime() + 30 * 60 * 1000);

      if (agoraDate < inicioJanela || agoraDate > fimJanela) {
        return res.status(422).json({ erro: 'FORA_DA_JANELA', mensagem: 'Fora da janela de registro' });
      }

      const minutoAtual = new Date(agoraDate);
      minutoAtual.setSeconds(0, 0);
      const minutoStr = minutoAtual.toISOString();

      db.get('SELECT codigo FROM codigos_gerados WHERE encontroId = ? AND minuto = ?', [encontroId, minutoStr], (err, row) => {
        if (row) {
          const proximoMinuto = new Date(minutoAtual.getTime() + 60 * 1000);
          const doisMinutosDepois = new Date(proximoMinuto.getTime() + 60 * 1000);
          return res.json({
            encontroId: encontro.id,
            codigo: row.codigo,
            trocaEm: proximoMinuto.toISOString(),
            validoAte: doisMinutosDepois.toISOString()
          });
        }

        // Generate 6-char code using restricted alphabet
        const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let codigo = '';
        for (let i = 0; i < 6; i++) {
          codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
        }

        db.run('INSERT INTO codigos_gerados (encontroId, codigo, minuto) VALUES (?, ?, ?)', [encontroId, codigo, minutoStr], () => {
          // trocaEm and validoAte
          const proximoMinuto = new Date(minutoAtual.getTime() + 60 * 1000);
          const doisMinutosDepois = new Date(proximoMinuto.getTime() + 60 * 1000);

          res.json({
            encontroId: encontro.id,
            codigo,
            trocaEm: proximoMinuto.toISOString(),
            validoAte: doisMinutosDepois.toISOString()
          });
        });
      });
    });
  });

  // POST /encontros/:id/presencas
  app.post('/encontros/:id/presencas', (req, res) => {
    if (req.usuario.papel !== 'participante') {
      return res.status(403).json({ erro: 'SOMENTE_PARTICIPANTE', mensagem: 'Apenas participante' });
    }

    const encontroId = req.params.id;
    const { codigo, lidoEm } = req.body || {};

    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro nÃ£o encontrado' });
      }

      const agoraDate = new Date(currentClock);
      const inicioDate = new Date(encontro.inicio);
      const inicioJanela = new Date(inicioDate.getTime() - 15 * 60 * 1000);
      const fimJanela = new Date(inicioDate.getTime() + 30 * 60 * 1000);

      if (lidoEm) {
        const fimEncontro = new Date(encontro.fim);
        const limiteSincronizacao = new Date(fimEncontro.getTime() + 2 * 60 * 60 * 1000);
        if (agoraDate > limiteSincronizacao) {
          return res.status(422).json({ erro: 'SINCRONIZACAO_TARDIA', mensagem: 'SincronizaÃ§Ã£o tardia' });
        }

        const lidoEmDate = new Date(lidoEm);
        if (lidoEmDate < inicioJanela || lidoEmDate > fimJanela) {
          return res.status(422).json({ erro: 'FORA_DA_JANELA', mensagem: 'Fora da janela de registro' });
        }
      } else {
        if (agoraDate < inicioJanela || agoraDate > fimJanela) {
          return res.status(422).json({ erro: 'FORA_DA_JANELA', mensagem: 'Fora da janela de registro' });
        }
      }

      // Check inscription (R9)
      db.get('SELECT * FROM inscricoes WHERE atividadeId = ? AND participanteId = ? AND status = ?', [encontro.atividadeId, req.usuario.id, 'confirmada'], (err, inscricao) => {
        if (err || !inscricao) {
          return res.status(403).json({ erro: 'NAO_INSCRITO', mensagem: 'Participante nÃ£o inscrito' });
        }

        // Check code validity (R5, R6)
        const refDate = lidoEm ? new Date(lidoEm) : agoraDate;
        const minutoAtualDate = new Date(refDate);
        minutoAtualDate.setSeconds(0, 0);
        const minutoAtualStr = minutoAtualDate.toISOString();
        const minutoAnteriorDate = new Date(minutoAtualDate.getTime() - 60 * 1000);
        const minutoAnteriorStr = minutoAnteriorDate.toISOString();

        db.get('SELECT * FROM codigos_gerados WHERE encontroId = ? AND codigo = ? AND (minuto = ? OR minuto = ?)', [encontroId, codigo, minutoAtualStr, minutoAnteriorStr], (err, codigoRow) => {
          if (err || !codigoRow) {
            return res.status(422).json({ erro: 'CODIGO_INVALIDO', mensagem: 'CÃ³digo invÃ¡lido' });
          }

          // Idempotency (R10): check if presence already exists
          db.get('SELECT * FROM presencas WHERE encontroId = ? AND participanteId = ?', [encontroId, req.usuario.id], (err, presencaExistente) => {
            if (presencaExistente) {
              return res.status(200).json({
                id: presencaExistente.id,
                encontroId: presencaExistente.encontroId,
                participanteId: presencaExistente.participanteId,
                origem: presencaExistente.origem,
                lidoEm: presencaExistente.lidoEm,
                registradaEm: presencaExistente.registradaEm,
                justificativa: presencaExistente.justificativa
              });
            }

            const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
            const presencaId = `pre_${hex}`;
            const lidoEmVal = lidoEm ? lidoEm : agoraDate.toISOString();
            const registradaEm = agoraDate.toISOString();
            const origem = lidoEm ? 'qr_offline' : 'qr';

            db.run('INSERT INTO presencas (id, encontroId, participanteId, origem, lidoEm, registradaEm, justificativa) VALUES (?, ?, ?, ?, ?, ?, ?)', [
              presencaId, encontroId, req.usuario.id, origem, lidoEmVal, registradaEm, null
            ], (err) => {
              if (err) {
                return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
              }
              res.status(201).json({
                id: presencaId,
                encontroId,
                participanteId: req.usuario.id,
                origem,
                lidoEm: lidoEmVal,
                registradaEm,
                justificativa: null
              });
            });
          });
        });
      });
    });
  });

  // GET /encontros/:id/presencas
  app.get('/encontros/:id/presencas', (req, res) => {
    if (req.usuario.papel !== 'organizacao') {
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organizaÃ§Ã£o' });
    }

    const encontroId = req.params.id;
    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro nÃ£o encontrado' });
      }

      db.all('SELECT * FROM presencas WHERE encontroId = ?', [encontroId], (err, rows) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }
        const presencas = rows.map(r => ({
          id: r.id,
          encontroId: r.encontroId,
          participanteId: r.participanteId,
          origem: r.origem,
          lidoEm: r.lidoEm,
          registradaEm: r.registradaEm,
          justificativa: r.justificativa
        }));
        res.json(presencas);
      });
    });
  });

  // POST /encontros/:id/presencas/manual
  app.post('/encontros/:id/presencas/manual', (req, res) => {
    if (req.usuario.papel !== 'organizacao') {
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organizaÃ§Ã£o' });
    }

    const encontroId = req.params.id;
    const { participanteId, justificativa } = req.body || {};

    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro nÃ£o encontrado' });
      }

      const agoraDate = new Date(currentClock);
      const inicioDate = new Date(encontro.inicio);
      const fimDate = new Date(encontro.fim);
      const inicioJanela = new Date(inicioDate.getTime() - 15 * 60 * 1000);
      const fimJanela = new Date(fimDate.getTime() + 2 * 60 * 60 * 1000);

      if (agoraDate < inicioJanela || agoraDate > fimJanela) {
        return res.status(422).json({ erro: 'FORA_DA_JANELA', mensagem: 'Fora da janela de presenÃ§a manual' });
      }

      if (!justificativa || typeof justificativa !== 'string' || justificativa.trim().length < 10) {
        return res.status(422).json({ erro: 'JUSTIFICATIVA_OBRIGATORIA', mensagem: 'Justificativa obrigatÃ³ria (mÃ­nimo 10 caracteres)' });
      }

      db.get('SELECT * FROM inscricoes WHERE atividadeId = ? AND participanteId = ? AND status = ?', [encontro.atividadeId, participanteId, 'confirmada'], (err, inscricao) => {
        if (err || !inscricao) {
          return res.status(403).json({ erro: 'NAO_INSCRITO', mensagem: 'Participante nÃ£o inscrito' });
        }

        db.get('SELECT * FROM presencas WHERE encontroId = ? AND participanteId = ?', [encontroId, participanteId], (err, presencaExistente) => {
          if (presencaExistente) {
            return res.status(200).json({
              id: presencaExistente.id,
              encontroId: presencaExistente.encontroId,
              participanteId: presencaExistente.participanteId,
              origem: presencaExistente.origem,
              lidoEm: presencaExistente.lidoEm,
              registradaEm: presencaExistente.registradaEm,
              justificativa: presencaExistente.justificativa
            });
          }

          const hex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
          const presencaId = `pre_${hex}`;
          const registradaEm = agoraDate.toISOString();
          const origem = 'manual';
          const lidoEmVal = null;

          db.run('INSERT INTO presencas (id, encontroId, participanteId, origem, lidoEm, registradaEm, justificativa) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            presencaId, encontroId, participanteId, origem, lidoEmVal, registradaEm, justificativa
          ], (err) => {
            if (err) {
              return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
            }
            res.status(201).json({
              id: presencaId,
              encontroId,
              participanteId,
              origem,
              lidoEm: lidoEmVal,
              registradaEm,
              justificativa
            });
          });
        });
      });
    });
  });

  // M4 - POST /atividades/:id/certificado
  app.post('/atividades/:id/certificado', (req, res) => {
    const atividadeId = req.params.id;
    const usuarioId = req.headers['x-usuario'];

    if (!usuarioId) {
      return res.status(401).json({
        erro: 'USUARIO_DESCONHECIDO',
        mensagem: 'Usuario nao informado'
      });
    }

    db.get('SELECT * FROM usuarios WHERE id = ?', [usuarioId], (err, usuario) => {
      if (err) {
        return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
      }

      if (!usuario) {
        return res.status(401).json({
          erro: 'USUARIO_DESCONHECIDO',
          mensagem: 'Usuario desconhecido'
        });
      }

      if (usuario.papel !== 'participante') {
        return res.status(403).json({
          erro: 'SOMENTE_PARTICIPANTE',
          mensagem: 'Apenas participante'
        });
      }

      db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atividade) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }

        if (!atividade) {
          return res.status(404).json({
            erro: 'NAO_ENCONTRADO',
            mensagem: 'Atividade nao encontrada'
          });
        }

        if (atividade.situacao === 'cancelada') {
          return res.status(422).json({
            erro: 'ATIVIDADE_CANCELADA',
            mensagem: 'Atividade cancelada'
          });
        }

        db.get(
          "SELECT * FROM inscricoes WHERE atividadeId = ? AND participanteId = ? AND status = 'confirmada'",
          [atividadeId, usuarioId],
          (err, inscricao) => {
            if (err) {
              return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
            }

            if (!inscricao) {
              return res.status(403).json({
                erro: 'NAO_INSCRITO',
                mensagem: 'Participante nao inscrito'
              });
            }

           db.all(
  'SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC',
  [atividadeId],
  (err, encontros) => {
    if (err) {
      return res.status(500).json({
        erro: 'ERRO_INTERNO',
        mensagem: err.message
      });
    }

    if (!encontros || encontros.length === 0) {
      return res.status(422).json({
        erro: 'ATIVIDADE_NAO_ENCERRADA',
        mensagem: 'Atividade ainda nao encerrada'
      });
    }

    const ultimoEncontro = encontros[encontros.length - 1];
    const agoraMs = new Date(currentClock).getTime();
    const fimMs = new Date(ultimoEncontro.fim).getTime();

    if (agoraMs <= fimMs) {
      return res.status(422).json({
        erro: 'ATIVIDADE_NAO_ENCERRADA',
        mensagem: 'Atividade ainda nao encerrada'
      });
    }

    db.get(
  `SELECT COUNT(DISTINCT p.encontroId) AS total
   FROM presencas p
   INNER JOIN encontros e ON e.id = p.encontroId
   WHERE e.atividadeId = ? AND p.participanteId = ?`,
  [atividadeId, usuarioId],
  (err, row) => {
    if (err) {
      return res.status(500).json({
        erro: 'ERRO_INTERNO',
        mensagem: err.message
      });
    }

    const presencas = row?.total || 0;
    const totalEncontros = encontros.length;

    if (presencas * 4 < totalEncontros * 3) {
      return res.status(422).json({
        erro: 'PRESENCA_INSUFICIENTE',
        mensagem: 'Presenca insuficiente'
      });
    }

    db.get(
  'SELECT * FROM certificados WHERE atividadeId = ? AND participanteId = ?',
  [atividadeId, usuarioId],
  (err, certificadoExistente) => {
    if (err) {
      return res.status(500).json({
        erro: 'ERRO_INTERNO',
        mensagem: err.message
      });
    }

    if (certificadoExistente) {
      return res.status(200).json(certificadoExistente);
    }

    let cargaHorariaMinutos = 0;

    for (const encontro of encontros) {
      const inicio = new Date(encontro.inicio).getTime();
      const fim = new Date(encontro.fim).getTime();
      cargaHorariaMinutos += Math.floor((fim - inicio) / 60000);
    }

    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    function gerarParte() {
      let parte = '';

      for (let i = 0; i < 4; i++) {
        parte += alfabeto[Math.floor(Math.random() * alfabeto.length)];
      }

      return parte;
    }

    const codigo = `SA26-${gerarParte()}-${gerarParte()}`;
    const emitidoEm = currentClock;

    db.run(
      `INSERT INTO certificados
       (codigo, atividadeId, participanteId, cargaHorariaMinutos, presencas, encontros, emitidoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        atividadeId,
        usuarioId,
        cargaHorariaMinutos,
        presencas,
        totalEncontros,
        emitidoEm
      ],
      (err) => {
        if (err) {
          return res.status(500).json({
            erro: 'ERRO_INTERNO',
            mensagem: err.message
          });
        }

        return res.status(201).json({
          codigo,
          atividadeId,
          participanteId: usuarioId,
          cargaHorariaMinutos,
          presencas,
          encontros: totalEncontros,
          emitidoEm
        });
      }
    );
  }
);
  }
);
  }
);
          }
        );
      });
    });
  });

  // M4 - GET /certificados
  app.get('/certificados', (req, res) => {
    if (!req.usuario || req.usuario.papel !== 'participante') {
      return res.status(403).json({
        erro: 'SOMENTE_PARTICIPANTE',
        mensagem: 'Apenas participante'
      });
    }

    db.all(
      `SELECT
         codigo,
         atividadeId,
         participanteId,
         cargaHorariaMinutos,
         presencas,
         encontros,
         emitidoEm
       FROM certificados
       WHERE participanteId = ?
       ORDER BY emitidoEm ASC, codigo ASC`,
      [req.usuario.id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({
            erro: 'ERRO_INTERNO',
            mensagem: err.message
          });
        }

        return res.json(rows);
      }
    );
  });

  function abreviarNome(nome) {
    const partes = String(nome || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (partes.length === 0) {
      return '';
    }

    const particulas = new Set(['de', 'da', 'do', 'das', 'dos']);

    return partes
      .map((parte, index) => {
        if (index === 0) {
          return parte;
        }

        const minusculo = parte.toLowerCase();

        if (particulas.has(minusculo)) {
          return minusculo;
        }

        return `${parte.charAt(0).toUpperCase()}.`;
      })
      .join(' ');
  }

  // M4 - GET /certificados/:codigo
  // Publico: nao exige X-Usuario
  app.get('/certificados/:codigo', (req, res) => {
    const codigo = String(req.params.codigo || '').toUpperCase();

    db.get(
      `SELECT
         c.codigo,
         c.cargaHorariaMinutos,
         c.emitidoEm,
         u.nome AS participanteNome,
         a.titulo AS atividadeTitulo
       FROM certificados c
       INNER JOIN usuarios u
         ON u.id = c.participanteId
       INNER JOIN atividades a
         ON a.id = c.atividadeId
       WHERE UPPER(c.codigo) = UPPER(?)`,
      [codigo],
      (err, certificado) => {
        if (err) {
          return res.status(500).json({
            erro: 'ERRO_INTERNO',
            mensagem: err.message
          });
        }

        if (!certificado) {
          return res.status(404).json({
            erro: 'NAO_ENCONTRADO',
            mensagem: 'Certificado nao encontrado'
          });
        }

        return res.json({
          codigo: certificado.codigo,
          participante: abreviarNome(certificado.participanteNome),
          atividade: certificado.atividadeTitulo,
          cargaHorariaMinutos: certificado.cargaHorariaMinutos,
          emitidoEm: certificado.emitidoEm
        });
      }
    );
  });

  // M4 - GET /extrato
  app.get('/extrato', (req, res) => {
    if (!req.usuario || req.usuario.papel !== 'participante') {
      return res.status(403).json({
        erro: 'SOMENTE_PARTICIPANTE',
        mensagem: 'Apenas participante'
      });
    }

    const participanteId = req.usuario.id;

    db.all(
      `SELECT
         a.id AS atividadeId,
         a.titulo,
         a.tipo,
         c.codigo,
         i.criadaEm
       FROM inscricoes i
       INNER JOIN atividades a
         ON a.id = i.atividadeId
       LEFT JOIN certificados c
         ON c.atividadeId = a.id
        AND c.participanteId = i.participanteId
       WHERE i.participanteId = ?
         AND i.status = 'confirmada'
         AND COALESCE(a.situacao, 'prevista') <> 'cancelada'
       ORDER BY i.criadaEm ASC, a.id ASC`,
      [participanteId],
      (err, atividades) => {
        if (err) {
          return res.status(500).json({
            erro: 'ERRO_INTERNO',
            mensagem: err.message
          });
        }

        const atividadesUnicas = Array.from(
          new Map(
            atividades.map((atividade) => [
              atividade.atividadeId,
              atividade
            ])
          ).values()
        );

        if (atividadesUnicas.length === 0) {
          return res.json({
            itens: [],
            palestrasMinutos: 0,
            minicursosMinutos: 0,
            totalMinutos: 0,
            aproveitadoMinutos: 0
          });
        }

        const atividadeIds = atividadesUnicas.map(
          (atividade) => atividade.atividadeId
        );

        const placeholders = atividadeIds.map(() => '?').join(',');

        db.all(
          `SELECT *
           FROM encontros
           WHERE atividadeId IN (${placeholders})
           ORDER BY inicio ASC`,
          atividadeIds,
          (err, encontros) => {
            if (err) {
              return res.status(500).json({
                erro: 'ERRO_INTERNO',
                mensagem: err.message
              });
            }

            db.all(
              `SELECT
                 e.atividadeId,
                 p.encontroId
               FROM presencas p
               INNER JOIN encontros e
                 ON e.id = p.encontroId
               WHERE p.participanteId = ?
                 AND e.atividadeId IN (${placeholders})`,
              [participanteId, ...atividadeIds],
              (err, presencasRows) => {
                if (err) {
                  return res.status(500).json({
                    erro: 'ERRO_INTERNO',
                    mensagem: err.message
                  });
                }

                const agoraMs = new Date(currentClock).getTime();

                const presencasPorAtividade = new Map();

                for (const presenca of presencasRows) {
                  if (!presencasPorAtividade.has(presenca.atividadeId)) {
                    presencasPorAtividade.set(
                      presenca.atividadeId,
                      new Set()
                    );
                  }

                  presencasPorAtividade
                    .get(presenca.atividadeId)
                    .add(presenca.encontroId);
                }

                const itens = [];

                for (const atividade of atividadesUnicas) {
                  const encontrosAtividade = encontros.filter(
                    (encontro) =>
                      encontro.atividadeId === atividade.atividadeId
                  );

                  if (encontrosAtividade.length === 0) {
                    continue;
                  }

                  const ultimoFimMs = Math.max(
                    ...encontrosAtividade.map((encontro) =>
                      new Date(encontro.fim).getTime()
                    )
                  );

                  if (agoraMs <= ultimoFimMs) {
                    continue;
                  }

                  const totalPresencas =
                    presencasPorAtividade.get(atividade.atividadeId)?.size || 0;

                  if (
                    totalPresencas * 4 <
                    encontrosAtividade.length * 3
                  ) {
                    continue;
                  }

                  let cargaHorariaMinutos = 0;

                  for (const encontro of encontrosAtividade) {
                    const inicioMs = new Date(encontro.inicio).getTime();
                    const fimMs = new Date(encontro.fim).getTime();

                    cargaHorariaMinutos += Math.max(
                      0,
                      Math.floor((fimMs - inicioMs) / 60000)
                    );
                  }

                  itens.push({
                    atividadeId: atividade.atividadeId,
                    titulo: atividade.titulo,
                    tipo: atividade.tipo,
                    cargaHorariaMinutos,
                    codigo: atividade.codigo || null
                  });
                }

                const palestrasMinutos = itens
                  .filter((item) => item.tipo === 'palestra')
                  .reduce(
                    (total, item) =>
                      total + item.cargaHorariaMinutos,
                    0
                  );

                const minicursosMinutos = itens
                  .filter((item) => item.tipo === 'minicurso')
                  .reduce(
                    (total, item) =>
                      total + item.cargaHorariaMinutos,
                    0
                  );

                const totalMinutos =
                  palestrasMinutos + minicursosMinutos;

                const palestrasAproveitadas = Math.min(
                  palestrasMinutos,
                  240
                );

                const aproveitadoMinutos = Math.min(
                  1200,
                  palestrasAproveitadas + minicursosMinutos
                );

                return res.json({
                  itens,
                  palestrasMinutos,
                  minicursosMinutos,
                  totalMinutos,
                  aproveitadoMinutos
                });
              }
            );
          }
        );
      }
    );
  });
  return new Promise((resolve) => {
    const port = options.porta !== undefined ? options.porta : 3000;
    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      resolve({
        porta: actualPort,
        fechar: () => new Promise((res) => server.close(res))
      });
    });
  });
}


