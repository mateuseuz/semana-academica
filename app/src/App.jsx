import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import ProgramacaoPage from './components/ProgramacaoPage';
import FormAtividadeModal from './components/FormAtividadeModal';

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Semana Acadêmica 2026</h1>
        <nav>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Grade de Atividades
          </NavLink>
          <NavLink to="/nova" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Nova Atividade
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ProgramacaoPage />} />
          <Route path="/nova" element={
            <FormAtividadeModal
              onSuccess={() => navigate('/')}
              onClose={() => navigate('/')}
            />
          } />
          <Route path="/editar/:id" element={
            <FormAtividadeModal
              onSuccess={() => navigate('/')}
              onClose={() => navigate('/')}
            />
          } />
        </Routes>
      </main>
    </div>
  );
}
