import React, { useState, useEffect } from 'react';

export function InscricoesTela({ usuarioId }) {
  const [atividades, setAtividades] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [usuarioId]);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      // Usando a URL completa para contornar problemas de proxy do Vite durante o dev
      const [resAtv, resIns] = await Promise.all([
        fetch('http://localhost:3000/atividades', { headers: { 'X-Usuario': usuarioId } }),
        fetch('http://localhost:3000/inscricoes', { headers: { 'X-Usuario': usuarioId } })
      ]);

      if (!resAtv.ok || !resIns.ok) throw new Error('Erro ao carregar dados');

      const dataAtv = await resAtv.json();
      const dataIns = await resIns.json();

      setAtividades(dataAtv);
      setInscricoes(dataIns);
    } catch (err) {
      setErro('Falha ao carregar atividades ou inscrições.');
    } finally {
      setLoading(false);
    }
  };

  const realizarAcao = async (url, method = 'POST') => {
    try {
      const res = await fetch(`http://localhost:3000${url}`, {
        method,
        headers: { 'X-Usuario': usuarioId, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Falha na operação');
      carregarDados();
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="card">
      <h2>Inscrições em Atividades</h2>
      {erro && <div className="alert alert-error">{erro}</div>}
      
      <div style={{ display: 'grid', gap: '1rem' }}>
        {atividades.map(atv => {
          const inscricao = inscricoes.find(ins => ins.atividadeId === atv.id);
          return (
            <div key={atv.id} className="card" style={{ border: '1px solid #cbd5e1', padding: '1rem' }}>
              <h3>{atv.titulo}</h3>
              <p>Tipo: {atv.tipo} | Vagas: {atv.vagasRestantes}/{atv.vagas}</p>
              
              {!inscricao && (
                <button 
                  className="primary" 
                  onClick={() => realizarAcao(`/atividades/${atv.id}/inscricoes`)}
                >
                  Inscrever-se
                </button>
              )}
              {inscricao?.status === 'confirmada' && <span className="status-badge">Confirmada</span>}
              {inscricao?.status === 'em_espera' && <span>Em espera (Posição: {inscricao.posicaoNaEspera})</span>}
              {(inscricao?.status === 'confirmada' || inscricao?.status === 'em_espera') && (
                <button 
                  onClick={() => realizarAcao(`/inscricoes/${inscricao.id}/cancelamento`)}
                  style={{ backgroundColor: '#dc2626', color: 'white', marginLeft: '0.5rem' }}
                >
                  Cancelar
                </button>
              )}
              {inscricao?.status === 'convocada' && (
                <button 
                  className="primary"
                  onClick={() => realizarAcao(`/inscricoes/${inscricao.id}/confirmacao`)}
                >
                  Confirmar Convocação
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
