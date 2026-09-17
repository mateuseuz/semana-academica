import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FormAtividadeModal from '../components/FormAtividadeModal';
import { apiService } from '../services/api';

// Mock useParams via vi.mock
const useParamsMock = vi.fn(() => ({}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => useParamsMock() };
});

// Save originals and replace apiService methods directly
const originalGetSalas = apiService.getSalas;
const originalGetAtividadeById = apiService.getAtividadeById;
const originalCriarAtividade = apiService.criarAtividade;
const originalAtualizarAtividade = apiService.atualizarAtividade;

function mockApiService(methods) {
  if (methods.getSalas !== undefined) apiService.getSalas = methods.getSalas;
  if (methods.getAtividadeById !== undefined) apiService.getAtividadeById = methods.getAtividadeById;
  if (methods.criarAtividade !== undefined) apiService.criarAtividade = methods.criarAtividade;
  if (methods.atualizarAtividade !== undefined) apiService.atualizarAtividade = methods.atualizarAtividade;
}

function restoreApiService() {
  apiService.getSalas = originalGetSalas;
  apiService.getAtividadeById = originalGetAtividadeById;
  apiService.criarAtividade = originalCriarAtividade;
  apiService.atualizarAtividade = originalAtualizarAtividade;
}

const mockSalas = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
  { id: 'lab-3', nome: 'Laboratório 3', capacidade: 20 },
];

const mockAtividadeEdit = {
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

function renderForm(options = {}) {
  const { id, onClose } = options;

  useParamsMock.mockReturnValue(id ? { id } : {});
  mockApiService({
    getSalas: vi.fn().mockResolvedValue(mockSalas),
    getAtividadeById: vi.fn().mockResolvedValue(id ? mockAtividadeEdit : null),
  });

  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormAtividadeModal onSuccess={vi.fn()} onClose={onClose || vi.fn()} />} />
      </Routes>
    </BrowserRouter>
  );
}

describe('FormAtividadeModal - Renderização do Formulário', () => {
  beforeEach(() => { restoreApiService(); });
  afterEach(() => { restoreApiService(); });

  it('renderiza o formulário de cadastro com todos os campos', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());
  });

  it('exibe campo Título', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/Título/)).toBeInTheDocument());
  });

  it('exibe campo Tipo com opções palestra e minicurso', async () => {
    renderForm();
    await waitFor(() => {
      const select = screen.getByLabelText(/Tipo/);
      expect(select).toBeInTheDocument();
      expect(select.querySelectorAll('option')).toHaveLength(3);
    });
  });

  it('exibe campo Sala com opções carregadas da API', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/Sala/)).toBeInTheDocument());
  });

  it('exibe campo Vagas', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByLabelText(/Vagas/)).toBeInTheDocument());
  });

  it('exibe informações de tipo quando não está em modo de edição', async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByText('Palestra:')).toBeInTheDocument();
      expect(screen.getByText('exatamente 1 encontro')).toBeInTheDocument();
      expect(screen.getByText('Minicurso:')).toBeInTheDocument();
      expect(screen.getByText('de 2 a 5 encontros')).toBeInTheDocument();
    });
  });
});

describe('FormAtividadeModal - Modo de Edição', () => {
  beforeEach(() => { restoreApiService(); });
  afterEach(() => { restoreApiService(); });

  it('carrega dados da atividade no modo de edição', async () => {
    renderForm({ id: 'atv_001' });
    await waitFor(() => expect(screen.getByText('Editar Atividade')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText(/Título/)).toHaveValue('Palestra de Abertura'));
  });

  it('preenche campo sala com a atividade atual', async () => {
    renderForm({ id: 'atv_001' });
    await waitFor(() => expect(screen.getByLabelText(/Sala/)).toHaveValue('auditorio'));
  });

  it('exibe botão "Salvar Alterações" no modo de edição', async () => {
    renderForm({ id: 'atv_001' });
    await waitFor(() => expect(screen.getByText('Salvar Alterações')).toBeInTheDocument());
  });

  it('não exibe informações de tipo no modo de edição', async () => {
    renderForm({ id: 'atv_001' });
    await waitFor(() => expect(screen.queryByText('exatamente 1 encontro')).not.toBeInTheDocument());
  });
});

describe('FormAtividadeModal - Validação de Formulário', () => {
  beforeEach(() => { restoreApiService(); });
  afterEach(() => { restoreApiService(); });

  it('exibe erro de campo obrigatório ao submeter formulário vazio', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.click(screen.getByText('Cadastrar Atividade'));

    await waitFor(() => {
      expect(screen.getByText('Título é obrigatório')).toBeInTheDocument();
      expect(screen.getByText('Tipo é obrigatório')).toBeInTheDocument();
      expect(screen.getByText('Sala é obrigatória')).toBeInTheDocument();
      expect(screen.getByText('Vagas deve ser maior que 0')).toBeInTheDocument();
    });
  });

  it('exibe erro quando vagas é 0', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/Título/), 'Teste');
    await user.selectOptions(screen.getByLabelText(/Tipo/), 'palestra');
    await user.selectOptions(screen.getByLabelText(/Sala/), 'auditorio');
    const vagasInput = screen.getByLabelText(/Vagas/);
    fireEvent.input(vagasInput, { target: { value: '0' } });

    await user.click(screen.getByText('Cadastrar Atividade'));

    await waitFor(() => expect(screen.getByText('Vagas deve ser maior que 0')).toBeInTheDocument());
  });
});

