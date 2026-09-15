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
        vagas INTEGER
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS inscricoes (
        id TEXT PRIMARY KEY,
        atividadeId TEXT,
        participanteId TEXT,
        status TEXT
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
      db.run(`INSERT INTO inscricoes (id, atividadeId, participanteId, status) VALUES (?, ?, ?, ?)`, [
        'ins_1',
        'atv_1a2b3c4d',
        'p-carla',
        'confirmada'
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
