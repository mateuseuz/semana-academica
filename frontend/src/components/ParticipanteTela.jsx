import React, { useState, useEffect } from 'react';

export function ParticipanteTela() {
  const [encontroId, setEncontroId] = useState('enc_5e6f7a8b');
  const [usuarioId, setUsuarioId] = useState('p-carla');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // Load offline queue from localStorage
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
          // If sync failed due to permanent error or expired, keep or drop depending on error
          const data = await res.json();
          if (data.erro === 'SINCRONIZACAO_TARDIA') {
            console.warn('Sincronização tardia rejeitada para item offline');
          } else {
            novaFila.push(item); // retry later if transient or keep
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

  const registrarPresenca = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) {
      setErro('Informe o código do encontro.');
      return;
    }

    setLoading(true);
    setErro(null);
    setMensagem(null);

    const lidoEmTimestamp = new Date().toISOString();

    if (!isOnline) {
      // Store in offline queue
      const newItem = {
        encontroId,
        usuarioId,
        codigo: codigo.trim().toUpperCase(),
        lidoEm: lidoEmTimestamp
      };
      const novaFila = [...offlineQueue, newItem];
      salvarFilaOffline(novaFila);
      setMensagem('Sem conexão! Presença armazenada localmente (modo offline) e será sincronizada assim que a rede retornar.');
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
          codigo: codigo.trim().toUpperCase()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'ERRO_REGISTRO');
      } else {
        const tipoRegistro = res.status === 201 ? 'registrada com sucesso (201)' : 'já registrada anteriormente (200 - idempotente)';
        setMensagem(`Presença ${tipoRegistro}! ID: ${data.id} (Origem: ${data.origem})`);
        setCodigo('');
      }
    } catch (err) {
      // Fallback to offline queue if fetch throws network error
      const newItem = {
        encontroId,
        usuarioId,
        codigo: codigo.trim().toUpperCase(),
        lidoEm: lidoEmTimestamp
      };
      salvarFilaOffline([...offlineQueue, newItem]);
      setMensagem('Falha de rede detectada. Presença armazenada offline com sucesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Painel do Participante — Registro de Presença</h2>
        <p>Insira o código do QR Code exibido pela organização para registrar sua presença.</p>

        <div style={{ marginBottom: '1rem' }}>
          <span className={`status-badge ${isOnline ? 'status-online' : 'status-offline'}`}>
            {isOnline ? '🟢 Conectado (Online)' : '🔴 Desconectado (Offline)'}
          </span>
          {offlineQueue.length > 0 && (
            <span style={{ marginLeft: '1rem', fontWeight: 500, color: '#d97706' }}>
              ⚠️ {offlineQueue.length} presença(s) pendente(s) de sincronização.
            </span>
          )}
        </div>

        <form onSubmit={registrarPresenca}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

          <div className="form-group">
            <label>Código do Encontro (6 caracteres):</label>
            <input 
              type="text" 
              placeholder="Ex: K7M2QX" 
              value={codigo} 
              maxLength={6}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())} 
              style={{ fontSize: '1.5rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
            />
          </div>

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Enviando...' : (isOnline ? 'Registrar Presença' : 'Registrar Offline')}
          </button>
        </form>
      </div>

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
          <p>Existem itens aguardando sincronização com o servidor.</p>
          <button onClick={sincronizarFila}>Sincronizar Agora</button>
        </div>
      )}
    </div>
  );
}
