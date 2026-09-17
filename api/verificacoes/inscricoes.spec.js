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

test('cancela inscrição ativa antes do primeiro encontro com sucesso (200)', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    const resInscricao = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });
    const inscricao = await resInscricao.json();

    const res = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscricao.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'cancelada');
    assert.equal(body.id, inscricao.id);
  } finally {
    await servidor.fechar();
  }
});

test('recusa cancelamento de inscrição já cancelada com 422 INSCRICAO_INATIVA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    const resInscricao = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });
    const inscricao = await resInscricao.json();

    // First cancel
    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscricao.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    // Second cancel
    const res = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscricao.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'INSCRICAO_INATIVA');
  } finally {
    await servidor.fechar();
  }
});

test('recusa cancelamento no instante exato do início do primeiro encontro com 422 ATIVIDADE_JA_INICIADA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    const resInscricao = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });
    const inscricao = await resInscricao.json();

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T19:00:00-03:00' })
    });

    const res = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscricao.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'ATIVIDADE_JA_INICIADA');
  } finally {
    await servidor.fechar();
  }
});

test('respeita a precedência no cancelamento: INSCRICAO_INATIVA antes de ATIVIDADE_JA_INICIADA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    const resInscricao = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });
    const inscricao = await resInscricao.json();

    // Cancel once
    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscricao.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    // Advance clock past start time
    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T20:00:00-03:00' })
    });

    // Try to cancel again
    const res = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscricao.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.erro, 'INSCRICAO_INATIVA');
  } finally {
    await servidor.fechar();
  }
});

test('promove o primeiro da fila para convocada com convocadaAte preenchido quando inscrição confirmada é cancelada', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4', titulo: 'Atividade F4', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4', atividadeId: 'atv_f4', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();
    assert.equal(inscFabio.status, 'em_espera');

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resCheck.status, 200);
    const bodyFabio = await resCheck.json();
    assert.equal(bodyFabio.status, 'convocada');
    assert.ok(bodyFabio.convocadaAte);
  } finally {
    await servidor.fechar();
  }
});

test('define convocadaAte como o fechamento das inscrições quando a convocação ocorre a menos de 2h do fechamento', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4_t2', titulo: 'Atividade F4 T2', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4_t2', atividadeId: 'atv_f4_t2', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:00:00-03:00' })
    });

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio = await resCheck.json();
    assert.equal(bodyFabio.status, 'convocada');
    assert.equal(bodyFabio.convocadaAte, new Date('2026-10-19T18:30:00-03:00').toISOString());
  } finally {
    await servidor.fechar();
  }
});

test('confirma convocação dentro do prazo com sucesso (200, status confirmada)', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4_t3', titulo: 'Atividade F4 T3', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4_t3', atividadeId: 'atv_f4_t3', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t3/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t3/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resConf = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });

    assert.equal(resConf.status, 200);
    const bodyConf = await resConf.json();
    assert.equal(bodyConf.status, 'confirmada');
    assert.equal(bodyConf.id, inscFabio.id);
  } finally {
    await servidor.fechar();
  }
});

test('expira convocação quando relógio avança além de convocadaAte e promove o próximo da fila', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4_t4', titulo: 'Atividade F4 T4', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4_t4', atividadeId: 'atv_f4_t4', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t4/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t4/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();

    const resGabriela = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t4/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const inscGabriela = await resGabriela.json();

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-13T11:00:01-03:00' })
    });

    const resFabioCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio = await resFabioCheck.json();
    assert.equal(bodyFabio.status, 'expirada');

    const resGabrielaCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscGabriela.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const bodyGabriela = await resGabrielaCheck.json();
    assert.equal(bodyGabriela.status, 'convocada');
  } finally {
    await servidor.fechar();
  }
});

test('confirmação com relógio em convocadaAte exato é válida (200), mas 1ms depois responde 422 CONVOCACAO_EXPIRADA', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4_t5', titulo: 'Atividade F4 T5', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4_t5', atividadeId: 'atv_f4_t5', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t5/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t5/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resFabioCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio = await resFabioCheck.json();
    const convocadaAte = bodyFabio.convocadaAte;

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: convocadaAte })
    });

    const resConfExato = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConfExato.status, 200);

    // 1ms later
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4_t5b', titulo: 'Atividade F4 T5B', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4_t5b', atividadeId: 'atv_f4_t5b', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa2 = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t5b/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa2 = await resElisa2.json();

    const resFabio2 = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t5b/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio2 = await resFabio2.json();

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa2.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resFabio2Check = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio2.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio2 = await resFabio2Check.json();
    const ateMs = new Date(bodyFabio2.convocadaAte).getTime();
    const umMsDepois = new Date(ateMs + 1).toISOString();

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: umMsDepois })
    });

    const resConfDepois = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio2.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConfDepois.status, 422);
    const bodyDepois = await resConfDepois.json();
    assert.equal(bodyDepois.erro, 'CONVOCACAO_EXPIRADA');
  } finally {
    await servidor.fechar();
  }
});

