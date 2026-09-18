import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProgramacaoPage from '../components/ProgramacaoPage';
import { apiService } from '../services/api';

// Mock apiService
vi.mock('../services/api', () => ({
  apiService: {
    getAtividades: vi.fn(),
    getAtividadeById: vi.fn(),
    getSalas: vi.fn(),
    criarAtividade: vi.fn(),
    atualizarAtividade: vi.fn(),
    cancelarAtividade: vi.fn(),
  },
  setDefaultUser: vi.fn(),
}));

const mockAtividades = [
  {
    id: 'atv_001',
    titulo: 'Palestra de Abertura',
    tipo: 'palestra',
    salaId: 'auditorio',
    vagas: 200,
    encontros: [{ id: 'enc_001', inicio: '2026-10-19T19:00:00-03:00', fim: '2026-10-19T22:00:00-03:00' }],
    cargaHorariaMinutos: 180,
    situacao: 'prevista',
    ocupadas: 50,
    vagasRestantes: 150,
    emEspera: 0,
  },
  {
    id: 'atv_002',
    titulo: 'Minicurso de React',
    tipo: 'minicurso',
    salaId: 'sala-101',
    vagas: 40,
    encontros: [
      { id: 'enc_002', inicio: '2026-10-20T14:00:00-03:00', fim: '2026-10-20T17:00:00-03:00' },
      { id: 'enc_003', inicio: '2026-10-20T18:00:00-03:00', fim: '2026-10-20T21:00:00-03:00' },
    ],
    cargaHorariaMinutos: 360,
    situacao: 'prevista',
    ocupadas: 30,
    vagasRestantes: 10,
    emEspera: 2,
  },
  {
    id: 'atv_003',
    titulo: 'Oficina de Design',
    tipo: 'oficina',
    salaId: 'lab-3',
    vagas: 20,
    encontros: [{ id: 'enc_004', inicio: '2026-10-22T10:00:00-03:00', fim: '2026-10-22T12:00:00-03:00' }],
    cargaHorariaMinutos: 120,
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: 20,
    emEspera: 0,
  },
];

const mockSalas = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
  { id: 'sala-102', nome: 'Sala 102', capacidade: 40 },
  { id: 'lab-3', nome: 'Laboratório 3', capacidade: 20 },
];

function renderPage() {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProgramacaoPage />} />
      </Routes>
    </BrowserRouter>
  );
}

describe('ProgramacaoPage - Renderização da Lista por Dia', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('exibe estado de carregamento enquanto busca atividades', async () => {
    apiService.getAtividades.mockResolvedValue([]);
    apiService.getSalas.mockResolvedValue([]);

    renderPage();

    expect(screen.getByText('Carregando grade de atividades...')).toBeInTheDocument();
  });

  it('agrupa atividades por dia no grid', async () => {
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2026-10-19')).toBeInTheDocument();
      expect(screen.getByText('2026-10-20')).toBeInTheDocument();
      expect(screen.getByText('2026-10-22')).toBeInTheDocument();
    });
  });

  it('exibe o total de atividades', async () => {
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('3 atividade(s) encontrada(s)')).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando não há atividades', async () => {
    apiService.getAtividades.mockResolvedValue([]);
    apiService.getSalas.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nenhuma atividade encontrada para o filtro selecionado.')).toBeInTheDocument();
    });
  });

  it('exibe estado de erro quando a API falha', async () => {
    apiService.getAtividades.mockRejectedValue(new Error('Erro de rede'));
    apiService.getSalas.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar atividades/)).toBeInTheDocument();
    });
  });
});

describe('ProgramacaoPage - Filtro por Tipo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renderiza o dropdown de filtro por tipo', async () => {
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      const select = screen.getByLabelText(/Filtrar por tipo/);
      expect(select).toBeInTheDocument();
      expect(select.querySelectorAll('option')).toHaveLength(3);
    });
  });

  it('filtra atividades quando seleciona "palestra"', async () => {
    const user = userEvent.setup();
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('3 atividade(s) encontrada(s)')).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Filtrar por tipo/);
    await user.selectOptions(select, 'palestra');

    await waitFor(() => {
      expect(screen.getByText('1 atividade(s) encontrada(s)')).toBeInTheDocument();
    });

    expect(screen.getByText('Palestra de Abertura')).toBeInTheDocument();
    expect(screen.queryByText('Minicurso de React')).not.toBeInTheDocument();
  });

  it('filtra atividades quando seleciona "minicurso"', async () => {
    const user = userEvent.setup();
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('3 atividade(s) encontrada(s)')).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Filtrar por tipo/);
    await user.selectOptions(select, 'minicurso');

    await waitFor(() => {
      expect(screen.getByText('1 atividade(s) encontrada(s)')).toBeInTheDocument();
    });

    expect(screen.getByText('Minicurso de React')).toBeInTheDocument();
    expect(screen.queryByText('Palestra de Abertura')).not.toBeInTheDocument();
  });

  it('exibe todas as atividades ao selecionar "Todos"', async () => {
    const user = userEvent.setup();
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('3 atividade(s) encontrada(s)')).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Filtrar por tipo/);
    await user.selectOptions(select, '');

    await waitFor(() => {
      expect(screen.getByText('3 atividade(s) encontrada(s)')).toBeInTheDocument();
    });
  });
});

describe('ProgramacaoPage - Detalhes e Ações', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('exibe botão Detalhes para cada atividade', async () => {
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      const botoesDetalhes = screen.getAllByText('Detalhes');
      expect(botoesDetalhes).toHaveLength(3);
    });
  });

  it('exibe botão Cancelar apenas para atividades com situação "prevista"', async () => {
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      const botoesCancelar = screen.getAllByText('Cancelar');
      expect(botoesCancelar).toHaveLength(3);
    });
  });

  it('não exibe botão Cancelar para atividade com situação "em_andamento"', async () => {
    const atvEmAndamento = mockAtividades.map(a =>
      a.id === 'atv_001' ? { ...a, situacao: 'em_andamento' } : a
    );
    apiService.getAtividades.mockResolvedValue(atvEmAndamento);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });
  });

  it('exibe badge de tipo correto para cada atividade', async () => {
    apiService.getAtividades.mockResolvedValue(mockAtividades);
    apiService.getSalas.mockResolvedValue(mockSalas);

    renderPage();

    await waitFor(() => {
      const badges = screen.getAllByText(/Palestra|Minicurso|Oficina/);
      expect(badges.length).toBeGreaterThanOrEqual(3);
    });
  });
});
