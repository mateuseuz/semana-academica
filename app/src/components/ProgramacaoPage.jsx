import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtividades } from '../hooks/useAtividades';
import { agruparPorData, formatarDataISO, getTipoLabel, getSituacaoLabel, getSituacaoClass, formatarDuracao } from '../utils/dateUtils';
import DetalheAtividadeModal from './DetalheAtividadeModal';
import './ProgramacaoPage.css';

export default function ProgramacaoPage() {
  const { atividades, loading, error, cancelar } = useAtividades();
  const navigate = useNavigate();
  const [filtroTipo, setFiltroTipo] = useState('');
  const [detalheId, setDetalheId] = useState(null);

  const grouped = agruparPorData(atividades);

  const tipos = ['palestra', 'minicurso'];

  const atividadesFiltradas = filtroTipo
    ? atividades.filter((a) => a.tipo === filtroTipo)
    : atividades;

  const handleDetalhe = (id) => setDetalheId(id);

  const handleCloseDetalhe = () => setDetalheId(null);

  const handleCancelar = async (id) => {
    if (window.confirm('Tem certeza que deseja cancelar esta atividade?')) {
      try {
        await cancelar(id);
      } catch (err) {
        alert(`Erro ao cancelar: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="loading">Carregando grade de atividades...</div>;
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Erro ao carregar atividades: {error}</p>
        <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="programacao-page">
      <div className="filtros">
        <label htmlFor="tipo-filtro">Filtrar por tipo:</label>
        <select
          id="tipo-filtro"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {getTipoLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <p className="total-count">{atividadesFiltradas.length} atividade(s) encontrada(s)</p>

      {Object.keys(grouped).length === 0 ? (
        <div className="loading">Nenhuma atividade encontrada para o filtro selecionado.</div>
      ) : (
        Object.entries(grouped).map(([data, atividadesDoDia]) => (
          <div key={data} className="dia-grupo">
            <h2 className="dia-titulo">{data}</h2>
            <div className="atividades-lista">
              {atividadesDoDia.map((atv) => (
                <div
                  key={atv.id}
                  className={`atividade-card ${getSituacaoClass(atv.situacao)}`}
                >
                  <div className="atividade-info" onClick={() => handleDetalhe(atv.id)}>
                    <h3>{atv.titulo}</h3>
                    <div className="atividade-meta">
                      <span className={`tipo-badge tipo-${atv.tipo}`}>
                        {getTipoLabel(atv.tipo)}
                      </span>
                      <span className="situacao-badge">
                        {getSituacaoLabel(atv.situacao)}
                      </span>
                    </div>
                    <div className="atividade-detalhes">
                      <span>{atv.encontros.length} encontro(s)</span>
                      <span>•</span>
                      <span>{formatarDuracao(atv.cargaHorariaMinutos)}</span>
                      <span>•</span>
                      <span>{atv.vagasRestantes} vaga(s) restante(s)</span>
                    </div>
                  </div>
                  <div className="atividade-acoes">
                    {atv.situacao === 'prevista' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelar(atv.id)}
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDetalhe(atv.id)}
                    >
                      Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {detalheId && (
        <DetalheAtividadeModal
          atividadeId={detalheId}
          onClose={handleCloseDetalhe}
        />
      )}
    </div>
  );
}
