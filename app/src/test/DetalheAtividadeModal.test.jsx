import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DetalheAtividadeModal from '../components/DetalheAtividadeModal';
import { apiService } from '../services/api';

vi.mock('../services/api', () => ({
  apiService: {
    getAtividadeById: vi.fn(),
    getSalas: vi.fn(),
  },
  setDefaultUser: vi.fn(),
}));

const mockAtividade = {
  id: 'atv_001',
  titulo: 'Palestra de Abertura',
  tipo: 'palestra',
  salaId: 'auditorio',
  vagas: 200,
  encontros: [
    { id: 'enc_001', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' },
  ],
  cargaHorariaMinutos: 180,
  situacao: 'prevista',
  ocupadas: 50,
  vagasRestantes: 150,
  emEspera: 0,
};

const mockSalas = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
];

const mockAtividadeComDoisEncontros = {
  ...mockAtividade,
  id: 'atv_002',
  titulo: 'Minicurso de React',
  tipo: 'minicurso',
  encontros: [
    { id: 'enc_002', inicio: '2026-10-20T14:00:00-03:00', fim: '2026-10-20T17:00:00-03:00' },
    { id: 'enc_003', inicio: '2026-10-20T18:00:00-03:00', fim: '2026-10-20T21:00:00-03:00' },
  ],
  cargaHorariaMinutos: 360,
  situacao: 'prevista',
  vagasRestantes: 10,
  emEspera: 2,
};

function renderModal(atividadeId = 'atv_001', atividade = mockAtividade, salas = mockSalas) {
  apiService.getAtividadeById.mockResolvedValue(atividade);
  apiService.getSalas.mockResolvedValue(salas);

  return render(
    <DetalheAtividadeModal
      atividadeId={atividadeId}
      onClose={vi.fn()}
    />
  );
}

describe('DetalheAtividadeModal - Renderização e Detalhes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe estado de carregamento inicial', () => {
    apiService.getAtividadeById.mockResolvedValue(mockAtividade);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderModal();

    expect(screen.getByText('Carregando detalhes...')).toBeInTheDocument();
  });

  it('exibe os detalhes da atividade após carregar', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Palestra de Abertura')).toBeInTheDocument();
    });
  });

  it('exibe o tipo da atividade com badge correto', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Palestra')).toBeInTheDocument();
    });
  });

  it('exibe a situação da atividade', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Prevista')).toBeInTheDocument();
    });
  });

  it('exibe informações da sala', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Auditório Central (Capacidade: 200)')).toBeInTheDocument();
    });
  });

  it('exibe a carga horária formatada', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('3h')).toBeInTheDocument();
    });
  });

  it('exibe vagas disponíveis', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('150 de 200 disponíveis')).toBeInTheDocument();
    });
  });

  it('exibe lista de encontros com data e horário', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('19/10/2026')).toBeInTheDocument();
      expect(screen.getByText('19:00 — 22:00')).toBeInTheDocument();
    });
  });

  it('exibe duração do encontro', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('3h')).toBeInTheDocument();
    });
  });

  it('exibe ID da atividade no rodapé', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('ID: atv_001')).toBeInTheDocument();
    });
  });
});

describe('DetalheAtividadeModal - Múltiplos Encontros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe lista com múltiplos encontros', async () => {
    renderModal('atv_002', mockAtividadeComDoisEncontros);

    await waitFor(() => {
      expect(screen.getByText('14:00 — 17:00')).toBeInTheDocument();
      expect(screen.getByText('19:00 — 22:00')).toBeInTheDocument();
    });
  });
});

describe('DetalheAtividadeModal - Estados de Erro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe mensagem de erro quando a API falha ao buscar atividade', async () => {
    apiService.getAtividadeById.mockRejectedValue(new Error('Atividade não encontrada'));
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar detalhes/)).toBeInTheDocument();
    });
  });

  it('exibe botão Fechar no estado de erro', async () => {
    apiService.getAtividadeById.mockRejectedValue(new Error('Erro'));
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Fechar')).toBeInTheDocument();
    });
  });
});

describe('DetalheAtividadeModal - Lista de Espera', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe quantidade na lista de espera quando há emEspera > 0', async () => {
    const atvComEspera = { ...mockAtividade, emEspera: 3 };
    renderModal('atv_espera', atvComEspera);

    await waitFor(() => {
      expect(screen.getByText(/3 na lista de espera/)).toBeInTheDocument();
    });
  });

  it('não exibe lista de espera quando emEspera é 0', async () => {
    renderModal();

    await waitFor(() => {
      const texto = screen.getByText('150 de 200 disponíveis');
      expect(texto).toBeInTheDocument();
      expect(texto.textContent).not.toContain('lista de espera');
    });
  });
});
