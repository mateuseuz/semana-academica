import React, { useState } from 'react';
import { OrganizacaoTela } from './components/OrganizacaoTela.jsx';
import { ParticipanteTela } from './components/ParticipanteTela.jsx';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('participante'); // 'organizacao' | 'participante'

  return (
    <div className="container">
      <header>
        <div>
          <h1>Semana Acadêmica — M3 Presença por QR</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Interface do Participante e Organização</p>
        </div>
        <div className="nav-tabs">
          <button 
            className={abaAtiva === 'participante' ? 'active' : ''} 
            onClick={() => setAbaAtiva('participante')}
          >
            Modo Participante
          </button>
          <button 
            className={abaAtiva === 'organizacao' ? 'active' : ''} 
            onClick={() => setAbaAtiva('organizacao')}
          >
            Modo Organização
          </button>
        </div>
      </header>

      <main>
        {abaAtiva === 'organizacao' ? <OrganizacaoTela /> : <ParticipanteTela />}
      </main>
    </div>
  );
}
