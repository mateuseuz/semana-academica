import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

export function useAtividades() {
  const [atividades, setAtividades] = useState([]);
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarAtividades = useCallback(async (filtros = {}) => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiService.getAtividades(filtros);
      setAtividades(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarSalas = useCallback(async () => {
    try {
      const data = await apiService.getSalas();
      setSalas(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    carregarAtividades();
    carregarSalas();
  }, [carregarAtividades, carregarSalas]);

  const criar = async (dados) => {
    const result = await apiService.criarAtividade(dados);
    await carregarAtividades();
    return result;
  };

  const atualizar = async (id, dados) => {
    const result = await apiService.atualizarAtividade(id, dados);
    await carregarAtividades();
    return result;
  };

  const cancelar = async (id) => {
    const result = await apiService.cancelarAtividade(id);
    await carregarAtividades();
    return result;
  };

  return {
    atividades,
    salas,
    loading,
    error,
    criar,
    atualizar,
    cancelar,
    recarregar: () => carregarAtividades(),
  };
}
