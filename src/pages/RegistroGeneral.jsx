import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function RegistroGeneral() {
  const [esLogin, setEsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensajeFeedback(null);

    try {
      if (esLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        navigate(redirectTarget, { replace: true });
      } else {
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone_text: phone.trim(),
            }
          }
        });

        if (error) throw error;

        if (data?.user && !data?.session) {
          setMensajeFeedback({
            tipo: 'exito',
            texto: 'Cuenta creada. Revisa tu correo electrónico para confirmar tu registro antes de iniciar sesión.'
          });
          setEsLogin(true);
        } else {
          setMensajeFeedback({
            tipo: 'exito',
            texto: '¡Cuenta creada con éxito! Redirigiendo...'
          });
          navigate(redirectTarget, { replace: true });
        }
      }
    } catch (err) {
      console.error("Error en autenticación:", err);
      let errorTexto = err.message || 'Ocurrió un error inesperado.';
      if (errorTexto.includes('Invalid login credentials')) {
        errorTexto = 'Correo o contraseña incorrectos. Verifica tus datos.';
      } else if (errorTexto.includes('User already registered')) {
        errorTexto = 'Este correo ya tiene una cuenta registrada. Intenta iniciar sesión.';
      }
      setMensajeFeedback({ tipo: 'error', texto: errorTexto });
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    inputBg: '#1A2332',
    inputBorder: '#3F4E65',
    errorBg: '#442226',
    errorBorder: '#77333B',
    exitoBg: '#1F3D2B',
    exitoBorder: '#2E6343'
  };

  const inputStyle = {
    width: '100%',
    minHeight: '44px',
    padding: '8px 12px',
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontSize: '16px',
    color: colors.textMain,
    outline: 'none'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      backgroundColor: colors.bg,
      fontFamily: 'Arial, sans-serif',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      <div 
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: colors.textMain,
          marginBottom: '24px',
          letterSpacing: '1px',
          cursor: 'pointer',
          textAlign: 'center',
          userSelect: 'none'
        }} 
        onClick={() => navigate('/')}
      >
        INDUSTRIAS WERT<span style={{ color: colors.accent }}>.</span>
      </div>

      <div style={{
        backgroundColor: colors.card,
        borderRadius: '10px',
        border: `1px solid ${colors.inputBorder}`,
        padding: '30px 24px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          fontWeight: 'bold',
          fontSize: '22px',
          marginBottom: '20px',
          color: colors.textMain,
          marginTop: '0',
          textAlign: 'center'
        }}>
          {esLogin ? 'Iniciar Sesión' : 'Crear Cuenta Nueva'}
        </h1>

        {mensajeFeedback && (
          <div style={{
            backgroundColor: mensajeFeedback.tipo === 'error' ? colors.errorBg : colors.exitoBg,
            border: `1px solid ${mensajeFeedback.tipo === 'error' ? colors.errorBorder : colors.exitoBorder}`,
            color: colors.textMain,
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '16px',
            lineHeight: '1.4'
          }}>
            {mensajeFeedback.texto}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!esLogin && (
            <>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
                  👤 Nombre Completo del Contacto
                </label>
                <input 
                  type="text" 
                  style={inputStyle}
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Ej. Ing. Carlos Mendoza" 
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
                  📱 Teléfono / WhatsApp
                </label>
                <input 
                  type="tel" 
                  style={inputStyle}
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="10 dígitos (ej. 9611234567)" 
                  required 
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              ✉️ Correo Electrónico
            </label>
            <input 
              type="email" 
              style={inputStyle}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="tu@correo.com" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              🔒 Contraseña
            </label>
            <input 
              type="password" 
              style={inputStyle}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={esLogin ? "Ingresa tu contraseña" : "Mínimo 6 caracteres"} 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '48px',
              backgroundColor: colors.accent,
              color: '#1A2332',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? '⏳ Conectando...' : esLogin ? 'Entrar a mi Cuenta' : 'Registrar mi Cuenta'}
          </button>
        </form>
      </div>

      <div style={{ width: '100%', maxWidth: '420px', marginTop: '20px', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary, fontSize: '15px', margin: '0 0 10px 0' }}>
          {esLogin ? '¿Aún no tienes cuenta?' : '¿Ya estás registrado?'}
        </p>
        
        <button 
          type="button"
          onClick={() => {
            setEsLogin(!esLogin);
            setMensajeFeedback(null);
          }}
          style={{
            width: '100%',
            minHeight: '44px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.textSecondary}`,
            borderRadius: '6px',
            color: colors.textMain,
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {esLogin ? 'Crear una cuenta nueva' : 'Iniciar sesión con mi cuenta'}
        </button>
      </div>
    </div>
  );
}