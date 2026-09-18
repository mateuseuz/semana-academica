import test from 'node:test';
import assert from 'node:assert/strict';
import { renderizarPainelOrganizacaoCodigo } from '../interface/organizacao-codigo.js';

test('Interface da organização exibe o código do encontro e validade com sucesso quando a API mock retorna 200', async () => {
  const fakeFetch = async (url, options) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        encontroId: 'enc_5e6f7a8b',
        codigo: 'K7M2QX',
        trocaEm: '2026-10-19T19:01:00-03:00',
        validoAte: '2026-10-19T19:02:00-03:00'
      })
    };
  };

  const resultado = await renderizarPainelOrganizacaoCodigo({
    encontroId: 'enc_5e6f7a8b',
    usuarioId: 'org-ana',
    fetchImpl: fakeFetch
  });

  assert.equal(resultado.codigo, 'K7M2QX');
  assert.equal(resultado.encontroId, 'enc_5e6f7a8b');
  assert.equal(resultado.trocaEm, '2026-10-19T19:01:00-03:00');
  assert.equal(resultado.validoAte, '2026-10-19T19:02:00-03:00');
  assert.equal(resultado.erro, null);
});

test('Interface da organização trata erro FORA_DA_JANELA quando a API mock retorna 422', async () => {
  const fakeFetch = async (url, options) => {
    return {
      ok: false,
      status: 422,
      json: async () => ({
        erro: 'FORA_DA_JANELA',
        mensagem: 'Fora da janela de registro'
      })
    };
  };

  const resultado = await renderizarPainelOrganizacaoCodigo({
    encontroId: 'enc_5e6f7a8b',
    usuarioId: 'org-ana',
    fetchImpl: fakeFetch
  });

  assert.equal(resultado.erro, 'FORA_DA_JANELA');
  assert.equal(resultado.codigo, null);
});
