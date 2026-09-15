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

      // Seed initial encontros (including enc_5e6f7a8b for testing)
      db.run('DELETE FROM encontros');
      db.run(`INSERT INTO encontros (id, atividadeId, inicio, fim) VALUES (?, ?, ?, ?)`, [
        'enc_5e6f7a8b',
        'atv_1a2b3c4d',
        '2026-10-19T19:00:00-03:00',
        '2026-10-19T22:00:00-03:00'
      ]);
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

      // Generate 6-char code using restricted alphabet
      const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let codigo = '';
      for (let i = 0; i < 6; i++) {
        codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
      }

      // trocaEm and validoAte
      const minutoAtual = new Date(agoraDate);
      minutoAtual.setSeconds(0, 0);
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
