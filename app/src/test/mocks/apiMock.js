import { vi } from 'vitest';

const mockActivities = [
  {
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
  },
  {
    id: 'atv_002',
    titulo: 'Minicurso de React',
    tipo: 'minicurso',
    salaId: 'sala-101',
    vagas: 40,
    encontros: [
      { id: 'enc_002', inicio: '2026-10-20T14:00:00-03:00', fim: '2026-10-20T17:00:00-03:00' },
      { id: 'enc_003', inicio: '2026-10-21T14:00:00-03:00', fim: '2026-10-21T17:00:00-03:00' },
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
    encontros: [
      { id: 'enc_004', inicio: '2026-10-22T10:00:00-03:00', fim: '2026-10-22T12:00:00-03:00' },
    ],
    cargaHorariaMinutos: 120,
    situacao: 'prevista',
    ocupadas: 0,
    vagasRestantes: 20,
    emEspera: 0,
  },
  {
    id: 'atv_004',
    titulo: 'Palestra Avançada',
    tipo: 'palestra',
    salaId: 'auditorio',
    vagas: 200,
    encontros: [
      { id: 'enc_005', inicio: '2026-10-20T19:00:00-03:00', fim: '2026-10-20T21:00:00-03:00' },
    ],
    cargaHorariaMinutos: 120,
    situacao: 'em_andamento',
    ocupadas: 100,
    vagasRestantes: 100,
    emEspera: 5,
  },
  {
    id: 'atv_005',
    titulo: 'Oficina Encerrada',
    tipo: 'oficina',
    salaId: 'sala-102',
    vagas: 20,
    encontros: [
      { id: 'enc_006', inicio: '2026-10-19T09:00:00-03:00', fim: '2026-10-19T11:00:00-03:00' },
    ],
    cargaHorariaMinutos: 120,
    situacao: 'encerrada',
    ocupadas: 15,
    vagasRestantes: 5,
    emEspera: 0,
  },
];

const mockSalas = [
  { id: 'auditorio', nome: 'Auditório Central', capacidade: 200 },
  { id: 'sala-101', nome: 'Sala 101', capacidade: 40 },
  { id: 'sala-102', nome: 'Sala 102', capacidade: 40 },
  { id: 'lab-3', nome: 'Laboratório 3', capacidade: 20 },
];

export { mockActivities, mockSalas };
