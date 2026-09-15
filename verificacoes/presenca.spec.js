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

test('POST /encontros/:id/presencas registra presença online com sucesso (201) e repete com 200 (idempotência)', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const resCodigo = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`, {
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(resCodigo.status, 200);
    const bodyCodigo = await resCodigo.json();
    const codigo = bodyCodigo.codigo;

    const resPresenca1 = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });

    assert.equal(resPresenca1.status, 201);
    const p1 = await resPresenca1.json();
    assert.equal(p1.encontroId, 'enc_5e6f7a8b');
    assert.equal(p1.participanteId, 'p-carla');
    assert.equal(p1.origem, 'qr');
    assert.ok(p1.id.startsWith('pre_'));

    const resPresenca2 = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });

    assert.equal(resPresenca2.status, 200);
    const p2 = await resPresenca2.json();
    assert.equal(p2.id, p1.id);
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas recusa código inválido com 422 CODIGO_INVALIDO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo: 'INVALID' })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'CODIGO_INVALIDO');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas recusa participante não inscrito com 403 NAO_INSCRITO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const resCodigo = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`, {
      headers: { 'X-Usuario': 'org-ana' }
    });
    const { codigo } = await resCodigo.json();

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-diego',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ codigo })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.erro, 'NAO_INSCRITO');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas com lidoEm dentro da janela e envio a tempo registra com sucesso (201) e origem qr_offline', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:50:00-03:00' })
    });

    const resCodigo = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/codigo`, {
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(resCodigo.status, 200);
    const { codigo } = await resCodigo.json();

    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T22:30:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigo,
        lidoEm: '2026-10-19T18:50:30-03:00'
      })
    });

    assert.equal(res.status, 201);
    const p = await res.json();
    assert.equal(p.origem, 'qr_offline');
    assert.equal(p.lidoEm, '2026-10-19T18:50:30-03:00');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas com lidoEm fora da janela retorna 422 FORA_DA_JANELA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T22:30:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigo: 'ABCDEF',
        lidoEm: '2026-10-19T18:00:00-03:00'
      })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'FORA_DA_JANELA');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas com lidoEm valido mas envio apos 2h do fim retorna 422 SINCRONIZACAO_TARDIA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-20T00:05:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigo: 'ABCDEF',
        lidoEm: '2026-10-19T18:50:00-03:00'
      })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'SINCRONIZACAO_TARDIA');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas/manual registra presença manual com sucesso (201) pela organização, com justificativa válida e idempotência (200)', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:00-03:00' })
    });

    const res1 = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'org-ana',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participanteId: 'p-carla',
        justificativa: 'Participou presencialmente mas app falhou'
      })
    });

    assert.equal(res1.status, 201);
    const p1 = await res1.json();
    assert.equal(p1.encontroId, 'enc_5e6f7a8b');
    assert.equal(p1.participanteId, 'p-carla');
    assert.equal(p1.origem, 'manual');
    assert.equal(p1.justificativa, 'Participou presencialmente mas app falhou');

    const res2 = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'org-ana',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participanteId: 'p-carla',
        justificativa: 'Participou presencialmente mas app falhou'
      })
    });

    assert.equal(res2.status, 200);
    const p2 = await res2.json();
    assert.equal(p2.id, p1.id);
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas/manual recusa justificativa ausente ou menor que 10 caracteres com 422 JUSTIFICATIVA_OBRIGATORIA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'org-ana',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participanteId: 'p-carla',
        justificativa: 'Curto'
      })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'JUSTIFICATIVA_OBRIGATORIA');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas/manual recusa fora do prazo com 422 FORA_DA_JANELA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:00:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'org-ana',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participanteId: 'p-carla',
        justificativa: 'Participou presencialmente mas app falhou'
      })
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'FORA_DA_JANELA');
  } finally {
    await servidor.fechar();
  }
});

test('POST /encontros/:id/presencas/manual recusa participante não inscrito com 403 NAO_INSCRITO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:00-03:00' })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'org-ana',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participanteId: 'p-diego',
        justificativa: 'Participou presencialmente mas app falhou'
      })
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.erro, 'NAO_INSCRITO');
  } finally {
    await servidor.fechar();
  }
});

test('GET /encontros/:id/presencas retorna 200 e lista de presenças para organização', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });
    
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:00-03:00' })
    });

    await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'org-ana',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participanteId: 'p-carla',
        justificativa: 'Participou presencialmente mas app falhou'
      })
    });

    const res = await fetch(`${baseURL}/encontros/enc_5e6f7a8b/presencas`, {
      headers: { 'X-Usuario': 'org-ana' }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 1);
    assert.equal(body[0].participanteId, 'p-carla');
  } finally {
    await servidor.fechar();
  }
});
