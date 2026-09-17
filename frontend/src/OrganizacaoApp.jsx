import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function OrganizacaoApp() {
  const [encontroId, setEncontroId] = useState('enc_5e6f7a8b');
  const [usuarioId, setUsuarioId] = useState('org-ana');
  const [codigoData, setCodigoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const buscarCodigo = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/encontros/${encontroId}/codigo`, {
        headers: {
          'X-Usuario': usuarioId
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro || 'ERRO_DESCONHECIDO');
        setCodigoData(null);
      } else {
        setCodigoData(data);
      }
    } catch (err) {
      setErro('FALHA_CONEXAO');
      setCodigoData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarCodigo();
    const interval = setInterval(buscarCodigo, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [encontroId, usuarioId]);

  return (
    <div className="container">
      <header>
        <div>
          <h1>Semana Acadêmica — M3 Organização</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Exibição de QR Code do Encontro</p>
        </div>
        <div>
          <a href="/participante.html" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            Ir para Tela do Participante →
          </a>
        </div>
      </header>

      <div className="card">
        <h2>Painel da Organização</h2>
        <p>O QR Code gerado abaixo muda a cada minuto e deve ser exibido na sala para os participantes escanearem com o celular.</p>
        
        <div className="form-grid">
          <div className="form-group">
            <label>ID do Encontro:</label>
            <input 
              type="text" 
              value={encontroId} 
              onChange={(e) => setEncontroId(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Usuário Organização (X-Usuario):</label>
            <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
              <option value="org-ana">Ana Beatriz Lima (org-ana)</option>
              <option value="org-bruno">Bruno Tavares (org-bruno)</option>
            </select>
          </div>
        </div>

        <button className="primary" onClick={buscarCodigo} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar Código Agora'}
        </button>
      </div>

      {erro && (
        <div className="alert alert-error">
          <strong>Erro:</strong> {erro} (Verifique se está dentro da janela de registro do encontro).
        </div>
      )}

      {codigoData && (
        <div className="qr-display">
          <h3>Encontro: {codigoData.encontroId}</h3>
          
          <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', display: 'inline-block', maxWidth: '100%', boxSizing: 'border-box' }}>
            <QRCodeSVG 
              value={codigoData.codigo} 
              size={220} 
              level="H"
              includeMargin={true}
              style={{ width: '100%', height: 'auto', maxWidth: '240px' }}
            />
          </div>

          <div className="qr-code-text">
            {codigoData.codigo}
          </div>

          <div>
            <p style={{ margin: '0.25rem 0' }}><strong>Troca em:</strong> {new Date(codigoData.trocaEm).toLocaleTimeString()}</p>
            <p style={{ margin: '0.25rem 0' }}><strong>Válido até:</strong> {new Date(codigoData.validoAte).toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