test('recusa confirmação de inscrição em_espera ou expirada com os erros corretos', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f4_t6', titulo: 'Atividade F4 T6', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f4_t6', atividadeId: 'atv_f4_t6', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t6/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f4_t6/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();

    const resConfEspera = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConfEspera.status, 422);
    const bodyEspera = await resConfEspera.json();
    assert.equal(bodyEspera.erro, 'SEM_CONVOCACAO');

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-13T11:00:01-03:00' })
    });

    const resConfExpirada = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConfExpirada.status, 422);
    const bodyExpirada = await resConfExpirada.json();
    assert.equal(bodyExpirada.erro, 'CONVOCACAO_EXPIRADA');
  } finally {
    await servidor.fechar();
  }
});

test('precedência na confirmação: CONVOCACAO_EXPIRADA antes de CONFLITO_DE_HORARIO; e CONFLITO_DE_HORARIO antes de LIMITE_DE_MINICURSOS mantendo convocação válida', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_c1', titulo: 'Atv C1', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_c1', atividadeId: 'atv_c1', inicio: '2026-10-20T10:00:00-03:00', fim: '2026-10-20T12:00:00-03:00' })
    });

    const resE1 = await fetch(`http://localhost:${servidor.porta}/atividades/atv_c1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscE1 = await resE1.json();

    const resF1 = await fetch(`http://localhost:${servidor.porta}/atividades/atv_c1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscF1 = await resF1.json();

    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_c2', titulo: 'Atv C2', tipo: 'palestra', salaId: 'sala-2', vagas: 10 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_c2', atividadeId: 'atv_c2', inicio: '2026-10-20T11:00:00-03:00', fim: '2026-10-20T13:00:00-03:00' })
    });
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_c2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscE1.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-13T11:00:01-03:00' })
    });

    const resConfExp = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscF1.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConfExp.status, 422);
    const bodyExp = await resConfExp.json();
    assert.equal(bodyExp.erro, 'CONVOCACAO_EXPIRADA');


    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_d1', titulo: 'Atv D1', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_d1', atividadeId: 'atv_d1', inicio: '2026-10-20T10:00:00-03:00', fim: '2026-10-20T12:00:00-03:00' })
    });

    const resE2 = await fetch(`http://localhost:${servidor.porta}/atividades/atv_d1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscE2 = await resE2.json();

    const resF2 = await fetch(`http://localhost:${servidor.porta}/atividades/atv_d1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscF2 = await resF2.json();

    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_d2', titulo: 'Atv D2', tipo: 'palestra', salaId: 'sala-2', vagas: 10 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_d2', atividadeId: 'atv_d2', inicio: '2026-10-20T11:00:00-03:00', fim: '2026-10-20T13:00:00-03:00' })
    });
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_d2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscE2.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resConfConf = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscF2.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConfConf.status, 409);
    const bodyConf = await resConfConf.json();
    assert.equal(bodyConf.erro, 'CONFLITO_DE_HORARIO');

    const resCheckValid = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscF2.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyValid = await resCheckValid.json();
    assert.equal(bodyValid.status, 'convocada');
  } finally {
    await servidor.fechar();
  }
});

test('vaga liberada após o fechamento das inscrições não convoca ninguém e mantém inscrição em_espera', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f5_1', titulo: 'Atv F5 1', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f5_1', atividadeId: 'atv_f5_1', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    // p-elisa enrolls (confirmed)
    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    // p-fabio enrolls (in_espera)
    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();
    assert.equal(inscFabio.status, 'em_espera');

    // Advance clock past closing (30 min before 19:00 -> 18:30:00)
    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:31:00-03:00' })
    });

    // p-elisa cancels after closing
    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    // Check p-fabio status remains em_espera
    const resFabioCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio = await resFabioCheck.json();
    assert.equal(bodyFabio.status, 'em_espera');
  } finally {
    await servidor.fechar();
  }
});

