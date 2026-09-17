import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { criarServidor } from '../api/server.js';

const app = criarServidor();
const server = createServer(app);
let port;

test.before(async () => {
  await new Promise((resolve, reject) => {
    server.listen(0, (err) => {
      if (err) return reject(err);
      port = server.address().port;
      resolve();
    });
  });
});

test.after(async () => {
  server.close();
});

async function reset() {
  await fetch(`http://localhost:${port}/_teste/reset`, { method: 'POST' });
}

test('R2 - recusa minicurso com 1 encontro', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Flutter do zero', tipo: 'minicurso', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'QUANTIDADE_DE_ENCONTROS');
});

test('R2 - recusa palestra com 2 encontros', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Intro à IA', tipo: 'palestra', salaId: 'auditorio', vagas: 100,
      encontros: [
        { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
        { inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T22:00:00-03:00' }
      ]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'QUANTIDADE_DE_ENCONTROS');
});

test('R3 - recusa encontro com inicio >= fim', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Overlap', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T22:00:00-03:00', fim: '2026-10-19T19:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'ENCONTRO_INVALIDO');
});

test('R3 - recusa encontro fora do periodo do evento', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Fora do evento', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-18T19:00:00-03:00', fim: '2026-10-18T22:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'ENCONTRO_INVALIDO');
});

test('R3 - recusa encontro com duracao > 4h', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Longo demais', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T23:01:00-03:00' }]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'ENCONTRO_INVALIDO');
});

test('R3 - recusa encontros sobrepostos da mesma atividade', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Overlap', tipo: 'minicurso', salaId: 'lab-3', vagas: 10,
      encontros: [
        { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
        { inicio: '2026-10-19T20:00:00-03:00', fim: '2026-10-19T23:00:00-03:00' }
      ]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'ENCONTRO_INVALIDO');
});

test('R4 - recusa vagas > capacidade da sala', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Muitas vagas', tipo: 'palestra', salaId: 'lab-3', vagas: 100,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'VAGAS_ACIMA_DA_CAPACIDADE');
});

test('R4 - recusa vagas < 1', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Vagas zero', tipo: 'palestra', salaId: 'lab-3', vagas: 0,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'VAGAS_ACIMA_DA_CAPACIDADE');
});

test('R5 - recusa conflito de sala (10 min entre encontros)', async () => {
  await reset();
  await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Primeira', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Segunda', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T22:10:00-03:00', fim: '2026-10-19T23:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.erro, 'CONFLITO_DE_SALA');
});

test('R5 - aceita dois encontros na mesma sala com 20 min de intervalo', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Primeira', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  assert.equal(res.status, 201);
  const res2 = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Segunda', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T22:20:00-03:00', fim: '2026-10-19T23:00:00-03:00' }]
    })
  });
  assert.equal(res2.status, 201);
});

test('BUG-3 - R5 recusa sobreposicao entre atividades diferentes na mesma sala', async () => {
  await reset();
  const res1 = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Atividade A', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  assert.equal(res1.status, 201);
  const res2 = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Atividade B', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T21:00:00-03:00', fim: '2026-10-19T23:00:00-03:00' }]
    })
  });
  assert.equal(res2.status, 409);
  const body = await res2.json();
  assert.equal(body.erro, 'CONFLITO_DE_SALA');
});

test('BUG-2 - R3 refatora verificacao de sobreposicao interna usando indices', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Overlap test', tipo: 'minicurso', salaId: 'lab-3', vagas: 10,
      encontros: [
        { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
        { inicio: '2026-10-19T20:00:00-03:00', fim: '2026-10-19T23:00:00-03:00' }
      ]
    })
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.erro, 'ENCONTRO_INVALIDO');
});

test('R16 - GET /atividades?tipo=invalido retorna lista vazia', async () => {
  await reset();
  const res = await fetch(`http://localhost:${port}/atividades?tipo=invalido`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 0);
});

test('R16 - GET /atividades?tipo=palestra retorna apenas palestras', async () => {
  await reset();
  await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Curso', tipo: 'minicurso', salaId: 'lab-3', vagas: 10,
      encontros: [
        { inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
        { inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T22:00:00-03:00' }
      ]
    })
  });
  const res = await fetch(`http://localhost:${port}/atividades?tipo=palestra`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 0);
});

