import React, { useEffect, useState } from 'react';

const API = 'http://localhost:3000';

export function CertificadosTela({ usuarioId }) {
  const [aba, setAba] = useState('certificados');
  const [certificados, setCertificados] = useState([]);
  const [extrato, setExtrato] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [verificacao, setVerificacao] = useState(null);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    setErro(null);

    try {
      const [resCertificados, resExtrato] = await Promise.all([
        fetch(`${API}/certificados`, {
          headers: { 'X-Usuario': usuarioId }
        }),
        fetch(`${API}/extrato`, {
          headers: { 'X-Usuario': usuarioId }
        })
      ]);

      if (!resCertificados.ok || !resExtrato.ok) {
        throw new Error('Erro ao carregar certificados');
      }

      setCertificados(await resCertificados.json());
      setExtrato(await resExtrato.json());
    } catch {
      setErro('Falha ao carregar dados do M4.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [usuarioId]);

  async function emitir(atividadeId) {
    setErro(null);

    const res = await fetch(
      `${API}/atividades/${atividadeId}/certificado`,
      {
        method: 'POST',
        headers: { 'X-Usuario': usuarioId }
      }
    );

    const body = await res.json();

    if (!res.ok) {
      setErro(body.erro || 'Erro ao emitir certificado');
      return;
    }

    await carregar();
    setAba('certificados');
  }

  async function verificar(e) {
    e.preventDefault();
    setErro(null);
    setVerificacao(null);

    const res = await fetch(
      `${API}/certificados/${encodeURIComponent(codigo.trim())}`
    );

    const body = await res.json();

    if (!res.ok) {
      setErro(body.erro || 'Certificado não encontrado');
      return;
    }

    setVerificacao(body);
  }

  if (loading) {
    return <div className="card">Carregando...</div>;
  }

  return (
    <div className="card">
      <h2>Certificados e Horas Complementares</h2>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={aba === 'certificados' ? 'primary' : ''}
          onClick={() => setAba('certificados')}
        >
          Meus certificados
        </button>

        <button
          className={aba === 'extrato' ? 'primary' : ''}
          onClick={() => setAba('extrato')}
        >
          Extrato de horas
        </button>

        <button
          className={aba === 'verificar' ? 'primary' : ''}
          onClick={() => setAba('verificar')}
        >
          Verificar certificado
        </button>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      {aba === 'certificados' && (
        <div>
          <h3>Meus certificados</h3>

          {certificados.length === 0 ? (
            <p>Nenhum certificado emitido.</p>
          ) : (
            certificados.map(cert => (
              <div
                key={cert.codigo}
                className="card"
                style={{ border: '1px solid #cbd5e1', marginTop: '1rem' }}
              >
                <strong>{cert.codigo}</strong>
                <span>Atividade: {cert.atividadeId}</span>
                <span>Carga horária: {cert.cargaHorariaMinutos} minutos</span>
                <span>Presenças: {cert.presencas}/{cert.encontros}</span>
              </div>
            ))
          )}
        </div>
      )}

      {aba === 'extrato' && extrato && (
        <div>
          <h3>Extrato de horas</h3>

          <p>Palestras: <strong>{extrato.palestrasMinutos} min</strong></p>
          <p>Minicursos: <strong>{extrato.minicursosMinutos} min</strong></p>
          <p>Total bruto: <strong>{extrato.totalMinutos} min</strong></p>
          <p>Total aproveitado: <strong>{extrato.aproveitadoMinutos} min</strong></p>

          {extrato.itens.map(item => (
            <div
              key={item.atividadeId}
              className="card"
              style={{ border: '1px solid #cbd5e1', marginTop: '1rem' }}
            >
              <strong>{item.titulo}</strong>
              <span>{item.cargaHorariaMinutos} minutos</span>

              {item.codigo ? (
                <span>Certificado: {item.codigo}</span>
              ) : (
                <button
                  className="primary"
                  onClick={() => emitir(item.atividadeId)}
                >
                  Emitir certificado
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {aba === 'verificar' && (
        <div>
          <h3>Verificação pública</h3>

          <form onSubmit={verificar}>
            <div className="form-group">
              <label>Código do certificado</label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="SA26-XXXX-XXXX"
              />
            </div>

            <button
              type="submit"
              className="primary"
              style={{ marginTop: '1rem' }}
            >
              Verificar
            </button>
          </form>

          {verificacao && (
            <div
              className="card"
              style={{ border: '1px solid #cbd5e1', marginTop: '1rem' }}
            >
              <h3>Certificado válido</h3>
              <p>Participante: <strong>{verificacao.participante}</strong></p>
              <p>Atividade: {verificacao.atividade}</p>
              <p>Carga horária: {verificacao.cargaHorariaMinutos} minutos</p>
              <p>Código: {verificacao.codigo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}