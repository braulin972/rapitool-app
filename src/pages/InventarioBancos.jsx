import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function InventarioBancos() {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { tipo: 'exito' | 'error', texto: '' }
  const navigate = useNavigate();

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardLight: '#324158',
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
    cargarMateriales();
  }, []);

  const cargarMateriales = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        navigate('/registro-general?redirect=/inventario/bancos');
        return;
      }

      // Filtrado estricto por usuario propietario
      const { data, error } = await supabase
        .from('catalogo_maestro')
        .select('*')
        .eq('categoria', 'Materiales de Banco')
        .eq('usuario_id', session.user.id)
        .order('id', { ascending: false });

      if (error) throw error;
      setMateriales(data || []);
    } catch (err) {
      console.error('Error al cargar materiales:', err);
      setFeedback({ tipo: 'error', texto: 'No se pudo recuperar el catálogo de materiales.' });
    } finally {
      setLoading(false);
    }
  };

  const togglePausa = async (id, estadoActual) => {
    try {
      setProcesandoId(id);
      const { error } = await supabase
        .from('catalogo_maestro')
        .update({ pausado: !estadoActual })
        .eq('id', id);

      if (error) throw error;

      setMateriales(prev => prev.map(m => m.id === id ? { ...m, pausado: !estadoActual } : m));
      setFeedback({
        tipo: 'exito',
        texto: estadoActual ? 'Material activado para cotizaciones.' : 'Material pausado temporalmente.'
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error al pausar material:', err);
      setFeedback({ tipo: 'error', texto: 'Error al cambiar visibilidad: ' + err.message });
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarMaterial = async (id, nombre) => {
    const confirmar = window.confirm(`¿Deseas dar de baja definitivamente el material "${nombre}"?`);
    if (!confirmar) return;

    try {
      setProcesandoId(id);
      const { error } = await supabase
        .from('catalogo_maestro')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMateriales(prev => prev.filter(m => m.id !== id));
      setFeedback({ tipo: 'exito', texto: `"${nombre}" fue eliminado del catálogo.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error al eliminar:', err);
      setFeedback({ tipo: 'error', texto: 'Error al dar de baja: ' + err.message });
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Cargando registro de materiales en banco...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, padding: '30px 16px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', color: colors.textMain }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: `1px solid ${colors.inputBorder}`, paddingBottom: '18px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '24px', margin: '0 0 6px 0', fontWeight: 'bold', color: colors.textMain }}>
              🏦 Mis Materiales y Bancos de Agregados
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary }}>
              Controla precios de grava, arena, piedra braza y bases pétreas en Chiapas
            </p>
          </div>

          <button 
            onClick={() => navigate('/agregar/banco')} 
            style={{ 
              minHeight: '48px', 
              padding: '0 20px', 
              backgroundColor: colors.accent, 
              color: '#1A2332', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '15px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ➕ Publicar Nuevo Material
          </button>
        </div>

        {/* FEEDBACK INTEGRADO */}
        {feedback && (
          <div style={{
            backgroundColor: feedback.tipo === 'error' ? colors.errorBg : colors.exitoBg,
            border: `1px solid ${feedback.tipo === 'error' ? colors.errorBorder : colors.exitoBorder}`,
            color: colors.textMain,
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {feedback.texto}
          </div>
        )}

        {/* ESTADO VACÍO */}
        {materiales.length === 0 ? (
          <div style={{ backgroundColor: colors.card, padding: '50px 20px', borderRadius: '10px', textAlign: 'center', border: `1px dashed ${colors.inputBorder}` }}>
            <p style={{ fontSize: '18px', color: colors.textMain, margin: '0 0 10px 0' }}>No tienes materiales de banco registrados.</p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 24px 0' }}>Publica precios por m³ de agregados pétreos para constructoras y fleteros locales.</p>
            <button 
              onClick={() => navigate('/agregar/banco')}
              style={{ backgroundColor: colors.accent, color: '#1A2332', padding: '12px 24px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
            >
              Dar de Alta Mi Primer Material
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {materiales.map((mat) => (
              <div 
                key={mat.id} 
                style={{ 
                  backgroundColor: colors.card, 
                  border: `1px solid ${colors.inputBorder}`, 
                  borderRadius: '10px', 
                  padding: '20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '16px',
                  opacity: mat.pausado ? 0.8 : 1
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '18px', margin: 0, color: colors.textMain, fontWeight: 'bold' }}>
                      {mat.nombre}
                    </h3>
                    {mat.pausado && (
                      <span style={{ backgroundColor: '#D97724', color: '#1A2332', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        ⏸️ Pausado
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '4px 0' }}>
                    📍 <strong>Ubicación / Tramo:</strong> {mat.ubicacion || 'No especificada'}
                  </p>

                  {mat.contacto && (
                    <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '2px 0' }}>
                      📱 <strong>Teléfono de Despacho:</strong> {mat.contacto}
                    </p>
                  )}

                  <p style={{ fontSize: '16px', color: colors.accent, fontWeight: 'bold', margin: '8px 0 0 0' }}>
                    ${Number(mat.precio_unitario || 0).toLocaleString('es-MX')} MXN <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: 'normal' }}>por {mat.unidad || 'm³'} (en banco)</span>
                  </p>
                </div>

                {/* ACCIONES TÁCTILES */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={() => togglePausa(mat.id, mat.pausado)}
                    disabled={procesandoId === mat.id}
                    style={{ 
                      minHeight: '44px', 
                      padding: '0 16px', 
                      borderRadius: '6px', 
                      border: `1px solid ${colors.inputBorder}`, 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      backgroundColor: mat.pausado ? colors.inputBg : '#1F3D2B', 
                      color: mat.pausado ? colors.textSecondary : '#A3E6B8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {mat.pausado ? '▶️ Activar' : '⏸️ Pausar'}
                  </button>

                  <button 
                    onClick={() => eliminarMaterial(mat.id, mat.nombre)}
                    disabled={procesandoId === mat.id}
                    style={{ 
                      minHeight: '44px', 
                      padding: '0 16px', 
                      borderRadius: '6px', 
                      border: '1px solid #77333B', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      backgroundColor: '#442226', 
                      color: '#FFB3BA',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🗑️ Dar de Baja
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}