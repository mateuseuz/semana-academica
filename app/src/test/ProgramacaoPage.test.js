import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi as vitestVi } from 'vitest';

// Simple test for dateUtils
describe('ProgramacaoPage - Estrutura', () => {
  it('verifica se os utils estão funcionando', () => {
    // Re-import to test
    const { formatarDataISO, agruparPorData } = require('../utils/dateUtils');
    expect(formatarDataISO('2026-10-19T19:00:00-03:00')).toBe('19/10/2026');
  });

  it('agrupa atividades por data corretamente', () => {
    const { agruparPorData } = require('../utils/dateUtils');
    const atividades = [
      { id: '1', encontros: [{ inicio: '2026-10-19T19:00:00-03:00' }] },
    ];
    const resultado = agruparPorData(atividades);
    expect(resultado['2026-10-19']).toHaveLength(1);
  });
});