test('R15 - GET /atividades?dia=2026-10-19 retorna atividades com encontro naquele dia', async () => {
  await reset();
  await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Dia 19', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
    })
  });
  await fetch(`http://localhost:${port}/atividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
    body: JSON.stringify({
      titulo: 'Dia 20', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
      encontros: [{ inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T22:00:00-03:00' }]
    })
  });
  const res = await fetch(`http://localhost:${port}/atividades?dia=2026-10-19`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].titulo, 'Dia 19');
});

  // --- FATIA 2: Consulta e detalhes ---

  test('F2 - GET /atividades/:id retorna atividade criada', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Para buscar', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    const res = await fetch(`http://localhost:${port}/atividades/${created.id}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, created.id);
    assert.equal(body.titulo, 'Para buscar');
    assert.equal(body.situacao, 'prevista');
  });

  test('F2 - GET /atividades/:id nao existente retorna 404', async () => {
    await reset();
    const res = await fetch(`http://localhost:${port}/atividades/atv_00000000`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.erro, 'NAO_ENCONTRADO');
  });

  // --- FATIA 3: Alteração ---

  test('F3 - PATCH altera titulo e vagas com sucesso', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Original', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ titulo: 'Alterado', vagas: 5 })
    });
    assert.equal(patchRes.status, 200);
    const body = await patchRes.json();
    assert.equal(body.titulo, 'Alterado');
    assert.equal(body.vagas, 5);
  });

  test('F3 - PATCH recusa alteracao de campo nao editavel (tipo)', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Original', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ tipo: 'minicurso' })
    });
    assert.equal(patchRes.status, 422);
    const body = await patchRes.json();
    assert.equal(body.erro, 'CAMPO_NAO_EDITAVEL');
  });

  test('F3 - PATCH recusa alteracao de campo nao editavel (id)', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Original', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ id: 'changed' })
    });
    assert.equal(patchRes.status, 422);
    const body = await patchRes.json();
    assert.equal(body.erro, 'CAMPO_NAO_EDITAVEL');
  });

  test('F3 - PATCH altera salaId com sucesso quando sem conflito', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Original', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ salaId: 'sala-101' })
    });
    assert.equal(patchRes.status, 200);
    const body = await patchRes.json();
    assert.equal(body.salaId, 'sala-101');
  });

  test('F3 - PATCH recusa aumento de vagas acima da capacidade', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Original', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ vagas: 100 })
    });
    assert.equal(patchRes.status, 422);
    const body = await patchRes.json();
    assert.equal(body.erro, 'VAGAS_ACIMA_DA_CAPACIDADE');
  });

  // --- R10: VAGAS_ABAIXO_DOS_INSCRITOS ---

  test('R10 - PATCH recusa reduzir vagas abaixo de inscritos', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Com inscritos', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }],
        ocupadas: 8
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ vagas: 3 })
    });
    assert.equal(patchRes.status, 409);
    const body = await patchRes.json();
    assert.equal(body.erro, 'VAGAS_ABAIXO_DOS_INSCRITOS');
  });

  // --- R11: CONFLITO_DE_SALA no PATCH ---

  test('R11 - PATCH recusa mudanca de sala para com conflito', async () => {
    await reset();
    const res1 = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Atividade A', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    assert.equal(res1.status, 201);
    const res2 = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Atividade B', tipo: 'palestra', salaId: 'sala-101', vagas: 10,
        encontros: [{ inicio: '2026-10-19T20:00:00-03:00', fim: '2026-10-19T23:00:00-03:00' }]
      })
    });
    assert.equal(res2.status, 201);
    const created = await res2.json();
    const patchRes = await fetch(`http://localhost:${port}/atividades/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({ salaId: 'lab-3' })
    });
    assert.equal(patchRes.status, 409);
    const body = await patchRes.json();
    assert.equal(body.erro, 'CONFLITO_DE_SALA');
  });

  // --- FATIA 4: Cancelamento e situação ---

  test('F4 - Cancela atividade prevista com sucesso', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Cancelavel', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    const cancelRes = await fetch(`http://localhost:${port}/atividades/${created.id}/cancelamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' }
    });
    assert.equal(cancelRes.status, 200);
    const body = await cancelRes.json();
    assert.equal(body.situacao, 'cancelada');
  });

  test('F4 - Cancela atividade ja cancelada gera erro', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Ja cancelada', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    await fetch(`http://localhost:${port}/atividades/${created.id}/cancelamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' }
    });
    const cancelRes = await fetch(`http://localhost:${port}/atividades/${created.id}/cancelamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' }
    });
    assert.equal(cancelRes.status, 422);
    const body = await cancelRes.json();
    assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
  });

  test('F4 - Cancela atividade em_andamento gera erro', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Ja iniciada', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T20:00:00-03:00' }]
      })
    });
    const created = await createRes.json();
    // Avancar relógio para depois do início do encontro
    await fetch(`http://localhost:${port}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T19:30:00-03:00' })
    });
    const cancelRes = await fetch(`http://localhost:${port}/atividades/${created.id}/cancelamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' }
    });
    assert.equal(cancelRes.status, 422);
    const body = await cancelRes.json();
    assert.equal(body.erro, 'ATIVIDADE_JA_INICIADA');
  });

  // --- FATIA: R14 - Situa��o pelo rel�gio (BUG-1: >= vs >) ---

  test('R14 - no instante exato do fim do �ltimo encontro, situacao deve ser em_andamento', async () => {
    await reset();
    const createRes = await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Para testar R14', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T20:00:00-03:00' }]
      })
    });
    assert.equal(createRes.status, 201);
    // Avan�ar rel�gio para exatamente o fim do �ltimo encontro
    await fetch(`http://localhost:${port}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:00-03:00' })
    });
    const getRes = await fetch(`http://localhost:${port}/atividades`);
    assert.equal(getRes.status, 200);
    const body = await getRes.json();
    const atv = body.find(a => a.titulo === 'Para testar R14');
    assert.equal(atv.situacao, 'em_andamento');
  });

  test('R14 - ap�s o fim do �ltimo encontro, situacao deve ser encerrada', async () => {
    await reset();
    await fetch(`http://localhost:${port}/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Usuario': 'org-ana' },
      body: JSON.stringify({
        titulo: 'Para testar R14 fim', tipo: 'palestra', salaId: 'lab-3', vagas: 10,
        encontros: [{ inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T20:00:00-03:00' }]
      })
    });
    // Avan�ar rel�gio para depois do fim do �ltimo encontro
    await fetch(`http://localhost:${port}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:01-03:00' })
    });
    const getRes = await fetch(`http://localhost:${port}/atividades`);
    const body = await getRes.json();
    const atv = body.find(a => a.titulo === 'Para testar R14 fim');
    assert.equal(atv.situacao, 'encerrada');
  });
