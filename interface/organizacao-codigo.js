export async function renderizarPainelOrganizacaoCodigo({ encontroId, usuarioId, fetchImpl = fetch }) {
  const res = await fetchImpl(`/encontros/${encontroId}/codigo`, {
    headers: {
      'X-Usuario': usuarioId
    }
  });

  const body = await res.json();

  if (!res.ok) {
    return {
      encontroId,
      codigo: null,
      trocaEm: null,
      validoAte: null,
      erro: body.erro
    };
  }

  return {
    encontroId: body.encontroId,
    codigo: body.codigo,
    trocaEm: body.trocaEm,
    validoAte: body.validoAte,
    erro: null
  };
}
