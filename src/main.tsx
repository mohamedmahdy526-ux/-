import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UIFeedbackProvider } from './components/UIFeedbackProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIFeedbackProvider>
      <App />
    </UIFeedbackProvider>
  </StrictMode>,
);
