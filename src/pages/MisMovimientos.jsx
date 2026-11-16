import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function MisMovimientos() {
  const [vistaRol, setVistaRol] = useState('cliente'); // 'cliente' | 'arrendador' | 'fletero'
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiadoId, setCopiadoId] = useState(null);
  const [pinInput, setPinInput] = useState({});
  const [verificandoPin, setVerificandoPin] = useState(false);
  const navigate = useNavigate();

  // Datos bancarios concentradores para depósito en garantía Wert
  const clabeBancaria = import.meta.env.VITE_CLABE_CUSTODIA || "012100015572650984";
  const bancoConcentrador = import.meta.env.VITE_BANCO_CUSTODIA || "BBVA México";
  const titularConcentrador = import.meta.env.VITE_TITULAR_CUSTODIA || "Jorge Braulio Nieto Gallegos";

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardLight: '#324158',
    cardInner: '#1A2332',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    inputBg: '#1A2332',
    inputBorder: '#3F4E65',
    statusPending: '#D97724',
    statusActive: '#2E7D32',
    statusDone: '#1976D2',
    goldText: '#F7D070',
    successBg: '#1F3D2B',
    successBorder: '#2E6343'
  };

  const sincronizarOrdenes = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        navigate('/registro-general?redirect=/mis-movimientos');
        return;
      }

      const uid = session.user.id;
      let query = supabase.from('ordenes_servicio').select('*');

      if (vistaRol === 'cliente') {
        query = query.eq('cliente_id', uid);
      } else if (vistaRol === 'arrendador') {
        query = query.eq('proveedor_id', uid);
      } else {
        // Fletero: órdenes con flete asignado
        query = query.eq('tipo_flete', 'plataforma');
      }

      // Ordenar cronológicamente por created_at
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setOrdenes(data || []);
    } catch (err) {
      console.error('Error al sincronizar ordenes:', err);
    } finally {
      setLoading(false);
    }
  }, [vistaRol, navigate]);

  useEffect(() => {
    sincronizarOrdenes();
  }, [sincronizarOrdenes]);

  const copiarPortapapeles = async (texto, idEtiqueta) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(idEtiqueta);
      setTimeout(() => setCopiadoId(null), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = texto;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiadoId(idEtiqueta);
      setTimeout(() => setCopiadoId(null), 2500);
    }
  };

  const traducirEstado = (estado) => {
    const est = (estado || '').toLowerCase();
    switch (est) {
      case 'pendiente':
      case 'pendiente_spei':
      case 'pendiente_confirmacion':
        return { label: '⏳ Esperando Validación SPEI', color: colors.statusPending };
      case 'en_custodia_wert':
        return { label: '🔒 Fondos en Custodia Wert', color: '#34D399' };
      case 'en_camino':
        return { label: '🚚 En Traslado a Obra', color: colors.accent };
      case 'en_obra':
        return { label: '🟢 Maquinaria en Operación', color: colors.statusActive };
      case 'finalizado':
        return { label: '✅ Renta Concluida', color: colors.statusDone };
      default:
        return { label: estado || 'Procesando', color: colors.textSecondary };
    }
  };

  // Validación del PIN por el Arrendador
  const handleValidarEntrega = async (orden) => {
    const pinIngresado = pinInput[orden.id]?.trim();
    const partes = (orden.codigo_entrega_final || '').split('|');
    const pinReal = partes[1]?.replace('PIN:', '').trim();

    if (!pinIngresado) {
      alert('Ingresa el PIN de 4 dígitos proporcionado por el cliente en obra.');
      return;
    }

    if (pinIngresado !== pinReal) {
      alert('⚠️ PIN Incorrecto. Verifica el código de 4 dígitos que tiene el cliente en su pantalla.');
      return;
    }

    setVerificandoPin(true);
    try {
      const { error } = await supabase
        .from('ordenes_servicio')
        .update({
          pin_verificado: true,
          estado: 'en_obra'
        })
        .eq('id', orden.id);

      if (error) throw error;
      alert('✅ PIN verificado con éxito. Maquinaria entregada formalmente en obra.');
      sincronizarOrdenes();
    } catch (err) {
      alert('Error al validar entrega: ' + err.message);
    } finally {
      setVerificandoPin(false);
    }
  };

  // Identificar si la orden más reciente del cliente está pendiente de depósito
  const ordenPendienteReciente = vistaRol === 'cliente' 
    ? ordenes.find(o => (o.estado || '').toLowerCase() === 'pendiente') 
    : null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Cargando registro de operaciones y custodia...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, padding: '30px 16px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', color: colors.textMain }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        
        {/* CABECERA */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 6px 0', fontWeight: 'bold', color: colors.textMain }}>
            📊 Centro de Control de Rentas y Custodia
          </h1>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>
            Trazabilidad de fondos retenidos, validación SPEI y estatus de maquinaria en patio y obra
          </p>
        </div>

        {/* BANNER DESTACADO SI HAY UNA ORDEN PENDIENTE DE DEPÓSITO */}
        {ordenPendienteReciente && (
          <div style={{ backgroundColor: colors.card, border: `2px solid ${colors.accent}`, borderRadius: '10px', padding: '20px', marginBottom: '25px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span style={{ backgroundColor: '#D97724', color: '#1A2332', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  Acción Requerida
                </span>
                <h2 style={{ fontSize: '18px', margin: '6px 0 0 0', color: colors.textMain, fontWeight: 'bold' }}>
                  Transferencia SPEI Pendiente para: {ordenPendienteReciente.equipo_nombre}
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block' }}>Total a Transferir:</span>
                <strong style={{ fontSize: '20px', color: colors.accent }}>
                  ${Number(ordenPendienteReciente.monto_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </strong>
              </div>
            </div>

            <div style={{ backgroundColor: colors.cardInner, padding: '14px', borderRadius: '8px', border: `1px solid ${colors.inputBorder}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', color: colors.textSecondary, display: 'block' }}>CLABE Concentradora Wert:</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px', color: colors.textMain }}>{clabeBancaria}</span>
                  <button
                    type="button"
                    onClick={() => copiarPortapapeles(clabeBancaria, 'banner-clabe')}
                    style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: copiadoId === 'banner-clabe' ? colors.successBg : colors.card, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {copiadoId === 'banner-clabe' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '2px', display: 'block' }}>
                  Banco: {bancoConcentrador} • Titular: {titularConcentrador}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#F8B667', display: 'block', fontWeight: 'bold' }}>Concepto Obligatorio (Folio):</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px', color: colors.accent }}>
                    {(ordenPendienteReciente.codigo_entrega_final || '').split('|')[0]?.trim()}
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarPortapapeles((ordenPendienteReciente.codigo_entrega_final || '').split('|')[0]?.trim(), 'banner-folio')}
                    style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: copiadoId === 'banner-folio' ? colors.successBg : colors.card, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {copiadoId === 'banner-folio' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '2px', display: 'block' }}>
                  * Pega este folio en el concepto de tu app bancaria.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SELECTOR DE PESTAÑAS */}
        <div style={{ display: 'flex', backgroundColor: colors.card, padding: '6px', borderRadius: '8px', marginBottom: '25px', border: `1px solid ${colors.inputBorder}`, gap: '6px' }}>
          {[
            { id: 'cliente', label: '👤 Mis Rentas (Cliente)' },
            { id: 'arrendador', label: '🚜 Despacho Arrendador' },
            { id: 'fletero', label: '🚛 Logística / Fletes' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setVistaRol(t.id)}
              style={{
                flex: 1,
                minHeight: '44px',
                backgroundColor: vistaRol === t.id ? colors.accent : 'transparent',
                color: vistaRol === t.id ? '#1A2332' : colors.textSecondary,
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {ordenes.length === 0 ? (
          <div style={{ backgroundColor: colors.card, padding: '40px 20px', borderRadius: '10px', textAlign: 'center', border: `1px dashed ${colors.inputBorder}` }}>
            <p style={{ fontSize: '16px', color: colors.textMain, margin: '0 0 10px 0' }}>
              {vistaRol === 'cliente' 
                ? 'No tienes solicitudes ni rentas activas en este momento.' 
                : vistaRol === 'arrendador'
                ? 'No tienes rentas entrantes asignadas a tus equipos.'
                : 'No hay fletes ni traslados pendientes asignados.'}
            </p>
            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '0 0 20px 0' }}>
              {vistaRol === 'cliente' ? 'Explora el catálogo de maquinaria pesada disponible en Chiapas.' : 'Revisa tus equipos publicados en patio.'}
            </p>
            {vistaRol === 'cliente' ? (
              <Link 
                to="/" 
                style={{ display: 'inline-block', backgroundColor: colors.accent, color: '#1A2332', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
              >
                Ver Catálogo de Maquinaria
              </Link>
            ) : (
              <Link 
                to="/inventario/rentas" 
                style={{ display: 'inline-block', backgroundColor: colors.accent, color: '#1A2332', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
              >
                Administrar Mis Equipos
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {ordenes.map((ord) => {
              const est = traducirEstado(ord.estado);
              const partesCodigo = (ord.codigo_entrega_final || '').split('|');
              const folioRastreo = partesCodigo[0]?.trim() || `WRT-ORD-${ord.id}`;
              const pin = partesCodigo[1]?.replace('PIN:', '').trim();
              const esPendientePago = (ord.estado || '').toLowerCase() === 'pendiente';
              const montoTotalMostrar = Number(ord.monto_total || (Number(ord.monto_neto_proveedor || 0) + Number(ord.monto_comision_wert || 0) + Number(ord.iva || 0)));

              return (
                <div 
                  key={ord.id} 
                  style={{ 
                    backgroundColor: colors.card, 
                    borderRadius: '10px', 
                    border: `1px solid ${colors.inputBorder}`, 
                    padding: '22px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>
                        Orden #{ord.id} • {ord.created_at ? new Date(ord.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                      </span>
                      <h3 style={{ fontSize: '19px', margin: 0, color: colors.textMain, fontWeight: 'bold' }}>
                        {ord.equipo_nombre || 'Maquinaria Pesada'}
                      </h3>
                    </div>

                    <span style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}`, color: est.color, padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                      {est.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '14px', lineHeight: '1.6' }}>
                    <p style={{ margin: '2px 0' }}>📍 <strong>Destino:</strong> {ord.municipio_entrega || 'Chiapas'} ({ord.tipo_flete === 'plataforma' ? 'Flete Oficial en Cama Baja' : 'Autoflete / Recolección en Patio'})</p>
                    {vistaRol === 'arrendador' && (
                      <p style={{ margin: '2px 0' }}>👤 <strong>Cliente:</strong> {ord.cliente_nombre} • Tel: {ord.cliente_telefono}</p>
                    )}
                    
                    {/* Solo el cliente ve el PIN para dictárselo al arrendador */}
                    {vistaRol === 'cliente' && pin && (
                      <p style={{ margin: '2px 0', color: colors.goldText }}>
                        🔑 <strong>PIN de Liberación en Obra:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px' }}>{pin}</span>
                      </p>
                    )}
                  </div>

                  {/* DESGLOSE FINANCIERO */}
                  <div style={{ backgroundColor: colors.inputBg, padding: '14px 16px', borderRadius: '6px', border: `1px solid ${colors.inputBorder}`, fontSize: '14px', marginBottom: esPendientePago && vistaRol === 'cliente' ? '16px' : '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: colors.textSecondary }}>
                        {vistaRol === 'arrendador' ? 'Monto a Recibir (Neto):' : 'Importe Total en Garantía:'}
                      </span>
                      <span style={{ fontWeight: 'bold', color: colors.accent, fontSize: '18px' }}>
                        ${(vistaRol === 'arrendador' ? Number(ord.monto_neto_proveedor || 0) : montoTotalMostrar).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                      </span>
                    </div>
                  </div>

                  {/* MÓDULO DE VALIDACIÓN DE PIN EXCLUSIVO PARA ARRENDADOR */}
                  {vistaRol === 'arrendador' && ord.estado === 'en_custodia_wert' && !ord.pin_verificado && (
                    <div style={{ marginTop: '14px', padding: '14px', backgroundColor: colors.cardInner, borderRadius: '6px', border: `1px dashed ${colors.accent}` }}>
                      <span style={{ fontSize: '12px', color: colors.goldText, fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                        🚜 Protocolo de Entrega en Sitio / Obra:
                      </span>
                      <p style={{ fontSize: '11px', color: colors.textSecondary, margin: '0 0 10px 0' }}>
                        Solicita al cliente el PIN de 4 dígitos que aparece en su pantalla al momento de entregar la máquina.
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="PIN"
                          value={pinInput[ord.id] || ''}
                          onChange={(e) => setPinInput({ ...pinInput, [ord.id]: e.target.value })}
                          style={{ width: '100px', padding: '8px', backgroundColor: colors.bg, border: `1px solid ${colors.inputBorder}`, borderRadius: '4px', color: colors.textMain, textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px' }}
                        />
                        <button
                          type="button"
                          disabled={verificandoPin}
                          onClick={() => handleValidarEntrega(ord)}
                          style={{ backgroundColor: '#10B981', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                        >
                          {verificandoPin ? 'Validando...' : '✓ Validar Entrega y Activar Renta'}
                        </button>
                      </div>
                    </div>
                  )}

                  {ord.pin_verificado && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, borderRadius: '6px', fontSize: '12px', color: '#6EE7B7', fontWeight: 'bold' }}>
                      ✓ Entrega certificada por PIN en obra. Horómetro activo.
                    </div>
                  )}

                  {/* FICHA PERMANENTE SPEI PARA EL CLIENTE SI ESTÁ PENDIENTE */}
                  {esPendientePago && vistaRol === 'cliente' && (
                    <div style={{ backgroundColor: colors.cardInner, padding: '18px', borderRadius: '8px', border: `1px solid ${colors.accent}` }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.goldText, fontWeight: 'bold', textTransform: 'uppercase' }}>
                        🏦 Datos para Transferencia SPEI (Custodia Wert)
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: colors.textSecondary, display: 'block' }}>CLABE Interbancaria:</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px', color: colors.textMain }}>{clabeBancaria}</span>
                            <button
                              type="button"
                              onClick={() => copiarPortapapeles(clabeBancaria, `clabe-${ord.id}`)}
                              style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: copiadoId === `clabe-${ord.id}` ? colors.successBg : colors.card, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: '4px', cursor: 'pointer' }}
                            >
                              {copiadoId === `clabe-${ord.id}` ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: '#F8B667', display: 'block', fontWeight: 'bold' }}>Concepto / Motivo exacto a colocar:</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px', color: colors.accent }}>{folioRastreo}</span>
                            <button
                              type="button"
                              onClick={() => copiarPortapapeles(folioRastreo, `folio-${ord.id}`)}
                              style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: copiadoId === `folio-${ord.id}` ? colors.successBg : colors.card, border: `1px solid ${colors.inputBorder}`, color: colors.textMain, borderRadius: '4px', cursor: 'pointer' }}
                            >
                              {copiadoId === `folio-${ord.id}` ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.textSecondary }}>
                          Banco: <strong>{bancoConcentrador}</strong> | Beneficiario: <strong>{titularConcentrador}</strong>
                        </p>
                      </div>
                    </div>
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