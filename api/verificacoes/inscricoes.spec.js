import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../servidor.js';

test('cria inscrição confirmada quando há vagas disponíveis', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-diego'
      }
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'confirmada');
    assert.ok(body.id.startsWith('ins_'));
    assert.equal(body.atividadeId, 'atv_1a2b3c4d');
    assert.equal(body.participanteId, 'p-diego');
  } finally {
    await servidor.fechar();
  }
});

test('cria inscrição em_espera com posicaoNaEspera correta quando vagasRestantes é zero', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades/atv_1a2b3c4d`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vagas: 0 })
    });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-diego'
      }
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'em_espera');
    assert.equal(body.posicaoNaEspera, 1);
  } finally {
    await servidor.fechar();
  }
});

test('recusa segunda inscrição ativa na mesma atividade com JA_INSCRITO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: {
        'X-Usuario': 'p-carla'
      }
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.erro, 'JA_INSCRITO');
  } finally {
    await servidor.fechar();
  }
});

test('recusa inscrição com conflito de horário com 409 CONFLITO_DE_HORARIO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    // p-diego enrolls in atv_1a2b3c4d (19:00 - 22:00)
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    // Create another activity with overlapping encounter (20:00 - 23:00)
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_outra', titulo: 'Outra Atividade', tipo: 'palestra', salaId: 'sala-1', vagas: 10 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_outro', atividadeId: 'atv_outra', inicio: '2026-10-19T20:00:00-03:00', fim: '2026-10-19T23:00:00-03:00' })
    });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_outra/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.erro, 'CONFLITO_DE_HORARIO');
  } finally {
    await servidor.fechar();
  }
});

test('recusa quarta inscrição em minicurso com 422 LIMITE_DE_MINICURSOS', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    // Create 3 minicursos and enroll p-diego in all 3
    for (let i = 1; i <= 3; i++) {
      const atvId = `atv_mini_${i}`;
      await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: atvId, titulo: `Minicurso ${i}`, tipo: 'minicurso', salaId: `lab-${i}`, vagas: 10 })
      });
      await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `enc_mini_${i}`, atividadeId: atvId, inicio: `2026-10-2${i}T14:00:00-03:00`, fim: `2026-10-2${i}T18:00:00-03:00` })
      });
      await fetch(`http://localhost:${servidor.porta}/atividades/${atvId}/inscricoes`, {
        method: 'POST',
        headers: { 'X-Usuario': 'p-diego' }
      });
    }

    // Create 4th minicurso
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_mini_4', titulo: 'Minicurso 4', tipo: 'minicurso', salaId: 'lab-4', vagas: 10 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_mini_4', atividadeId: 'atv_mini_4', inicio: '2026-10-25T14:00:00-03:00', fim: '2026-10-25T18:00:00-03:00' })
    });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_mini_4/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'LIMITE_DE_MINICURSOS');
  } finally {
    await servidor.fechar();
  }
});

test('respeita a precedência de erro: INSCRICOES_ENCERRADAS antes de JA_INSCRITO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    // Enroll p-diego first while open
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    // Advance clock past deadline
    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:30:00-03:00' })
    });

    // Try to enroll p-diego again (has active inscription AND deadline passed)
    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'INSCRICOES_ENCERRADAS');
  } finally {
    await servidor.fechar();
  }
});


test('recusa inscrição exatamente 30 minutos antes do início do primeiro encontro com INSCRICOES_ENCERRADAS', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    // Encounter starts at 2026-10-19T19:00:00-03:00. Closing is 30 min before = 18:30:00.
    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:30:00-03:00' })
    });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'INSCRICOES_ENCERRADAS');
  } finally {
    await servidor.fechar();
  }
});

test('recusa inscrição em atividade cancelada com ATIVIDADE_CANCELADA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    
    // Cancel activity via POST /atividades/atv_1a2b3c4d/cancelamento as org-ana
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana' }
    });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
  } finally {
    await servidor.fechar();
  }
});

test('respeita a precedência de erro: ATIVIDADE_CANCELADA antes de INSCRICOES_ENCERRADAS', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    
    // Set clock past deadline
    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:30:00-03:00' })
    });

    // Cancel activity
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana' }
    });

    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
  } finally {
    await servidor.fechar();
  }
});



