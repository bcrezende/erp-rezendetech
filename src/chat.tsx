import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/Auth/AuthProvider';
import { AppProvider } from './contexts/AppContext';
import ChatInterface from './components/Chat/ChatInterface';
import './index.css';

const ChatApp = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="min-h-screen bg-gray-50">
          <ChatInterface />
        </div>
      </AppProvider>
    </AuthProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatApp />
  </StrictMode>
);