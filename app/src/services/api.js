const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DEFAULT_USER = 'org-ana';

let currentDefaultUser = DEFAULT_USER;

export function setDefaultUser(user) {
  currentDefaultUser = user;
}

async function request(method, path, body = null, usuario = currentDefaultUser) {
  const headers = { 'Content-Type': 'application/json' };
  if (usuario) headers['X-Usuario'] = usuario;

  const options = { method, headers };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const url = `${API_BASE}${path}`;
  const response = await fetch(url, options);

  let data;
  try {
    data = await response.json();
  } catch {
    data = { erro: 'ERRO_DESCONHECIDO', mensagem: 'Resposta inválida do servidor' };
  }

  if (!response.ok) {
    const error = new Error(data.mensagem || 'Erro desconhecido');
    error.code = data.erro;
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export const apiService = {
  getSalas: () => request('GET', '/salas'),

  getAtividades: (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.dia) params.set('dia', filtros.dia);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    const queryString = params.toString();
    return request('GET', `/atividades${queryString ? '?' + queryString : ''}`);
  },

  getAtividadeById: (id) => request('GET', `/atividades/${id}`),

  criarAtividade: (data) => request('POST', '/atividades', data),

  atualizarAtividade: (id, data) => request('PATCH', `/atividades/${id}`, data),

  cancelarAtividade: (id) => request('POST', `/atividades/${id}/cancelamento`),
};
