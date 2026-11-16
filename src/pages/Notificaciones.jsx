import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Notificaciones() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardRead: '#1E2735',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    inputBorder: '#3F4E65',
    unreadBorder: '#E58A3C',
    readBorder: '#324158'
  };

  useEffect(() => {
    async function inicializar() {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          navigate('/registro-general?redirect=/notificaciones');
          return;
        }

        await obtenerNotificaciones(session.user.id);
      } catch (err) {
        console.error('Error al inicializar notificaciones:', err);
      } finally {
        setLoading(false);
      }
    }
    inicializar();
  }, [navigate]);

  const obtenerNotificaciones = async (userId) => {
    // Consulta resiliente tolerando 'created_at' o id decreciente
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', userId)
      .order('id', { ascending: false });

    if (!error && data) {
      setLista(data);
    }
  };

  const marcarComoLeida = async (id) => {
    // Actualización optimista local
    setLista(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar notificación:', error);
      setFeedback('No se pudo marcar la notificación como leída en el servidor.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const marcarTodasComoLeidas = async () => {
    const noLeidasIds = lista.filter(n => !n.leido).map(n => n.id);
    if (noLeidasIds.length === 0) return;

    setLista(prev => prev.map(n => ({ ...n, leido: true })));

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .in('id', noLeidasIds);

    if (error) {
      console.error('Error al marcar todas:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '85vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Sincronizando centro de avisos...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '85vh', color: colors.textMain, fontFamily: 'Arial, sans-serif', padding: '30px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        
        {/* CABECERA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: `1px solid ${colors.inputBorder}`, paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', margin: '0 0 4px 0', fontWeight: 'bold', color: colors.textMain }}>
              🔔 Alertas y Confirmaciones
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>
              Avisos operativos sobre rentas, fletes y material en banco
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {lista.some(n => !n.leido) && (
              <button 
                onClick={marcarTodasComoLeidas}
                style={{ 
                  minHeight: '40px',
                  padding: '0 14px', 
                  backgroundColor: 'transparent', 
                  border: `1px solid ${colors.inputBorder}`, 
                  borderRadius: '6px', 
                  color: colors.textSecondary, 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  fontWeight: 'bold' 
                }}
              >
                Marcar todas leídas
              </button>
            )}
            
            <Link 
              to="/" 
              style={{ 
                minHeight: '40px', 
                padding: '0 14px', 
                backgroundColor: colors.card, 
                border: `1px solid ${colors.inputBorder}`, 
                borderRadius: '6px', 
                color: colors.textMain, 
                fontSize: '13px', 
                textDecoration: 'none', 
                display: 'inline-flex', 
                alignItems: 'center', 
                fontWeight: 'bold' 
              }}
            >
              ← Volver
            </Link>
          </div>
        </div>

        {feedback && (
          <div style={{ backgroundColor: '#442226', border: '1px solid #77333B', color: colors.textMain, padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {feedback}
          </div>
        )}

        {/* LISTADO DE AVISOS */}
        {lista.length === 0 ? (
          <div style={{ backgroundColor: colors.card, padding: '40px 20px', borderRadius: '10px', textAlign: 'center', border: `1px dashed ${colors.inputBorder}`, marginTop: '20px' }}>
            <p style={{ fontSize: '16px', color: colors.textMain, margin: '0 0 6px 0' }}>Bandeja limpia</p>
            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>No tienes notificaciones pendientes ni confirmaciones en cola.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lista.map((n) => {
              const fechaTexto = n.created_at || n.creado_at;
              return (
                <div 
                  key={n.id} 
                  style={{
                    backgroundColor: n.leido ? colors.cardRead : colors.card,
                    border: `1px solid ${n.leido ? colors.readBorder : colors.inputBorder}`,
                    borderLeft: `5px solid ${n.leido ? colors.readBorder : colors.unreadBorder}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: n.leido ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0', color: n.leido ? colors.textSecondary : colors.textMain, fontSize: '16px', fontWeight: 'bold' }}>
                      {n.titulo || 'Aviso de Operación'}
                    </h3>
                    <p style={{ margin: '0 0 6px 0', color: colors.textSecondary, fontSize: '14px', lineHeight: '1.4' }}>
                      {n.mensaje}
                    </p>
                    {fechaTexto && (
                      <span style={{ color: '#8898AA', fontSize: '12px' }}>
                        🕒 {new Date(fechaTexto).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  {!n.leido && (
                    <button 
                      onClick={() => marcarComoLeida(n.id)}
                      style={{ 
                        minHeight: '44px',
                        padding: '0 14px', 
                        backgroundColor: colors.accent, 
                        color: '#1A2332', 
                        border: 'none', 
                        borderRadius: '6px', 
                        fontSize: '13px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ✔ Leída
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}