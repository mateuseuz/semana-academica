import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import {
  formatarDataISO,
  formatarHoraISO,
  formatarDuracao,
  getTipoLabel,
  getSituacaoLabel,
  getSituacaoClass,
} from '../utils/dateUtils';
import './DetalheAtividadeModal.css';

export default function DetalheAtividadeModal({ atividadeId, onClose }) {
  const [atv, setAtv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salaInfo, setSalaInfo] = useState(null);

  useEffect(() => {
    async function carregarDetalhes() {
      try {
        setError(null);
        const [atividade, salas] = await Promise.all([
          apiService.getAtividadeById(atividadeId),
          apiService.getSalas(),
        ]);
        setAtv(atividade);
        const sala = salas.find((s) => s.id === atividade.salaId);
        setSalaInfo(sala || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    carregarDetalhes();
  }, [atividadeId]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Carregando detalhes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="error-message">
            Erro ao carregar detalhes: {error}
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ marginLeft: '1rem' }}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!atv) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{atv.titulo}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="detalhe-info">
          <div className="detalhe-row">
            <span className="detalhe-label">Tipo:</span>
            <span className={`tipo-badge tipo-${atv.tipo}`}>
              {getTipoLabel(atv.tipo)}
            </span>
          </div>

          <div className="detalhe-row">
            <span className="detalhe-label">Situação:</span>
            <span className={`situacao-badge ${getSituacaoClass(atv.situacao)}`}>
              {getSituacaoLabel(atv.situacao)}
            </span>
          </div>

          <div className="detalhe-row">
            <span className="detalhe-label">Sala:</span>
            <span>
              {salaInfo ? `${salaInfo.nome} (Capacidade: ${salaInfo.capacidade})` : atv.salaId}
            </span>
          </div>

          <div className="detalhe-row">
            <span className="detalhe-label">Carga Horária:</span>
            <span>{formatarDuracao(atv.cargaHorariaMinutos)}</span>
          </div>

          <div className="detalhe-row">
            <span className="detalhe-label">Vagas:</span>
            <span>
              {atv.vagasRestantes} de {atv.vagas} disponíveis
              {atv.emEspera > 0 && ` • ${atv.emEspera} na lista de espera`}
            </span>
          </div>

          <h3 className="encontros-titulo">Encontros</h3>
          <div className="encontros-lista">
            {atv.encontros.map((encontro) => (
              <div key={encontro.id} className="encontro-card">
                <div className="encontro-datetime">
                  <span className="encontro-data">{formatarDataISO(encontro.inicio)}</span>
                  <span className="encontro-horario">
                    {formatarHoraISO(encontro.inicio)} — {formatarHoraISO(encontro.fim)}
                  </span>
                </div>
                <div className="encontro-duracao">
                  {formatarDuracao(
                    (new Date(encontro.fim) - new Date(encontro.inicio)) / 60000
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="detalhe-rodape">
            <span className="atv-id">ID: {atv.id}</span>
          </div>
        </div>

        <div className="modal-acoes">
          <button className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
