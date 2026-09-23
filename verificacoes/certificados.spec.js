import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServidor } from '../api/servidor.js';

test('POST /atividades/:id/certificado retorna 404 NAO_ENCONTRADO para atividade inexistente', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });

    const res = await fetch(`${baseURL}/atividades/atv_inexistente/certificado`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-carla' }
    });

    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.erro, 'NAO_ENCONTRADO');
  } finally {
    await servidor.fechar();
  }
});

test('POST certificado retorna 403 NAO_INSCRITO para participante sem inscricao', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });

    const res = await fetch(`${baseURL}/atividades/atv_1a2b3c4d/certificado`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-diego' }
    });

    assert.equal(res.status, 403);

    const body = await res.json();
    assert.equal(body.erro, 'NAO_INSCRITO');
  } finally {
    await servidor.fechar();
  }
});

test('POST certificado retorna 422 ATIVIDADE_NAO_ENCERRADA antes do fim', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });

    const res = await fetch(`${baseURL}/atividades/atv_1a2b3c4d/certificado`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-carla' }
    });

    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.erro, 'ATIVIDADE_NAO_ENCERRADA');
  } finally {
    await servidor.fechar();
  }
});

test('POST certificado retorna 422 PRESENCA_INSUFICIENTE apos encerramento sem presenca', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });

    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agora: '2026-10-20T23:00:00-03:00'
      })
    });

    const res = await fetch(`${baseURL}/atividades/atv_1a2b3c4d/certificado`, {
      method: 'POST',
      headers: { 'X-Usuario': 'p-carla' }
    });

    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.erro, 'PRESENCA_INSUFICIENTE');
  } finally {
    await servidor.fechar();
  }
});

