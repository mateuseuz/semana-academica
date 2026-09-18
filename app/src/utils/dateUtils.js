export function formatarDataISO(dataStr) {
  const d = new Date(dataStr);
  return d.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatarHoraISO(dataStr) {
  const d = new Date(dataStr);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatarDateTime(dataStr) {
  const d = new Date(dataStr);
  return `${formatarDataISO(dataStr)} ${formatarHoraISO(dataStr)}`;
}

export function obterDataISO(dataStr) {
  return new Date(dataStr).toISOString().split('T')[0];
}

export function agruparPorData(atividades) {
  const grupos = {};
  atividades.forEach((atv) => {
    const datas = new Set();
    atv.encontros.forEach((e) => {
      datas.add(obterDataISO(e.inicio));
    });
    datas.forEach((data) => {
      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(atv);
    });
  });
  const datasOrdenadas = Object.keys(grupos).sort();
  const resultado = {};
  datasOrdenadas.forEach((data) => {
    resultado[data] = grupos[data];
  });
  return resultado;
}

export function formatarDuracao(minutos) {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas > 0 && mins > 0) return `${horas}h ${mins}min`;
  if (horas > 0) return `${horas}h`;
  return `${mins}min`;
}

export function getSituacaoLabel(situacao) {
  const labels = {
    prevista: 'Prevista',
    em_andamento: 'Em andamento',
    encerrada: 'Encerrada',
    cancelada: 'Cancelada',
  };
  return labels[situacao] || situacao;
}

export function getTipoLabel(tipo) {
  if (tipo === 'palestra') return 'Palestra';
  if (tipo === 'minicurso') return 'Minicurso';
  return tipo;
}

export function getSituacaoClass(situacao) {
  const classes = {
    prevista: 'situacao-prevista',
    em_andamento: 'situacao-em-andamento',
    encerrada: 'situacao-encerrada',
    cancelada: 'situacao-cancelada',
  };
  return classes[situacao] || '';
}
