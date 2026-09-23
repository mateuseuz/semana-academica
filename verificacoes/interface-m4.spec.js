import test from 'node:test';
import assert from 'node:assert/strict';

test('Interface M4 consulta certificados usando API falsa', async () => {
  const fakeFetch = async (url, options = {}) => {
    assert.ok(url.endsWith('/certificados'));
    assert.equal(options.headers['X-Usuario'], 'p-carla');

    return {
      ok: true,
      status: 200,
      json: async () => [
        {
          codigo: 'SA26-ABCD-EFGH',
          atividadeId: 'atv_1a2b3c4d',
          participanteId: 'p-carla',
          cargaHorariaMinutos: 180,
          presencas: 1,
          encontros: 1,
          emitidoEm: '2026-10-19T22:30:00-03:00'
        }
      ]
    };
  };

  const resposta = await fakeFetch(
    'http://localhost:3000/certificados',
    {
      headers: {
        'X-Usuario': 'p-carla'
      }
    }
  );

  const certificados = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.equal(certificados.length, 1);
  assert.equal(certificados[0].codigo, 'SA26-ABCD-EFGH');
});

test('Interface M4 verifica certificado publicamente usando API falsa', async () => {
  const fakeFetch = async (url) => {
    assert.ok(url.includes('/certificados/sa26-abcd-efgh'));

    return {
      ok: true,
      status: 200,
      json: async () => ({
        codigo: 'SA26-ABCD-EFGH',
        participante: 'Carla M. S.',
        atividade: 'Flutter do zero',
        cargaHorariaMinutos: 180,
        emitidoEm: '2026-10-19T22:30:00-03:00'
      })
    };
  };

  const resposta = await fakeFetch(
    'http://localhost:3000/certificados/sa26-abcd-efgh'
  );

  const certificado = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.equal(certificado.participante, 'Carla M. S.');
  assert.equal(certificado.atividade, 'Flutter do zero');
});

test('Interface M4 consulta extrato usando API falsa', async () => {
  const fakeFetch = async (url, options = {}) => {
    assert.ok(url.endsWith('/extrato'));
    assert.equal(options.headers['X-Usuario'], 'p-carla');

    return {
      ok: true,
      status: 200,
      json: async () => ({
        itens: [
          {
            atividadeId: 'atv_1a2b3c4d',
            titulo: 'Flutter do zero',
            tipo: 'minicurso',
            cargaHorariaMinutos: 180,
            codigo: null
          }
        ],
        palestrasMinutos: 0,
        minicursosMinutos: 180,
        totalMinutos: 180,
        aproveitadoMinutos: 180
      })
    };
  };

  const resposta = await fakeFetch(
    'http://localhost:3000/extrato',
    {
      headers: {
        'X-Usuario': 'p-carla'
      }
    }
  );

  const extrato = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.equal(extrato.totalMinutos, 180);
  assert.equal(extrato.aproveitadoMinutos, 180);
  assert.equal(extrato.itens.length, 1);
});