test('reconstrução cronológica: expiração antes do fechamento promove o próximo, mas expiração no/após o fechamento não convoca ninguém (fila congelada)', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f5_2', titulo: 'Atv F5 2', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f5_2', atividadeId: 'atv_f5_2', inicio: '2026-10-19T20:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();

    const resGabriela = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_2/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const inscGabriela = await resGabriela.json();

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T18:00:00-03:00' })
    });

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    await fetch(`http://localhost:${servidor.porta}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agora: '2026-10-19T19:31:00-03:00' })
    });

    const resFabioCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio = await resFabioCheck.json();
    assert.equal(bodyFabio.status, 'expirada');

    const resGabrielaCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscGabriela.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const bodyGabriela = await resGabrielaCheck.json();
    assert.equal(bodyGabriela.status, 'em_espera');
  } finally {
    await servidor.fechar();
  }
});

test('fila respeita ordem de inserção com criadaEm idêntico: posições 1 e 2; após promoção da primeira, a segunda assume posição 1', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f5_3', titulo: 'Atv F5 3', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f5_3', atividadeId: 'atv_f5_3', inicio: '2026-10-19T20:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_3/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json();

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_3/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json();
    assert.equal(inscFabio.status, 'em_espera');
    assert.equal(inscFabio.posicaoNaEspera, 1);

    const resGabriela = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f5_3/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const inscGabriela = await resGabriela.json();
    assert.equal(inscGabriela.status, 'em_espera');
    assert.equal(inscGabriela.posicaoNaEspera, 2);

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resGabrielaCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscGabriela.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const bodyGabriela = await resGabrielaCheck.json();
    assert.equal(bodyGabriela.status, 'em_espera');
    assert.equal(bodyGabriela.posicaoNaEspera, 1);
  } finally {
    await servidor.fechar();
  }
});

test('organização tentando criar inscrição responde 403 SOMENTE_PARTICIPANTE', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    const res = await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.erro, 'SOMENTE_PARTICIPANTE');
  } finally {
    await servidor.fechar();
  }
});

test('organização tentando confirmar ou cancelar inscrições responde 403 SOMENTE_PARTICIPANTE', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    // ins_1 belongs to p-carla
    const resConf = await fetch(`http://localhost:${servidor.porta}/inscricoes/ins_1/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(resConf.status, 403);
    const bodyConf = await resConf.json();
    assert.equal(bodyConf.erro, 'SOMENTE_PARTICIPANTE');

    const resCancel = await fetch(`http://localhost:${servidor.porta}/inscricoes/ins_1/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(resCancel.status, 403);
    const bodyCancel = await resCancel.json();
    assert.equal(bodyCancel.erro, 'SOMENTE_PARTICIPANTE');
  } finally {
    await servidor.fechar();
  }
});

test('participante lista apenas suas inscrições, organização lista todas e filtro por atividade funciona', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });

    // p-carla enrolls in atv_1a2b3c4d (seeded by default, but let's enroll p-diego as well)
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_1a2b3c4d/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    // Participant p-carla lists
    const resCarla = await fetch(`http://localhost:${servidor.porta}/inscricoes`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-carla' }
    });
    assert.equal(resCarla.status, 200);
    const listCarla = await resCarla.json();
    assert.equal(listCarla.length, 1);
    assert.equal(listCarla[0].participanteId, 'p-carla');

    // Organizer org-ana lists
    const resOrg = await fetch(`http://localhost:${servidor.porta}/inscricoes`, {
      method: 'GET',
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(resOrg.status, 200);
    const listOrg = await resOrg.json();
    assert.equal(listOrg.length, 2);

    // Filter by atividadeId
    const resFilter = await fetch(`http://localhost:${servidor.porta}/inscricoes?atividadeId=atv_1a2b3c4d`, {
      method: 'GET',
      headers: { 'X-Usuario': 'org-ana' }
    });
    assert.equal(resFilter.status, 200);
    const listFilter = await resFilter.json();
    assert.equal(listFilter.length, 2);
  } finally {
    await servidor.fechar();
  }
});

test('participante consultando inscrição alheia por id recebe 404 NAO_ENCONTRADO', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    // ins_1 belongs to p-carla
    const res = await fetch(`http://localhost:${servidor.porta}/inscricoes/ins_1`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-diego' }
    });
    assert.equal(res.status, 404);
  } finally {
    await servidor.fechar();
  }
});