describe('FormAtividadeModal - Submissão e Erros da API', () => {
  const errorCriar = new Error('Vagas acima da capacidade');
  errorCriar.code = 'VAGAS_ACIMA_DA_CAPACIDADE';
  const errorAtualizar = new Error('Atividade já iniciada');
  errorAtualizar.code = 'ATIVIDADE_JA_INICIADA';
  const errorAny = new Error('Erro qualquer');
  errorAny.code = 'ERRO_TESTE';

  beforeEach(() => { restoreApiService(); });
  afterEach(() => { restoreApiService(); });

  it('exibe mensagem de sucesso ao criar atividade com sucesso', async () => {
    const user = userEvent.setup();
    mockApiService({
      getSalas: vi.fn().mockResolvedValue(mockSalas),
      getAtividadeById: vi.fn().mockResolvedValue(null),
      criarAtividade: vi.fn().mockResolvedValue({ id: 'atv_new', titulo: 'Teste', tipo: 'palestra' }),
    });

    renderForm();
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/Título/), 'Nova Palestra');
    await user.selectOptions(screen.getByLabelText(/Tipo/), 'palestra');
    await user.selectOptions(screen.getByLabelText(/Sala/), 'auditorio');
    const vagasInput = screen.getByLabelText(/Vagas/);
    fireEvent.input(vagasInput, { target: { value: '50' } });

    await user.click(screen.getByText('Cadastrar Atividade'));

    await waitFor(() => expect(screen.getByText('Atividade criada com sucesso!')).toBeInTheDocument());
  });

  it('exibe mensagem de erro da API com código e mensagem ao falhar ao criar', async () => {
    const user = userEvent.setup();
    mockApiService({
      getSalas: vi.fn().mockResolvedValue(mockSalas),
      getAtividadeById: vi.fn().mockResolvedValue(null),
      criarAtividade: vi.fn().mockRejectedValue(errorCriar),
    });

    renderForm();
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/Título/), 'Nova Palestra');
    await user.selectOptions(screen.getByLabelText(/Tipo/), 'palestra');
    await user.selectOptions(screen.getByLabelText(/Sala/), 'auditorio');
    const vagasInput = screen.getByLabelText(/Vagas/);
    fireEvent.input(vagasInput, { target: { value: '300' } });

    await user.click(screen.getByText('Cadastrar Atividade'));

    await waitFor(() => {
      expect(screen.getByText('Vagas acima da capacidade')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro da API ao falhar ao atualizar', async () => {
    const user = userEvent.setup();
    mockApiService({
      getSalas: vi.fn().mockResolvedValue(mockSalas),
      getAtividadeById: vi.fn().mockResolvedValue(mockAtividadeEdit),
      atualizarAtividade: vi.fn().mockRejectedValue(errorAtualizar),
    });
    useParamsMock.mockReturnValue({ id: 'atv_001' });

    renderForm({ id: 'atv_001' });
    await waitFor(() => expect(screen.getByText('Editar Atividade')).toBeInTheDocument());

    await user.click(screen.getByText('Salvar Alterações'));

    await waitFor(() => {
      expect(screen.getByText(/Atividade já iniciada/)).toBeInTheDocument();
    });
  });

  it('limpa erros da API entre submissões', async () => {
    const user = userEvent.setup();
    mockApiService({
      getSalas: vi.fn().mockResolvedValue(mockSalas),
      getAtividadeById: vi.fn().mockResolvedValue(null),
      criarAtividade: vi.fn().mockRejectedValue(errorAny),
    });

    renderForm();
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/Título/), 'Teste');
    await user.selectOptions(screen.getByLabelText(/Tipo/), 'palestra');
    await user.selectOptions(screen.getByLabelText(/Sala/), 'auditorio');
    const vagasInput = screen.getByLabelText(/Vagas/);
    fireEvent.input(vagasInput, { target: { value: '10' } });

    const submitBtn = screen.getByText('Cadastrar Atividade');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Erro qualquer')).toBeInTheDocument();
    });

    mockApiService({
      getSalas: vi.fn().mockResolvedValue(mockSalas),
      getAtividadeById: vi.fn().mockResolvedValue(null),
      criarAtividade: vi.fn().mockResolvedValue({ id: 'atv_new', titulo: 'Teste' }),
    });

    await user.click(submitBtn);

    await waitFor(() => expect(screen.getByText('Atividade criada com sucesso!')).toBeInTheDocument());
  });
});

describe('FormAtividadeModal - Submissão com Sucesso (Editar)', () => {
  beforeEach(() => { restoreApiService(); });
  afterEach(() => { restoreApiService(); });

  it('exibe mensagem de sucesso ao atualizar atividade', async () => {
    const user = userEvent.setup();
    mockApiService({
      getSalas: vi.fn().mockResolvedValue(mockSalas),
      getAtividadeById: vi.fn().mockResolvedValue(mockAtividadeEdit),
      atualizarAtividade: vi.fn().mockResolvedValue({ id: 'atv_001', titulo: 'Atualizado' }),
    });
    useParamsMock.mockReturnValue({ id: 'atv_001' });

    renderForm({ id: 'atv_001' });
    await waitFor(() => expect(screen.getByText('Editar Atividade')).toBeInTheDocument());

    await user.click(screen.getByText('Salvar Alterações'));

    await waitFor(() => expect(screen.getByText('Atividade atualizada com sucesso!')).toBeInTheDocument());
  });
});

describe('FormAtividadeModal - Fechar e Reset', () => {
  beforeEach(() => { restoreApiService(); });
  afterEach(() => { restoreApiService(); });

  it('chama onClose ao clicar no botão cancelar', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup({ delay: null });
    renderForm({ onClose });
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('fecha ao clicar no botão X do modal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup({ delay: null });
    renderForm({ onClose });
    await waitFor(() => expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument());

    await user.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });
});
