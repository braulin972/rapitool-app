import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function EditarRenta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);

  const [nombre, setNombre] = useState('');
  const [precioHora, setPrecioHora] = useState('');
  const [precioDia, setPrecioDia] = useState('');
  const [precioMes, setPrecioMes] = useState('');
  const [horometro, setHorometro] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [ubicacion, setUbicacion] = useState('');

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

  useEffect(() => {
    let montado = true;
    async function obtenerProducto() {
      try {
        setLoading(true);
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          if (montado) navigate('/registro-general?redirect=/inventario/rentas');
          return;
        }
        if (montado) setUserId(user.id);

        const { data, error } = await supabase
          .from('productos')
          .select('id, id_arrendador, nombre, precio_hora, precio_dia, precio_mes, horometro, peso_kg, ubicacion_almacen')
          .eq('id', id)
          .eq('id_arrendador', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Equipo no encontrado o no tienes permisos para editarlo.');

        if (montado) {
          setNombre(data.nombre || '');
          setPrecioHora(data.precio_hora ?? '');
          setPrecioDia(data.precio_dia ?? '');
          setPrecioMes(data.precio_mes ?? '');
          setHorometro(data.horometro ?? '');
          setPesoKg(data.peso_kg ?? '');
          setUbicacion(data.ubicacion_almacen || '');
        }
      } catch (error) {
        console.error('Error al cargar equipo:', error);
        if (montado) navigate('/inventario/rentas');
      } finally {
        if (montado) setLoading(false);
      }
    }
    obtenerProducto();
    return () => { montado = false; };
  }, [id, navigate]);

  const handleGuardarCambios = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setSubmitting(true);
    setMensajeFeedback(null);

    try {
      const { data, error, status } = await supabase
        .from('productos')
        .update({
          nombre: nombre.trim(),
          precio_hora: parseFloat(precioHora) || 0,
          precio_dia: parseFloat(precioDia) || 0,
          precio_mes: parseFloat(precioMes) || 0,
          horometro: parseFloat(horometro) || 0,
          peso_kg: parseInt(pesoKg, 10) || 0,
          ubicacion_almacen: ubicacion.trim()
        })
        .eq('id', id)
        .eq('id_arrendador', userId)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`Estado ${status}: Fila bloqueada por Row Level Security.`);
        setMensajeFeedback({
          tipo: 'error',
          texto: 'No se aplicaron los cambios. Verifica que eres el arrendador propietario de este activo.'
        });
        return;
      }

      setMensajeFeedback({ tipo: 'exito', texto: '✅ Especificaciones actualizadas correctamente.' });
      setTimeout(() => navigate('/inventario/rentas'), 1000);
    } catch (error) {
      console.error('Error al actualizar:', error);
      setMensajeFeedback({ tipo: 'error', texto: error.message || 'Error al guardar los cambios en la base de datos.' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    minHeight: '44px',
    padding: '8px 12px',
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '6px',
    color: colors.textMain,
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 'bold',
    fontSize: '14px',
    color: colors.textMain,
    marginBottom: '6px'
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Cargando datos de maquinaria...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, padding: '30px 16px', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: colors.card, padding: '30px 24px', borderRadius: '10px', border: `1px solid ${colors.inputBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: colors.textMain, fontSize: '22px', margin: 0, fontWeight: 'bold' }}>
            ✏️ Editar Equipo en Renta
          </h1>
          <Link to="/inventario/rentas" style={{ color: colors.accent, textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
            ← Volver al Inventario
          </Link>
        </div>

        {mensajeFeedback && (
          <div style={{
            backgroundColor: mensajeFeedback.tipo === 'error' ? colors.errorBg : colors.exitoBg,
            border: `1px solid ${mensajeFeedback.tipo === 'error' ? colors.errorBorder : colors.exitoBorder}`,
            color: colors.textMain,
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {mensajeFeedback.texto}
          </div>
        )}

        <form onSubmit={handleGuardarCambios} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nombre Comercial / Ficha del Equipo:</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Horómetro (hrs):</label>
              <input 
                type="number" 
                step="0.1" 
                value={horometro} 
                onChange={(e) => setHorometro(e.target.value)} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Peso Operativo (Kg):</label>
              <input 
                type="number" 
                value={pesoKg} 
                onChange={(e) => setPesoKg(e.target.value)} 
                style={inputStyle} 
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>📍 Patio Base / Ubicación de Almacén:</label>
            <input 
              type="text" 
              value={ubicacion} 
              onChange={(e) => setUbicacion(e.target.value)} 
              style={inputStyle} 
            />
          </div>

          <hr style={{ border: `0.5px solid ${colors.inputBorder}`, margin: '8px 0' }} />

          <div>
            <label style={labelStyle}>Esquema de Precios Actualizado:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Tarifa Hora ($ MXN):</span>
                <input 
                  type="number" 
                  value={precioHora} 
                  onChange={(e) => setPrecioHora(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.accent, display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Tarifa Día ($ MXN) *:</span>
                <input 
                  type="number" 
                  value={precioDia} 
                  onChange={(e) => setPrecioDia(e.target.value)} 
                  style={inputStyle} 
                  required 
                />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Tarifa Mes ($ MXN):</span>
                <input 
                  type="number" 
                  value={precioMes} 
                  onChange={(e) => setPrecioMes(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button 
              type="submit" 
              disabled={submitting} 
              style={{ 
                flex: 2,
                minHeight: '48px', 
                backgroundColor: colors.accent, 
                color: '#1A2332', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: submitting ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', 
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {submitting ? '⏳ Guardando...' : '💾 Guardar Modificaciones'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/inventario/rentas')} 
              style={{ 
                flex: 1,
                minHeight: '48px', 
                backgroundColor: 'transparent', 
                color: colors.textSecondary, 
                border: `1px solid ${colors.inputBorder}`, 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontSize: '15px', 
                fontWeight: 'bold' 
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}