import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const NO_IMAGE_SVG = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231A2332%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23C5D1E0%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ESin%20Fotograf%C3%ADa%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function InventarioRentas() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardLight: '#324158',
    cardInner: '#1A2332',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    border: '#3F4E65',
    errorBg: '#442226',
    errorBorder: '#77333B',
    exitoBg: '#1F3D2B',
    exitoBorder: '#2E6343',
    pausedBadge: '#D97724',
    activeBadge: '#2E7D32'
  };

  const cargarInventario = useCallback(async (userId) => {
    try {
      setLoading(true);

      // Traemos los productos propios que no hayan sido borrados lógicamente
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id_arrendador', userId)
        .eq('activo', true)
        .order('id', { ascending: false });

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      setFeedback({ tipo: 'error', texto: 'No se pudo recuperar el catálogo de maquinaria.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;

    async function validarSesion() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (montado) navigate('/registro-general?redirect=/inventario/rentas');
        return;
      }
      if (montado) await cargarInventario(user.id);
    }

    validarSesion();

    return () => {
      montado = false;
    };
  }, [navigate, cargarInventario]);

  const handleAlternarPausa = async (id, estadoActualPausado) => {
    try {
      setProcesandoId(id);
      const nuevoEstado = !estadoActualPausado;

      const { data: updatedRows, error } = await supabase.from('productos').update({ pausado: nuevoEstado }).eq('id', id).select('id'); if (error) throw error; if (!updatedRows || updatedRows.length === 0) throw new Error('Permiso denegado por RLS al actualizar estado.');

      setProductos(prev => prev.map(prod => 
        prod.id === id ? { ...prod, pausado: nuevoEstado } : prod
      ));
      
      setFeedback({ 
        tipo: 'exito', 
        texto: nuevoEstado 
          ? '⏸️ Maquinaria pausada: Oculta temporalmente del catálogo público.' 
          : '🟢 Maquinaria activada: Visible para contratación inmediata.' 
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      console.error('Error al pausar/activar:', error);
      setFeedback({ tipo: 'error', texto: `Error: ${error.message || 'No se pudo actualizar la visibilidad.'}` });
    } finally {
      setProcesandoId(null);
    }
  };

  // SOFT DELETE: Mantiene la integridad referencial en ordenes_servicio
  const handleDarDeBaja = async (id, nombre) => {
    const confirmar = window.confirm(
      `¿Confirmas la baja de "${nombre}"?\n\nEl equipo dejará de ofrecerse al público, pero se conservará el histórico de contratos y garantías asociadas.`
    );
    if (!confirmar) return;

    try {
      setProcesandoId(id);

      const { data: deletedRows, error } = await supabase.from('productos').update({ activo: false, pausado: true }).eq('id', id).select('id'); if (error) throw error; if (!deletedRows || deletedRows.length === 0) throw new Error('Permiso denegado por RLS al dar de baja el equipo.');

      setProductos(prev => prev.filter(prod => prod.id !== id));
      setFeedback({ tipo: 'exito', texto: `"${nombre}" fue retirado del catálogo exitosamente.` });
      setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      console.error('Error en baja de equipo:', error);
      setFeedback({ tipo: 'error', texto: `Fallo al retirar: ${error.message}` });
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Verificando inventario de maquinaria en patio...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, padding: '30px 16px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', color: colors.textMain }}>
      <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
        
        {/* ENCABEZADO CON BOTÓN WCAG AAA (Mínimo 48px) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '18px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '24px', margin: '0 0 6px 0', fontWeight: 'bold', color: colors.textMain }}>
              🚜 Mi Inventario de Maquinaria
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary }}>
              Gestión de tarifas operativas, horómetros y estado de resguardo en Chiapas
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/agregar/renta')}
            style={{ 
              minHeight: '48px', 
              padding: '0 22px', 
              backgroundColor: colors.accent, 
              color: '#1A2332', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '15px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxSizing: 'border-box'
            }}
          >
            ➕ Publicar Nuevo Activo
          </button>
        </div>

        {/* FEEDBACK SYSTEM */}
        {feedback && (
          <div style={{
            backgroundColor: feedback.tipo === 'error' ? colors.errorBg : colors.exitoBg,
            border: `1px solid ${feedback.tipo === 'error' ? colors.errorBorder : colors.exitoBorder}`,
            color: colors.textMain,
            padding: '14px 18px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {feedback.texto}
          </div>
        )}

        {/* LISTADO DE ACTIVOS */}
        {productos.length === 0 ? (
          <div style={{ backgroundColor: colors.card, padding: '60px 20px', borderRadius: '10px', textAlign: 'center', border: `1px dashed ${colors.border}` }}>
            <p style={{ fontSize: '18px', color: colors.textMain, margin: '0 0 8px 0', fontWeight: 'bold' }}>No tienes maquinaria en catálogo actualmente.</p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 24px 0' }}>Registra retroexcavadoras, motoconformadoras, excavadoras o compactadores para recibir órdenes de renta bajo custodia.</p>
            <button 
              onClick={() => navigate('/agregar/renta')}
              style={{ minHeight: '48px', backgroundColor: colors.accent, color: '#1A2332', padding: '0 24px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
            >
              Publicar Mi Primer Activo
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {productos.map((prod) => {
              const nombreFinal = prod.nombre_equipo || prod.nombre || 'Maquinaria de Obra';
              const precioDiaFinal = Number(prod.precio_dia || prod.precio || 0);
              const precioHoraFinal = Number(prod.precio_hora || 0);
              const precioMesFinal = Number(prod.precio_mes || 0);
              const enProceso = procesandoId === prod.id;

              return (
                <div 
                  key={prod.id} 
                  style={{ 
                    backgroundColor: colors.card, 
                    border: `1px solid ${colors.border}`, 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    opacity: prod.pausado ? 0.75 : 1,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  {/* IMAGEN Y ESTATUS DE DISPONIBILIDAD */}
                  <div style={{ width: '100%', height: '180px', backgroundColor: colors.cardInner, position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={prod.foto_url || NO_IMAGE_SVG} 
                      alt={nombreFinal} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { 
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = NO_IMAGE_SVG; 
                      }}
                    />

                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      {prod.pausado ? (
                        <span style={{ backgroundColor: colors.pausedBadge, color: '#1A2332', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          ⏸️ En Mantenimiento / Pausado
                        </span>
                      ) : (
                        <span style={{ backgroundColor: colors.activeBadge, color: '#FFF', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          🟢 Disponible en Catálogo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ESPECIFICACIONES Y TARIFAS */}
                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', margin: '0 0 12px 0', color: colors.textMain, fontWeight: 'bold' }}>
                        {nombreFinal}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: colors.textSecondary }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>⏱️ Horómetro:</span>
                          <strong style={{ color: colors.textMain }}>{prod.horometro || 0} hrs</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>⚖️ Peso Operativo:</span>
                          <strong style={{ color: colors.textMain }}>{prod.peso_kg ? `${Number(prod.peso_kg).toLocaleString('es-MX')} Kg` : 'A consultar'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>📍 Patio:</span>
                          <strong style={{ color: colors.textMain, maxWidth: '170px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={prod.ubicacion_almacen || prod.ubicacion}>
                            {prod.ubicacion_almacen || prod.ubicacion || 'Tuxtla Gutiérrez'}
                          </strong>
                        </div>
                      </div>

                      {/* TARIFARIO */}
                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                        {precioHoraFinal > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Por Hora:</span>
                            <span style={{ color: colors.textMain }}>${precioHoraFinal.toLocaleString('es-MX')} MXN</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: colors.textSecondary }}>Por Día:</span>
                          <strong style={{ color: colors.accent, fontSize: '15px' }}>${precioDiaFinal.toLocaleString('es-MX')} MXN</strong>
                        </div>
                        {precioMesFinal > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Por Mes:</span>
                            <span style={{ color: colors.textMain }}>${precioMesFinal.toLocaleString('es-MX')} MXN</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BOTONERA ACCESIBLE WCAG AAA (Mínimo 48px) */}
                    <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => navigate(`/editar/renta/${prod.id}`)}
                        disabled={enProceso}
                        style={{ 
                          flex: 1, 
                          minHeight: '48px', 
                          backgroundColor: colors.cardInner, 
                          color: colors.textMain, 
                          border: `1px solid ${colors.border}`, 
                          borderRadius: '6px', 
                          fontSize: '13px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}
                      >
                        ✏️ Editar
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleAlternarPausa(prod.id, prod.pausado)}
                        disabled={enProceso}
                        style={{ 
                          flex: 1, 
                          minHeight: '48px', 
                          backgroundColor: colors.cardInner, 
                          color: prod.pausado ? colors.accent : colors.textSecondary, 
                          border: `1px solid ${colors.border}`, 
                          borderRadius: '6px', 
                          fontSize: '13px', 
                          fontWeight: 'bold', 
                          cursor: enProceso ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}
                      >
                        {prod.pausado ? '▶️ Activar' : '⏸️ Pausar'}
                      </button>

                      <button 
                        type="button"
                        onClick={() => handleDarDeBaja(prod.id, nombreFinal)}
                        disabled={enProceso}
                        style={{ 
                          minHeight: '48px', 
                          minWidth: '48px', 
                          padding: '0 12px', 
                          backgroundColor: colors.errorBg, 
                          color: '#FFB3BA', 
                          border: `1px solid ${colors.errorBorder}`, 
                          borderRadius: '6px', 
                          fontSize: '15px', 
                          fontWeight: 'bold', 
                          cursor: enProceso ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}
                        title="Retirar equipo (Baja de catálogo preservando contratos)"
                      >
                        🗑️
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}