import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { formatarDataISO, formatarHoraISO, getTipoLabel } from '../utils/dateUtils';
import './FormAtividadeModal.css';

const TIPOS = ['palestra', 'minicurso'];

export default function FormAtividadeModal({ onSuccess, onClose }) {
  const { id: routeId } = useParams();
  const atividadeId = routeId || null;
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: '',
    salaId: '',
    vagas: '',
    encontros: [
      { inicio: '', fim: '' },
    ],
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [apiCode, setApiCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salas, setSalas] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const isEdit = !!atividadeId;

  const loadSalas = async () => {
    try {
      const data = await apiService.getSalas();
      setSalas(data);
    } catch (err) {
      setApiError('Erro ao carregar salas.');
    }
  };

  const loadAtividade = async () => {
    if (!atividadeId) return;
    try {
      const data = await apiService.getAtividadeById(atividadeId);
      setFormData({
        titulo: data.titulo,
        tipo: data.tipo,
        salaId: data.salaId,
        vagas: data.vagas,
        encontros: data.encontros.map((e) => ({
          inicio: e.inicio.slice(0, 16),
          fim: e.fim.slice(0, 16),
        })),
      });
    } catch (err) {
      setApiError('Erro ao carregar atividade.');
    }
  };

  useEffect(() => {
    if (isEdit && atividadeId) {
      loadAtividade();
    }
  }, [isEdit, atividadeId]);

  useEffect(() => {
    loadSalas();
  }, []);

  const addEncontro = () => {
    setFormData((prev) => ({
      ...prev,
      encontros: [...prev.encontros, { inicio: '', fim: '' }],
    }));
  };

  const removeEncontro = (index) => {
    if (formData.encontros.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      encontros: prev.encontros.filter((_, i) => i !== index),
    }));
  };

  const updateEncontro = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      encontros: prev.encontros.map((e, i) =>
        i === index ? { ...e, [field]: value } : e
      ),
    }));
    // Clear field error when user types
    if (errors[`encontro_${index}_${field}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`encontro_${index}_${field}`];
        return next;
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }
    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
    }
    if (!formData.salaId) {
      newErrors.salaId = 'Sala é obrigatória';
    }
    if (!formData.vagas || parseInt(formData.vagas) < 1) {
      newErrors.vagas = 'Vagas deve ser maior que 0';
    }
    if (formData.encontros.length < 1) {
      newErrors.encontros = 'Peloo menos 1 encontro é necessário';
    }

    formData.encontros.forEach((e, i) => {
      if (!e.inicio || !e.fim) {
        newErrors[`encontro_${i}_horario`] = 'Data e hora são obrigatórias';
      } else if (new Date(e.inicio) >= new Date(e.fim)) {
        newErrors[`encontro_${i}_horario`] = 'Hora de início deve ser menor que hora de fim';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setApiCode(null);

    if (!validateForm()) return;

    setSubmitted(true);
    setLoading(true);
    try {
      const encontros = formData.encontros.map((e) => ({
        inicio: new Date(e.inicio).toISOString(),
        fim: new Date(e.fim).toISOString(),
      }));

      if (isEdit) {
        await apiService.atualizarAtividade(atividadeId, {
          titulo: formData.titulo,
          vagas: parseInt(formData.vagas),
        });
        setSubmitted(true);
        onSuccess?.();
      } else {
        const result = await apiService.criarAtividade({
          titulo: formData.titulo,
          tipo: formData.tipo,
          salaId: formData.salaId,
          vagas: parseInt(formData.vagas),
          encontros,
        });
        setSubmitted(true);
        onSuccess?.();
      }
    } catch (err) {
      setApiError(err.message || 'Erro ao salvar atividade');
      setApiCode(err.code || null);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      titulo: '',
      tipo: '',
      salaId: '',
      vagas: '',
      encontros: [{ inicio: '', fim: '' }],
    });
    setErrors({});
    setApiError(null);
    setApiCode(null);
    setSubmitted(false);
    onClose?.();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Atividade' : 'Cadastrar Nova Atividade'}</h2>
          <button className="modal-close" onClick={handleClose}>
            &times;
          </button>
        </div>

        {submitted && !apiError && (
          <div className="success-message">
            {isEdit ? 'Atividade atualizada com sucesso!' : 'Atividade criada com sucesso!'}
          </div>
        )}

        {apiError && (
          <div className="error-message">
            <strong>Erro da API ({apiCode}):</strong> {apiError}
          </div>
        )}

        {!isEdit && !submitted && (
          <>
            <div className="form-info">
              <p>
                <strong>Palestra:</strong> exatamente 1 encontro
              </p>
              <p>
                <strong>Minicurso:</strong> de 2 a 5 encontros
              </p>
              <p>
                <strong>Período:</strong> 19/10/2026 a 23/10/2026
              </p>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="form-atividade">
          <div className="form-group">
            <label htmlFor="titulo">Título *</label>
            <input
              id="titulo"
              type="text"
              value={formData.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
              placeholder="Nome da atividade"
              className={errors.titulo ? 'input-error' : ''}
            />
            {errors.titulo && <span className="form-field-error">{errors.titulo}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="tipo">Tipo *</label>
            <select
              id="tipo"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              className={errors.tipo ? 'input-error' : ''}
            >
              <option value="">Selecione o tipo</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {getTipoLabel(t)}
                </option>
              ))}
            </select>
            {errors.tipo && <span className="form-field-error">{errors.tipo}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="salaId">Sala *</label>
            <select
              id="salaId"
              value={formData.salaId}
              onChange={(e) => handleChange('salaId', e.target.value)}
              className={errors.salaId ? 'input-error' : ''}
            >
              <option value="">Selecione a sala</option>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} (capacidade: {s.capacidade})
                </option>
              ))}
            </select>
            {errors.salaId && <span className="form-field-error">{errors.salaId}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="vagas">Vagas *</label>
            <input
              id="vagas"
              type="number"
              min="1"
              value={formData.vagas}
              onChange={(e) => handleChange('vagas', e.target.value)}
              placeholder="Quantidade de vagas"
              className={errors.vagas ? 'input-error' : ''}
            />
            {errors.vagas && <span className="form-field-error">{errors.vagas}</span>}
          </div>

          <div className="form-group encontros-group">
            <label>Encontros *</label>
            {formData.encontros.map((encontro, index) => (
              <div key={index} className="encontro-form-row">
                <div className="encontro-fields">
                  <div className="field-half">
                    <label htmlFor={`inicio-${index}`}>Início</label>
                    <input
                      id={`inicio-${index}`}
                      type="datetime-local"
                      value={encontro.inicio}
                      onChange={(e) =>
                        updateEncontro(index, 'inicio', e.target.value)
                      }
                      className={errors[`encontro_${index}_horario`] ? 'input-error' : ''}
                    />
                  </div>
                  <div className="field-half">
                    <label htmlFor={`fim-${index}`}>Fim</label>
                    <input
                      id={`fim-${index}`}
                      type="datetime-local"
                      value={encontro.fim}
                      onChange={(e) =>
                        updateEncontro(index, 'fim', e.target.value)
                      }
                      className={errors[`encontro_${index}_horario`] ? 'input-error' : ''}
                    />
                  </div>
                </div>
                {formData.encontros.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm remover-encontro"
                    onClick={() => removeEncontro(index)}
                  >
                    Remover
                  </button>
                )}
                {errors[`encontro_${index}_horario`] && (
                  <span className="form-field-error">{errors[`encontro_${index}_horario`]}</span>
                )}
              </div>
            ))}
            {!isEdit && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addEncontro}
                style={{ marginTop: '0.5rem' }}
              >
                + Adicionar Encontro
              </button>
            )}
            {errors.encontros && (
              <span className="form-field-error">{errors.encontros}</span>
            )}
          </div>

          <div className="modal-acoes">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar Alterações' : 'Cadastrar Atividade')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
