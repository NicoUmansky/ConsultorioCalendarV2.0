import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

const supabaseUrl = "https://psiosmajmdqunenvdrcy.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaW9zbWFqbWRxdW5lbnZkcmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDMwODk3MTksImV4cCI6MjAxODY2NTcxOX0.VVu53_ZzCuEfjDU-qSMl2h_CwO84Gd9_7kITJpzhKNg"

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

ReactDOM.render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <App />
    </SessionContextProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

reportWebVitals();
