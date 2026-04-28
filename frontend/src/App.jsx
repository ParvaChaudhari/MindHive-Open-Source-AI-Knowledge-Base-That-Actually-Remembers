import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import CollectionsPage from './pages/CollectionsPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { useState } from 'react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-4">sync</span>
      <p className="text-outline font-label-md">Entering the Hive...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return children;
};

function AppContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface text-on-surface overflow-hidden">
      {user && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <main className={`flex-1 overflow-y-auto relative bg-stone-50/50 dark:bg-stone-950/50 ${user ? 'lg:pl-64' : ''}`}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
          
          <Route path="/" element={<ProtectedRoute><DashboardPage onMenuClick={() => setSidebarOpen(true)} /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentsPage onMenuClick={() => setSidebarOpen(true)} /></ProtectedRoute>} />
          <Route path="/collections" element={<ProtectedRoute><CollectionsPage onMenuClick={() => setSidebarOpen(true)} /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage onMenuClick={() => setSidebarOpen(true)} /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Data remains fresh for 1 minute
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
