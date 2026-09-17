import { describe, it, expect } from 'vitest';
import { formatarDataISO, formatarHoraISO, formatarDuracao, agruparPorData, obterDataISO, getSituacaoLabel, getTipoLabel } from '../utils/dateUtils';

describe('dateUtils', () => {
  it('formatarDataISO retorna data formatada', () => {
    expect(formatarDataISO('2026-10-19T19:00:00-03:00')).toBe('19/10/2026');
  });

  it('formatarHoraISO retorna hora formatada', () => {
    expect(formatarHoraISO('2026-10-19T19:00:00-03:00')).toBe('19:00');
  });

  it('formatarDuracao retorna formato correto', () => {
    expect(formatarDuracao(180)).toBe('3h');
    expect(formatarDuracao(90)).toBe('1h 30min');
    expect(formatarDuracao(30)).toBe('30min');
  });

  it('obterDataISO retorna data no formato YYYY-MM-DD', () => {
    expect(obterDataISO('2026-10-19T19:00:00-03:00')).toBe('2026-10-19');
  });

  it('agruparPorData agrupa atividades por data', () => {
    const atividades = [
      { id: '1', encontros: [{ inicio: '2026-10-19T19:00:00-03:00' }] },
      { id: '2', encontros: [{ inicio: '2026-10-19T20:00:00-03:00' }] },
      { id: '3', encontros: [{ inicio: '2026-10-20T19:00:00-03:00' }] },
    ];
    const resultado = agruparPorData(atividades);
    expect(Object.keys(resultado)).toHaveLength(2);
    expect(resultado['2026-10-19']).toHaveLength(2);
    expect(resultado['2026-10-20']).toHaveLength(1);
  });

  it('getSituacaoLabel retorna rótulo correto', () => {
    expect(getSituacaoLabel('prevista')).toBe('Prevista');
    expect(getSituacaoLabel('em_andamento')).toBe('Em andamento');
    expect(getSituacaoLabel('encerrada')).toBe('Encerrada');
    expect(getSituacaoLabel('cancelada')).toBe('Cancelada');
  });

  it('getTipoLabel retorna rótulo correto', () => {
    expect(getTipoLabel('palestra')).toBe('Palestra');
    expect(getTipoLabel('minicurso')).toBe('Minicurso');
  });
});