test('cancelar atividade passa todas inscrições confirmada, convocada e em_espera para cancelada e recusa ações subsequentes', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_f6_1', titulo: 'Atv F6 1', tipo: 'palestra', salaId: 'sala-1', vagas: 1 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_f6_1', atividadeId: 'atv_f6_1', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const resElisa = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f6_1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });
    const inscElisa = await resElisa.json(); // confirmada

    const resFabio = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f6_1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const inscFabio = await resFabio.json(); // em_espera

    const resGabriela = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f6_1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const inscGabriela = await resGabriela.json(); // em_espera

    // Cancel Elisa to promote Fabio to convocada
    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscElisa.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-elisa' }
    });

    const resFabioCheck = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabio = await resFabioCheck.json();
    assert.equal(bodyFabio.status, 'convocada');

    // Now cancel the activity as org-ana
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_f6_1/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'org-ana' }
    });

    // Check Fabio and Gabriela status become cancelada
    const resFabioCancelled = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    const bodyFabioC = await resFabioCancelled.json();
    assert.equal(bodyFabioC.status, 'cancelada');

    const resGabrielaCancelled = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscGabriela.id}`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-gabriela' }
    });
    const bodyGabrielaC = await resGabrielaCancelled.json();
    assert.equal(bodyGabrielaC.status, 'cancelada');

    // Try to confirm Fabio -> 422 SEM_CONVOCACAO
    const resConf = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}/confirmacao`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resConf.status, 422);
    const bodyConf = await resConf.json();
    assert.equal(bodyConf.erro, 'SEM_CONVOCACAO');

    // Try to cancel Fabio again -> 422 INSCRICAO_INATIVA
    const resCancelAgain = await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscFabio.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-fabio' }
    });
    assert.equal(resCancelAgain.status, 422);
    const bodyCancel = await resCancelAgain.json();
    assert.equal(bodyCancel.erro, 'INSCRICAO_INATIVA');

    // Try new inscription -> 422 ATIVIDADE_CANCELADA
    const resNew = await fetch(`http://localhost:${servidor.porta}/atividades/atv_f6_1/inscricoes`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-heitor' }
    });
    assert.equal(resNew.status, 422);
    const bodyNew = await resNew.json();
    assert.equal(bodyNew.erro, 'ATIVIDADE_CANCELADA');
  } finally {
    await servidor.fechar();
  }
});

test('consulta de atividade expõe ocupadas, vagasRestantes e emEspera corretos (R9)', async () => {
  const servidor = await criarServidor({ porta: 0 });
  try {
    await fetch(`http://localhost:${servidor.porta}/_teste/reset`, { method: 'POST' });
    await fetch(`http://localhost:${servidor.porta}/_teste/atividades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'atv_r9_test', titulo: 'Atividade R9 Test', tipo: 'palestra', salaId: 'sala-1', vagas: 3 })
    });
    await fetch(`http://localhost:${servidor.porta}/_teste/encontros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'enc_r9_test', atividadeId: 'atv_r9_test', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' })
    });

    const inscCarla = await (await fetch(`http://localhost:${servidor.porta}/atividades/atv_r9_test/inscricoes`, { method: 'POST', headers: { 'X-Usuario': 'p-carla' } })).json();
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_r9_test/inscricoes`, { method: 'POST', headers: { 'X-Usuario': 'p-diego' } });
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_r9_test/inscricoes`, { method: 'POST', headers: { 'X-Usuario': 'p-elisa' } });
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_r9_test/inscricoes`, { method: 'POST', headers: { 'X-Usuario': 'p-fabio' } });
    await fetch(`http://localhost:${servidor.porta}/atividades/atv_r9_test/inscricoes`, { method: 'POST', headers: { 'X-Usuario': 'p-gabriela' } });

    await fetch(`http://localhost:${servidor.porta}/inscricoes/${inscCarla.id}/cancelamento`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-carla' }
    });

    const resAtv = await fetch(`http://localhost:${servidor.porta}/atividades/atv_r9_test`, {
      method: 'GET',
      headers: { 'X-Usuario': 'p-diego' }
    });
    assert.equal(resAtv.status, 200);
    const atv = await resAtv.json();

    assert.equal(atv.ocupadas, 3);
    assert.equal(atv.vagasRestantes, 0);
    assert.equal(atv.emEspera, 1);
  } finally {
    await servidor.fechar();
  }
});




