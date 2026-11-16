import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function RegistroNegocio() {
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [municipioBase, setMunicipioBase] = useState('Tuxtla Gutiérrez');
  const [direccion, setDireccion] = useState('');
  const [regimen, setRegimen] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [comprobando, setComprobando] = useState(true);
  const [userId, setUserId] = useState(null);
  const [errorFeedback, setErrorFeedback] = useState(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/inventario/rentas';

  useEffect(() => {
    let montado = true;
    async function comprobarUsuario() {
      try {
        setComprobando(true);
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        
        if (authErr || !user) {
          if (montado) navigate(`/registro-general?redirect=${encodeURIComponent('/registro-negocio')}`);
          return;
        }

        if (montado) setUserId(user.id);

        const { data, error } = await supabase
          .from('perfiles_proveedores')
          .select('id, nombre_empresa, rfc')
          .eq('usuario_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data && data.nombre_empresa && data.rfc) {
          if (montado) navigate(redirectTarget, { replace: true });
        }
      } catch (err) {
        console.error("Error al comprobar perfil de proveedor:", err);
        if (montado) setErrorFeedback("No pudimos validar tu sesión. Por favor recarga la página.");
      } finally {
        if (montado) setComprobando(false);
      }
    }

    comprobarUsuario();
    return () => { montado = false; };
  }, [navigate, redirectTarget]);

  const handleRegistroNegocio = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setErrorFeedback(null);
    const rfcLimpio = rfc.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

    if (rfcLimpio.length < 12 || rfcLimpio.length > 13) {
      setErrorFeedback('El RFC debe tener exactamente 12 caracteres (Empresas) o 13 caracteres (Personas Físicas).');
      return;
    }

    setLoading(true);

    try {
      const nombreLimpio = razonSocial.trim();
      const { error } = await supabase
        .from('perfiles_proveedores')
        .upsert(
          {
            usuario_id: userId,
            nombre_empresa: nombreLimpio,
            razon_social: nombreLimpio,
            rfc: rfcLimpio,
            telefono: telefono.trim(),
            direccion_fiscal: direccion.trim(),
            municipio_base: municipioBase.trim(),
            regimen_fiscal: regimen
          },
          { onConflict: 'usuario_id' }
        );

      if (error) throw error;

      navigate(redirectTarget, { replace: true });
    } catch (err) {
      console.error("Error al registrar empresa:", err);
      setErrorFeedback(err.message || 'No fue posible dar de alta los datos fiscales.');
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
    errorBorder: '#77333B'
  };

  const inputStyle = {
    width: '100%',
    minHeight: '44px',
    padding: '8px 12px',
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontSize: '15px',
    color: colors.textMain,
    outline: 'none'
  };

  if (comprobando) {
    return (
      <div style={{ minHeight: '85vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>Validando cuenta comercial...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '90vh',
      backgroundColor: colors.bg,
      fontFamily: 'Arial, sans-serif',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: colors.card,
        borderRadius: '10px',
        border: `1px solid ${colors.inputBorder}`,
        padding: '32px 24px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          fontWeight: 'bold',
          fontSize: '22px',
          margin: '0 0 8px 0',
          color: colors.textMain,
          textAlign: 'center'
        }}>
          🏢 Alta de Proveedor / Maquinaria
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', margin: '0 0 20px 0', lineHeight: '1.4' }}>
          Registra tu empresa para rentar maquinaria pesada, fletes o suministrar bancos de materiales.
        </p>

        {errorFeedback && (
          <div style={{
            backgroundColor: colors.errorBg,
            border: `1px solid ${colors.errorBorder}`,
            color: colors.textMain,
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '16px',
            lineHeight: '1.4'
          }}>
            ⚠️ {errorFeedback}
          </div>
        )}

        <form onSubmit={handleRegistroNegocio} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              🏷️ Razón Social o Nombre Comercial
            </label>
            <input 
              type="text" 
              style={inputStyle}
              value={razonSocial} 
              onChange={(e) => setRazonSocial(e.target.value)} 
              placeholder="Ej. Maquinaria del Sureste S.A." 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              📄 RFC (Registro Federal de Contribuyentes)
            </label>
            <input 
              type="text" 
              style={{ ...inputStyle, textTransform: 'uppercase' }}
              value={rfc} 
              onChange={(e) => setRfc(e.target.value.toUpperCase())} 
              placeholder="12 o 13 caracteres (ej. MSO010101XYZ)" 
              maxLength={13}
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              📞 Teléfono Comercial / Despacho
            </label>
            <input 
              type="tel" 
              style={inputStyle}
              value={telefono} 
              onChange={(e) => setTelefono(e.target.value)} 
              placeholder="10 dígitos para contacto directo" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              ⚖️ Régimen Fiscal
            </label>
            <select 
              style={inputStyle}
              value={regimen} 
              onChange={(e) => setRegimen(e.target.value)} 
              required
            >
              <option value="">-- Selecciona el Régimen --</option>
              <option value="RESICO">Régimen Simplificado de Confianza (RESICO)</option>
              <option value="Persona Física">Persona Física con Actividad Empresarial</option>
              <option value="Persona Moral">General de Ley Personas Morales</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              📍 Municipio Base de Operaciones
            </label>
            <input 
              type="text" 
              style={inputStyle}
              value={municipioBase} 
              onChange={(e) => setMunicipioBase(e.target.value)} 
              placeholder="Ej. Tuxtla Gutiérrez, Chiapas" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '15px', color: colors.textMain, marginBottom: '6px' }}>
              📍 Dirección Fiscal Completa
            </label>
            <input 
              type="text" 
              style={inputStyle}
              value={direccion} 
              onChange={(e) => setDireccion(e.target.value)} 
              placeholder="Calle, Número, Colonia y C.P." 
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
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? '⏳ Registrando...' : '✅ Confirmar Registro Comercial'}
          </button>
        </form>
      </div>
    </div>
  );
}