test('POST certificado emite certificado valido com 201', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, { method: 'POST' });

    // Coloca o relogio depois do fim do encontro,
    // mas ainda dentro da janela permitida para presenca manual.
    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agora: '2026-10-19T22:30:00-03:00'
      })
    });

    // Registra presenca valida para Carla.
    const presenca = await fetch(
      `${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario': 'org-ana'
        },
        body: JSON.stringify({
          participanteId: 'p-carla',
          justificativa: 'Presenca confirmada manualmente'
        })
      }
    );

    assert.equal(presenca.status, 201);

    // Emite o certificado.
    const res = await fetch(
      `${baseURL}/atividades/atv_1a2b3c4d/certificado`,
      {
        method: 'POST',
        headers: { 'X-Usuario': 'p-carla' }
      }
    );

    assert.equal(res.status, 201);

    const body = await res.json();

    assert.equal(body.atividadeId, 'atv_1a2b3c4d');
    assert.equal(body.participanteId, 'p-carla');
    assert.equal(body.cargaHorariaMinutos, 180);
    assert.equal(body.presencas, 1);
    assert.equal(body.encontros, 1);
    assert.match(body.codigo, /^SA26-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    assert.ok(body.emitidoEm);
  } finally {
    await servidor.fechar();
  }
});

test('POST certificado retorna 422 ATIVIDADE_CANCELADA para atividade cancelada', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, {
      method: 'POST'
    });

    await fetch(
      `${baseURL}/_teste/atividades/atv_1a2b3c4d`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          situacao: 'cancelada'
        })
      }
    );

    const res = await fetch(
      `${baseURL}/atividades/atv_1a2b3c4d/certificado`,
      {
        method: 'POST',
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.erro, 'ATIVIDADE_CANCELADA');
  } finally {
    await servidor.fechar();
  }
});

test('POST certificado reemitido retorna 200 com mesmo codigo e GET /certificados lista o emitido', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, {
      method: 'POST'
    });

    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agora: '2026-10-19T22:30:00-03:00'
      })
    });

    await fetch(
      `${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario': 'org-ana'
        },
        body: JSON.stringify({
          participanteId: 'p-carla',
          justificativa: 'Presenca confirmada manualmente'
        })
      }
    );

    const primeira = await fetch(
      `${baseURL}/atividades/atv_1a2b3c4d/certificado`,
      {
        method: 'POST',
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(primeira.status, 201);

    const certificado1 = await primeira.json();

    const segunda = await fetch(
      `${baseURL}/atividades/atv_1a2b3c4d/certificado`,
      {
        method: 'POST',
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(segunda.status, 200);

    const certificado2 = await segunda.json();

    assert.equal(certificado2.codigo, certificado1.codigo);
    assert.equal(certificado2.emitidoEm, certificado1.emitidoEm);

    const listaRes = await fetch(
      `${baseURL}/certificados`,
      {
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(listaRes.status, 200);

    const lista = await listaRes.json();

    assert.equal(lista.length, 1);
    assert.equal(lista[0].codigo, certificado1.codigo);
    assert.equal(lista[0].participanteId, 'p-carla');
  } finally {
    await servidor.fechar();
  }
});

test('GET /certificados/:codigo e publico, aceita minusculas e abrevia o nome', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, {
      method: 'POST'
    });

    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agora: '2026-10-19T22:30:00-03:00'
      })
    });

    await fetch(
      `${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario': 'org-ana'
        },
        body: JSON.stringify({
          participanteId: 'p-carla',
          justificativa: 'Presenca confirmada manualmente'
        })
      }
    );

    const emissao = await fetch(
      `${baseURL}/atividades/atv_1a2b3c4d/certificado`,
      {
        method: 'POST',
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(emissao.status, 201);

    const certificado = await emissao.json();

    const res = await fetch(
      `${baseURL}/certificados/${certificado.codigo.toLowerCase()}`
    );

    assert.equal(res.status, 200);

    const body = await res.json();

    assert.equal(body.codigo, certificado.codigo);
    assert.equal(body.participante, 'Carla M. S.');
    assert.equal(body.atividade, 'Flutter do zero');
    assert.equal(body.cargaHorariaMinutos, 180);
    assert.equal(body.emitidoEm, certificado.emitidoEm);

    assert.deepEqual(
      Object.keys(body).sort(),
      [
        'codigo',
        'participante',
        'atividade',
        'cargaHorariaMinutos',
        'emitidoEm'
      ].sort()
    );
  } finally {
    await servidor.fechar();
  }
});

test('GET /extrato lista atividade elegivel sem certificado e depois inclui o codigo emitido', async () => {
  const servidor = await criarServidor({ porta: 0 });
  const baseURL = `http://localhost:${servidor.porta}`;

  try {
    await fetch(`${baseURL}/_teste/reset`, {
      method: 'POST'
    });

    await fetch(`${baseURL}/_teste/relogio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agora: '2026-10-19T22:30:00-03:00'
      })
    });

    await fetch(
      `${baseURL}/encontros/enc_5e6f7a8b/presencas/manual`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario': 'org-ana'
        },
        body: JSON.stringify({
          participanteId: 'p-carla',
          justificativa: 'Presenca confirmada manualmente'
        })
      }
    );

    const extratoAntes = await fetch(
      `${baseURL}/extrato`,
      {
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(extratoAntes.status, 200);

    const antes = await extratoAntes.json();

    assert.equal(antes.itens.length, 1);
    assert.equal(
      antes.itens[0].atividadeId,
      'atv_1a2b3c4d'
    );
    assert.equal(antes.itens[0].codigo, null);
    assert.equal(antes.itens[0].cargaHorariaMinutos, 180);

    assert.equal(antes.palestrasMinutos, 0);
    assert.equal(antes.minicursosMinutos, 180);
    assert.equal(antes.totalMinutos, 180);
    assert.equal(antes.aproveitadoMinutos, 180);

    const emissao = await fetch(
      `${baseURL}/atividades/atv_1a2b3c4d/certificado`,
      {
        method: 'POST',
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(emissao.status, 201);

    const certificado = await emissao.json();

    const extratoDepois = await fetch(
      `${baseURL}/extrato`,
      {
        headers: {
          'X-Usuario': 'p-carla'
        }
      }
    );

    assert.equal(extratoDepois.status, 200);

    const depois = await extratoDepois.json();

    assert.equal(
      depois.itens[0].codigo,
      certificado.codigo
    );
  } finally {
    await servidor.fechar();
  }
});