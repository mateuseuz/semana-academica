import express from 'express';
import sqlite3 from 'sqlite3';

export function criarServidor(options = {}) {
  const app = express();
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

      // Seed initial users
      const users = [
        ['org-ana', 'Ana Beatriz Lima', 'organizacao'],
        ['org-bruno', 'Bruno Tavares', 'organizacao'],
        ['p-carla', 'Carla Mendes Souza', 'participante'],
        ['p-diego', 'Diego Alves', 'participante'],
        ['p-elisa', 'Elisa Fernandes da Rocha', 'participante'],
        ['p-fabio', 'Fábio Nogueira', 'participante'],
        ['p-gabriela', 'Gabriela Moura Castro', 'participante'],
        ['p-heitor', 'Heitor Campos', 'participante'],
        ['p-isadora', 'Isadora Ribeiro dos Santos', 'participante'],
        ['p-joao', 'João Pedro Martins', 'participante']
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
    const { vagas } = req.body || {};
    if (vagas !== undefined) {
      db.run('UPDATE atividades SET vagas = ? WHERE id = ?', [vagas, req.params.id], () => {
        processarVagaLiberada(req.params.id, currentClock, () => {
          res.status(204).send();
        });
      });
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

  // Auth middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/_teste/') || req.path.startsWith('/certificados/')) {
      return next();
    }
    const usuarioId = req.headers['x-usuario'];
    if (!usuarioId) {
      return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'Usuário não informado' });
    }
    db.get('SELECT * FROM usuarios WHERE id = ?', [usuarioId], (err, row) => {
      if (err || !row) {
        return res.status(401).json({ erro: 'USUARIO_DESCONHECIDO', mensagem: 'Usuário desconhecido' });
      }
      req.usuario = row;
      next();
    });
  });

  // POST /atividades/:id/cancelamento
  app.post('/atividades/:id/cancelamento', (req, res) => {
    if (req.usuario.papel !== 'organizacao') {
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organização' });
    }

    const atividadeId = req.params.id;
    db.get('SELECT * FROM atividades WHERE id = ?', [atividadeId], (err, atividade) => {
      if (err || !atividade) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
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
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
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
            return res.status(422).json({ erro: 'INSCRICOES_ENCERRADAS', mensagem: 'Inscrições encerradas' });
          }
        }

        // Check JA_INSCRITO (R3): active inscription in the same activity
        db.all('SELECT * FROM inscricoes WHERE participanteId = ?', [req.usuario.id], (err, todasInscricoes) => {
          if (err) {
            return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
          }

          const ativaNaMesma = todasInscricoes.find(i => i.atividadeId === atividadeId && ['confirmada', 'em_espera', 'convocada'].includes(i.status));
          if (ativaNaMesma) {
            return res.status(409).json({ erro: 'JA_INSCRITO', mensagem: 'Participante já inscrito nesta atividade' });
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
                return res.status(409).json({ erro: 'CONFLITO_DE_HORARIO', mensagem: 'Conflito de horário com outra atividade' });
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
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
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
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Inscrição não encontrada' });
        }

        if (req.usuario.papel === 'participante' && inscricao.participanteId !== req.usuario.id) {
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Inscrição não encontrada' });
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
          return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Inscrição não encontrada' });
        }

        if (['em_espera', 'confirmada', 'cancelada'].includes(inscricao.status)) {
          return res.status(422).json({ erro: 'SEM_CONVOCACAO', mensagem: 'Inscrição sem convocação ativa' });
        }

        if (inscricao.status === 'expirada') {
          return res.status(422).json({ erro: 'CONVOCACAO_EXPIRADA', mensagem: 'Convocação expirada' });
        }

        db.get('SELECT * FROM atividades WHERE id = ?', [inscricao.atividadeId], (err, atividade) => {
          if (err || !atividade) {
            return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Atividade não encontrada' });
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
                    return res.status(409).json({ erro: 'CONFLITO_DE_HORARIO', mensagem: 'Conflito de horário com outra atividade' });
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
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Inscrição não encontrada' });
      }

      if (['cancelada', 'expirada'].includes(inscricao.status)) {
        return res.status(422).json({ erro: 'INSCRICAO_INATIVA', mensagem: 'Inscrição inativa' });
      }

      db.all('SELECT * FROM encontros WHERE atividadeId = ? ORDER BY inicio ASC', [inscricao.atividadeId], (err, encontros) => {
        if (err) {
          return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: err.message });
        }

        if (encontros.length > 0) {
          const primeiroInicio = new Date(encontros[0].inicio).getTime();
          const agora = new Date(currentClock).getTime();
          if (agora >= primeiroInicio) {
            return res.status(422).json({ erro: 'ATIVIDADE_JA_INICIADA', mensagem: 'Atividade já iniciada' });
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

  // GET /encontros/:id/codigo
  app.get('/encontros/:id/codigo', (req, res) => {
    if (req.usuario.papel !== 'organizacao') {
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organização' });
    }

    const encontroId = req.params.id;
    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro não encontrado' });
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
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro não encontrado' });
      }

      const agoraDate = new Date(currentClock);
      const inicioDate = new Date(encontro.inicio);
      const inicioJanela = new Date(inicioDate.getTime() - 15 * 60 * 1000);
      const fimJanela = new Date(inicioDate.getTime() + 30 * 60 * 1000);

      if (lidoEm) {
        const fimEncontro = new Date(encontro.fim);
        const limiteSincronizacao = new Date(fimEncontro.getTime() + 2 * 60 * 60 * 1000);
        if (agoraDate > limiteSincronizacao) {
          return res.status(422).json({ erro: 'SINCRONIZACAO_TARDIA', mensagem: 'Sincronização tardia' });
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
          return res.status(403).json({ erro: 'NAO_INSCRITO', mensagem: 'Participante não inscrito' });
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
            return res.status(422).json({ erro: 'CODIGO_INVALIDO', mensagem: 'Código inválido' });
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
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organização' });
    }

    const encontroId = req.params.id;
    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro não encontrado' });
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
      return res.status(403).json({ erro: 'SOMENTE_ORGANIZACAO', mensagem: 'Apenas organização' });
    }

    const encontroId = req.params.id;
    const { participanteId, justificativa } = req.body || {};

    db.get('SELECT * FROM encontros WHERE id = ?', [encontroId], (err, encontro) => {
      if (err || !encontro) {
        return res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Encontro não encontrado' });
      }

      const agoraDate = new Date(currentClock);
      const inicioDate = new Date(encontro.inicio);
      const fimDate = new Date(encontro.fim);
      const inicioJanela = new Date(inicioDate.getTime() - 15 * 60 * 1000);
      const fimJanela = new Date(fimDate.getTime() + 2 * 60 * 60 * 1000);

      if (agoraDate < inicioJanela || agoraDate > fimJanela) {
        return res.status(422).json({ erro: 'FORA_DA_JANELA', mensagem: 'Fora da janela de presença manual' });
      }

      if (!justificativa || typeof justificativa !== 'string' || justificativa.trim().length < 10) {
        return res.status(422).json({ erro: 'JUSTIFICATIVA_OBRIGATORIA', mensagem: 'Justificativa obrigatória (mínimo 10 caracteres)' });
      }

      db.get('SELECT * FROM inscricoes WHERE atividadeId = ? AND participanteId = ? AND status = ?', [encontro.atividadeId, participanteId, 'confirmada'], (err, inscricao) => {
        if (err || !inscricao) {
          return res.status(403).json({ erro: 'NAO_INSCRITO', mensagem: 'Participante não inscrito' });
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
