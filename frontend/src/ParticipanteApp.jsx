import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { InscricoesTela } from './components/InscricoesTela';
import { CertificadosTela } from './components/CertificadosTela';

export default function ParticipanteApp() {
  const [encontroId, setEncontroId] = useState('enc_5e6f7a8b');
  const [usuarioId, setUsuarioId] = useState('p-carla');
  const [view, setView] = useState('presenca'); // 'presenca' | 'inscricoes' | 'certificados'
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('m3_offline_queue');
    if (stored) {
      try {
        setOfflineQueue(JSON.parse(stored));
      } catch (e) {
        setOfflineQueue([]);
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      sincronizarFila();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let scanner = null;
    if (scannerAtivo) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (decodedText) => {
          setCodigo(decodedText.trim().toUpperCase());
          setScannerAtivo(false);
          scanner.clear().catch(console.error);
        },
        (errorMessage) => {
          // scanning error or no qr code found in frame
        }
      );
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scannerAtivo]);

  const salvarFilaOffline = (novaFila) => {
    setOfflineQueue(novaFila);
    localStorage.setItem('m3_offline_queue', JSON.stringify(novaFila));
  };

  const sincronizarFila = async () => {
    const stored = localStorage.getItem('m3_offline_queue');
    if (!stored) return;
    const fila = JSON.parse(stored);
    if (fila.length === 0) return;

    const novaFila = [];
    for (const item of fila) {
      try {
        const res = await fetch(`/encontros/${item.encontroId}/presencas`, {
          method: 'POST',
          headers: {
            'X-Usuario': item.usuarioId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            codigo: item.codigo,
            lidoEm: item.lidoEm
          })
        });
        if (!res.ok) {
          const data = await res.json();
          if (data.erro === 'SINCRONIZACAO_TARDIA') {
            console.warn('Sincronização tardia rejeitada');
          } else {
            novaFila.push(item);
          }
        }
      } catch (e) {
        novaFila.push(item);
      }
    }
    salvarFilaOffline(novaFila);
    if (novaFila.length === 0) {
      setMensagem('Todas as presenças offline foram sincronizadas com sucesso!');
    }
  };

  const enviarPresenca = async (codigoParaEnviar) => {
    const cod = (codigoParaEnviar || codigo).trim().toUpperCase();
    if (!cod) {
      setErro('Informe ou escaneie o código do encontro.');
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);

    const lidoEmTimestamp = new Date().toISOString();

    if (!isOnline) {
      const newItem = {
        encontroId,
        usuarioId,
        codigo: cod,
        lidoEm: lidoEmTimestamp
      };
      salvarFilaOffline([...offlineQueue, newItem]);
      setMensagem('Sem conexão! Presença armazenada localmente (offline) e será sincronizada quando a rede retornar.');
      setCodigo('');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/encontros/${encontroId}/presencas`, {
        method: 'POST',
        headers: {
          'X-Usuario': usuarioId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          codigo: cod
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'ERRO_REGISTRO');
      } else {
        const tipo = res.status === 201 ? 'registrada com sucesso (201)' : 'já registrada anteriormente (200 - idempotente)';
        setMensagem(`Presença ${tipo}! ID: ${data.id} (Origem: ${data.origem})`);
        setCodigo('');
      }
    } catch (err) {
      const newItem = {
        encontroId,
        usuarioId,
        codigo: cod,
        lidoEm: lidoEmTimestamp
      };
      salvarFilaOffline([...offlineQueue, newItem]);
      setMensagem('Falha de rede. Presença armazenada offline com sucesso.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmeter = (e) => {
    e.preventDefault();
    enviarPresenca(codigo);
  };

  return (
    <div className="container">
      <header>
        <div>
          <h1>Semana Acadêmica — M3 Participante</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
           <button onClick={() => setView('presenca')} className={view === 'presenca' ? 'primary' : ''}>
  Presença
</button>

<button onClick={() => setView('inscricoes')} className={view === 'inscricoes' ? 'primary' : ''}>
  Inscrições
</button>

<button onClick={() => setView('certificados')} className={view === 'certificados' ? 'primary' : ''}>
  Certificados
</button>
          </div>
        </div>
        <div>
          <a href="/index.html" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            ← Ir para Painel da Organização
          </a>
        </div>
      </header>

      {view === 'presenca' ? (
        <div className="card">
          <h2>Registro de Presença</h2>
          <p>Aponte a câmera do celular para escanear o QR Code exibido pelo palestrante ou digite o código manualmente.</p>

          <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <span className={`status-badge ${isOnline ? 'status-online' : 'status-offline'}`}>
              {isOnline ? '🟢 Conectado (Online)' : '🔴 Desconectado (Offline)'}
            </span>
            {offlineQueue.length > 0 && (
              <span style={{ fontWeight: 600, color: '#d97706', fontSize: '0.875rem' }}>
                ⚠️ {offlineQueue.length} pendente(s) de sincronização.
              </span>
            )}
          </div>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>ID do Encontro:</label>
              <input 
                type="text" 
                value={encontroId} 
                onChange={(e) => setEncontroId(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Participante (X-Usuario):</label>
              <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
                <option value="p-carla">Carla Mendes Souza (p-carla - Inscrita)</option>
                <option value="p-diego">Diego Alves (p-diego - Não inscrito)</option>
                <option value="p-elisa">Elisa Fernandes (p-elisa)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setScannerAtivo(!scannerAtivo)} 
              style={{ backgroundColor: scannerAtivo ? '#dc2626' : '#0284c7', color: 'white' }}
            >
              {scannerAtivo ? '✕ Fechar Câmera / Leitor' : '📷 Ler QR Code com a Câmera'}
            </button>
          </div>

          {scannerAtivo && (
            <div style={{ margin: '1rem 0', padding: '1rem', border: '2px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
              <div id="reader" style={{ width: '100%' }}></div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'center' }}>
                Centralize o QR Code na câmera do seu smartphone ou computador.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmeter}>
            <div className="form-group">
              <label>Código do Encontro (6 caracteres):</label>
              <input 
                type="text" 
                placeholder="Ex: K7M2QX" 
                value={codigo} 
                maxLength={6}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())} 
                style={{ fontSize: '1.5rem', fontFamily: 'monospace', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Enviando...' : (isOnline ? 'Confirmar Presença' : 'Registrar Offline')}
            </button>
          </form>
        </div>
      ) : view === 'inscricoes' ? (
  <InscricoesTela usuarioId={usuarioId} />
) : (
  <CertificadosTela usuarioId={usuarioId} />
)}

      {mensagem && (
        <div className="alert alert-success">
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="alert alert-error">
          <strong>Erro ao registrar presença:</strong> {erro}
        </div>
      )}

      {offlineQueue.length > 0 && isOnline && (
        <div className="card" style={{ background: '#fffbeb' }}>
          <h3>Fila de Sincronização Offline</h3>
          <p>Existem presenças salvas offline aguardando envio automático.</p>
          <button onClick={sincronizarFila}>Sincronizar Agora</button>
        </div>
      )}
    </div>
  );
}
