import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../api/servidor.js';

test('GET /encontros/:id/codigo retorna 200 e CodigoDoEncontro dentro da janela', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`, {
      headers: { 'X-Usuario': 'org-ana' }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.encontroId, 'enc_5e6f7a8b');
    assert.equal(typeof body.codigo, 'string');
    assert.equal(body.codigo.length, 6);
    for (const char of body.codigo) {
      assert.ok('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.includes(char), `Caractere inválido: ${char}`);
    }
    assert.ok(body.trocaEm);
    assert.ok(body.validoAte);
  } finally {
    await servidor.fechar();
  }
});

test('GET /encontros/:id/codigo retorna 422 FORA_DA_JANELA fora da janela', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    // Antes da janela (mais de 15 min antes do início de 19:00)
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:00:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`, {
      headers: { 'X-Usuario': 'org-ana' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'FORA_DA_JANELA');
  } finally {
    await servidor.fechar();
  }
});

test('GET /encontros/:id/codigo retorna 401 USUARIO_DESCONHECIDO sem X-Usuario', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.erro, 'USUARIO_DESCONHECIDO');
  } finally {
    await servidor.fechar();
  }
});

test('GET /encontros/:id/codigo retorna 403 SOMENTE_ORGANIZACAO se chamado por participante', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`, {
      headers: { 'X-Usuario': 'p-carla' }
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.erro, 'SOMENTE_ORGANIZACAO');
  } finally {
    await servidor.fechar();
  }
});

test('GET /encontros/:id/codigo retorna 404 NAO_ENCONTRADO para encontro inexistente', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_inexistente/codigo`, {
      headers: { 'X-Usuario': 'org-ana' }
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.erro, 'NAO_ENCONTRADO');
  } finally {
    await servidor.fechar();
  }
});
