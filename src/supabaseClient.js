import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuración crítica ausente: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar declaradas en tu entorno.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Mantiene la sesión en localStorage incluso al cerrar el navegador
    autoRefreshToken: true, // Renueva el JWT automáticamente antes de su expiración de 1 hora
    detectSessionInUrl: true, // Permite capturar tokens de confirmación por correo o magic links
    storage: window.localStorage // Asegura almacenamiento consistente en dispositivos móviles
  },
  global: {
    headers: {
      'x-application-name': 'industrias-wert-marketplace'
    }
  }
});