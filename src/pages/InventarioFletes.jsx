import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function InventarioFletes() {
  const [fletes, setFletes] = useState([]);
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
    cargarFletes();
  }, []);

  const cargarFletes = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        navigate('/registro-general?redirect=/inventario/fletes');
        return;
      }

      const { data, error } = await supabase
        .from('datos_fletero')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('id', { ascending: false });

      if (error) throw error;
      setFletes(data || []);
    } catch (err) {
      console.error('Error al cargar fletes:', err);
      setFeedback({ tipo: 'error', texto: 'No se pudieron recuperar tus unidades de flete.' });
    } finally {
      setLoading(false);
    }
  };

  const togglePausa = async (id, estadoActual) => {
    try {
      setProcesandoId(id);
      const { error } = await supabase
        .from('datos_fletero')
        .update({ pausado: !estadoActual })
        .eq('id', id);

      if (error) throw error;

      setFletes(prev => prev.map(f => f.id === id ? { ...f, pausado: !estadoActual } : f));
      setFeedback({
        tipo: 'exito',
        texto: estadoActual ? 'Unidad activada en el catálogo logístico.' : 'Unidad pausada de asignación.'
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      setFeedback({ tipo: 'error', texto: 'Error al cambiar estado: ' + err.message });
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarUnidad = async (id, tipo) => {
    const confirmar = window.confirm(`¿Deseas eliminar permanentemente la unidad "${tipo}" de tu padrón?`);
    if (!confirmar) return;

    try {
      setProcesandoId(id);
      const { error } = await supabase
        .from('datos_fletero')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFletes(prev => prev.filter(f => f.id !== id));
      setFeedback({ tipo: 'exito', texto: 'Unidad de transporte eliminada con éxito.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error al eliminar unidad:', err);
      setFeedback({ tipo: 'error', texto: 'Error al eliminar: ' + err.message });
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Cargando padrón de unidades de flete...</p>
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
              🚛 Mis Unidades de Flete y Acarreo
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary }}>
              Gestiona camiones de volteo, tolvas, góndolas y plataformas registradas en Chiapas
            </p>
          </div>

          <button 
            onClick={() => navigate('/agregar/flete')} 
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
            ➕ Registrar Nueva Unidad
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
        {fletes.length === 0 ? (
          <div style={{ backgroundColor: colors.card, padding: '50px 20px', borderRadius: '10px', textAlign: 'center', border: `1px dashed ${colors.inputBorder}` }}>
            <p style={{ fontSize: '18px', color: colors.textMain, margin: '0 0 10px 0' }}>No tienes unidades de carga dadas de alta.</p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 24px 0' }}>Publica tus camiones de volteo o plataformas para asignarlos a frentes de obra y acarreos.</p>
            <button 
              onClick={() => navigate('/agregar/flete')}
              style={{ backgroundColor: colors.accent, color: '#1A2332', padding: '12px 24px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
            >
              Registrar Mi Primera Unidad
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fletes.map((item) => (
              <div 
                key={item.id} 
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
                  opacity: item.pausado ? 0.8 : 1
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '18px', margin: 0, color: colors.textMain, fontWeight: 'bold' }}>
                      {item.tipo_unidad}
                    </h3>
                    <span style={{ backgroundColor: colors.inputBg, color: colors.accent, border: `1px solid ${colors.inputBorder}`, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      Capacidad: {item.capacidad}
                    </span>
                    {item.pausado && (
                      <span style={{ backgroundColor: '#D97724', color: '#1A2332', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        ⏸️ En Pausa
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '4px 0' }}>
                    📍 <strong>Base:</strong> {item.ubicacion_base || 'No especificada'}
                  </p>
                  
                  {item.contacto_telefono && (
                    <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '2px 0' }}>
                      📱 <strong>Contacto directo:</strong> {item.contacto_telefono}
                    </p>
                  )}

                  <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px' }}>
                    <span style={{ color: colors.textSecondary }}>
                      Tarifa Base: <strong style={{ color: colors.accent }}>${Number(item.tarifa_base || 0).toLocaleString('es-MX')} MXN</strong>
                    </span>
                    <span style={{ color: colors.textSecondary }}>
                      Km Adicional: <strong style={{ color: colors.textMain }}>${Number(item.precio_km || 0).toLocaleString('es-MX')} MXN</strong>
                    </span>
                  </div>

                  {item.descripcion && (
                    <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '8px 0 0 0', fontStyle: 'italic' }}>
                      "{item.descripcion}"
                    </p>
                  )}
                </div>

                {/* BOTONES TÁCTILES ACCESIBLES */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={() => togglePausa(item.id, item.pausado)}
                    disabled={procesandoId === item.id}
                    style={{ 
                      minHeight: '44px', 
                      padding: '0 16px', 
                      borderRadius: '6px', 
                      border: `1px solid ${colors.inputBorder}`, 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      backgroundColor: item.pausado ? colors.inputBg : '#1F3D2B', 
                      color: item.pausado ? colors.textSecondary : '#A3E6B8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {item.pausado ? '▶️ Activar' : '⏸️ Pausar'}
                  </button>

                  <button 
                    onClick={() => eliminarUnidad(item.id, item.tipo_unidad)}
                    disabled={procesandoId === item.id}
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
                    🗑️ Eliminar
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