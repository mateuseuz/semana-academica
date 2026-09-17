import { vi } from 'vitest';

export function createMockActivity(overrides = {}) {
  return {
    id: 'atv_test001',
    titulo: 'Test Activity',
    tipo: 'palestra',
    salaId: 'lab-3',
    vagas: 10,
    encontros: [
      { id: 'enc_test001', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
    ],
    cargaHorariaMinutos: 180,
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: 10,
    emEspera: 0,
    ...overrides,
  };
}

export function mockApiSuccess(data) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

export function mockApiError(code, message, status = 422) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ erro: code, mensagem: message }),
  });
}

export function mockNetworkError() {
  return vi.fn().mockRejectedValue(new Error('Network error'));
}
