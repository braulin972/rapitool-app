import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AdminWert() {
  const navigate = useNavigate();
  const [autorizado, setAutorizado] = useState(false);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  const [tab, setTab] = useState('ordenes'); // 'ordenes' | 'kyc'
  const [ordenes, setOrdenes] = useState([]);
  const [solicitudesKyc, setSolicitudesKyc] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardInner: '#1A2332',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    border: '#3F4E65',
    successBg: '#1F3D2B',
    successBorder: '#2E6343',
    errorBg: '#442226',
    errorBorder: '#77333B',
    goldText: '#F7D070'
  };

  // 1. Candado de seguridad exclusivo para Superadmin
  useEffect(() => {
    async function validarAcceso() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        const esAdmin = 
          user?.app_metadata?.role === 'superadmin' || 
          user?.user_metadata?.role === 'superadmin';

        if (error || !user || !esAdmin) {
          navigate('/');
          return;
        }
        setAutorizado(true);
      } catch {
        navigate('/');
      } finally {
        setCargandoAuth(false);
      }
    }
    validarAcceso();
  }, [navigate]);

  // 2. Consulta desacoplada conforme a las columnas reales de ordenes_servicio
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setMensaje(null);
    try {
      if (tab === 'ordenes') {
        const { data: ordenesData, error: ordenesError } = await supabase
          .from('ordenes_servicio')
          .select('*')
          .order('created_at', { ascending: false });

        if (ordenesError) throw ordenesError;

        // Obtener datos de los arrendadores involucrados
        const provIds = [...new Set((ordenesData || []).map(o => o.proveedor_id).filter(Boolean))];
        let mapaProveedores = {};

        if (provIds.length > 0) {
          const { data: proveedoresData } = await supabase
            .from('perfiles_proveedores')
            .select('usuario_id, nombre_empresa, banco_receptor, clabe_interbancaria, titular_cuenta')
            .in('usuario_id', provIds);

          if (proveedoresData) {
            mapaProveedores = proveedoresData.reduce((acc, p) => {
              acc[p.usuario_id] = p;
              return acc;
            }, {});
          }
        }

        const ordenesMapeadas = (ordenesData || []).map(ord => ({
          ...ord,
          arrendador: mapaProveedores[ord.proveedor_id] || null
        }));

        setOrdenes(ordenesMapeadas);
      } else {
        const { data, error } = await supabase
          .from('solicitudes_verificacion')
          .select('*')
          .order('id', { ascending: false });

        if (error) throw error;
        setSolicitudesKyc(data || []);
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al consultar operaciones.' });
    } finally {
      setCargando(false);
    }
  }, [tab]);

  useEffect(() => {
    if (autorizado) {
      cargarDatos();
    }
  }, [autorizado, tab, cargarDatos]);

  // 3. Conciliar SPEI recibido en cuenta concentradora
  const confirmarCustodiaSPEI = async (ordenId) => {
  try {
    const { error } = await supabase.rpc('conciliar_spei_wert', {
      p_orden_id: ordenId
    });

    if (error) throw error;
    setMensaje({ tipo: 'exito', texto: '✅ Pago SPEI conciliado. Fondos retenidos bajo custodia WERT.' });
    cargarDatos();
  } catch (err) {
    setMensaje({ tipo: 'error', texto: err.message || 'Error al conciliar depósito.' });
  }
};

  // 4. Dictaminar expediente KYC
  const dictaminarVerificacion = async (solicitud) => {
    const confirmar = window.confirm(`¿Aprobar y verificar a "${solicitud.razon_social}"?`);
    if (!confirmar) return;

    try {
      const { error: errorSol } = await supabase
        .from('solicitudes_verificacion')
        .update({ estado: 'aprobado' })
        .eq('id', solicitud.id);

      if (errorSol) throw errorSol;

      const { error: errorPerfil } = await supabase
        .from('perfiles_proveedores')
        .update({ verificado: true })
        .eq('usuario_id', solicitud.usuario_id);

      if (errorPerfil) throw errorPerfil;

      setMensaje({ tipo: 'exito', texto: '✅ Proveedor acreditado formalmente con Sello Oficial.' });
      cargarDatos();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  // 5. Visualizador de archivos
  const verDocumento = async (rutaStorage) => {
    try {
      const { data, error } = await supabase.storage
        .from('expedientes-verificacion')
        .createSignedUrl(rutaStorage, 120);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Error al acceder al documento: ' + err.message);
    }
  };

  const copiarPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto);
    alert(`Copiado: ${texto}`);
  };

  if (cargandoAuth) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>🔐 Verificando credenciales de mesa de control...</p>
      </div>
    );
  }

  if (!autorizado) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.textMain, fontFamily: 'Arial, sans-serif', padding: '30px 20px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: '20px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              🛡️ Mesa de Control <span style={{ color: colors.accent }}>INDUSTRIAS WERT</span>
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textSecondary }}>
              Conciliación de depósitos SPEI, calculadora de dispersión y auditoría de proveedores.
            </p>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: colors.cardInner, padding: '4px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
            <button
              type="button"
              onClick={() => setTab('ordenes')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: tab === 'ordenes' ? colors.accent : 'transparent',
                color: tab === 'ordenes' ? '#1A2332' : colors.textSecondary,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              💼 Órdenes y Escrow
            </button>
            <button
              type="button"
              onClick={() => setTab('kyc')}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: tab === 'kyc' ? colors.accent : 'transparent',
                color: tab === 'kyc' ? '#1A2332' : colors.textSecondary,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              📑 Expedientes de Proveedores
            </button>
          </div>
        </div>

        {/* FEEDBACK */}
        {mensaje && (
          <div style={{
            backgroundColor: mensaje.tipo === 'error' ? colors.errorBg : colors.successBg,
            border: `1px solid ${mensaje.tipo === 'error' ? colors.errorBorder : colors.successBorder}`,
            padding: '14px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {mensaje.texto}
          </div>
        )}

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: colors.textSecondary }}>
            Sincronizando operaciones de mesa...
          </div>
        ) : tab === 'ordenes' ? (
          /* TABLA DE CONCILIACIÓN SPEI */
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', overflowX: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: colors.cardInner, color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 16px' }}>Folio / PIN</th>
                  <th style={{ padding: '14px 16px' }}>Activo / Destino</th>
                  <th style={{ padding: '14px 16px' }}>Monto Bruto</th>
                  <th style={{ padding: '14px 16px' }}>Comisión Wert ({ordenes[0]?.comision_wert_porcentaje || 10}%)</th>
                  <th style={{ padding: '14px 16px' }}>Neto Arrendador</th>
                  <th style={{ padding: '14px 16px' }}>Estado</th>
                  <th style={{ padding: '14px 16px' }}>Cuenta Dispersión</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                      No hay órdenes registradas en el sistema.
                    </td>
                  </tr>
                ) : (
                  ordenes.map((ord) => {
                    // CÓDIGO CORREGIDO:
const neto = Number(ord.monto_neto_proveedor || 0);
const comision = Number(ord.monto_comision_wert || 0);
// ord.monto_total ya contiene neto + comision (incluyendo IVA si aplicó)
const totalBruto = Number(ord.monto_total) > 0 
  ? Number(ord.monto_total) 
  : (neto + comision);

                    const partesCodigo = (ord.codigo_entrega_final || '').split('|');
                    const folioRastreo = partesCodigo[0]?.trim() || `ORD-${ord.id.slice(0, 6)}`;
                    const pin = partesCodigo[1]?.replace('PIN:', '').trim();

                    const estadoNormalizado = (ord.estado || '').toLowerCase();
                    const esConciliable = estadoNormalizado === 'pendiente' || estadoNormalizado === 'pendiente_confirmacion' || estadoNormalizado === 'pendiente_spei';
                    const enCustodia = estadoNormalizado === 'en_custodia_wert';

                    return (
                      <tr key={ord.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>
                          <strong style={{ color: colors.accent, display: 'block', fontSize: '14px' }}>
                            {folioRastreo}
                          </strong>
                          {pin && (
                            <span style={{ fontSize: '11px', color: colors.goldText }}>
                              PIN: {pin}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <strong style={{ color: colors.textMain, display: 'block', fontSize: '14px' }}>
                            {ord.equipo_nombre || 'Maquinaria'}
                          </strong>
                          <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                            📍 {ord.municipio_entrega || 'Chiapas'} • {ord.tipo_flete === 'plataforma' ? '🚚 Con flete' : '🚜 Recolección'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          ${totalBruto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: colors.textSecondary }}>
                          ${comision.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#34D399' }}>
                          ${neto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: enCustodia ? colors.successBg : colors.cardInner,
                            border: `1px solid ${enCustodia ? colors.successBorder : colors.border}`,
                            color: enCustodia ? '#6EE7B7' : colors.goldText
                          }}>
                            {ord.estado}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                          {ord.arrendador ? (
                            <div>
                              <strong style={{ color: colors.textMain, display: 'block' }}>
                                {ord.arrendador.titular_cuenta || ord.arrendador.nombre_empresa}
                              </strong>
                              <span style={{ color: colors.textSecondary }}>{ord.arrendador.banco_receptor || 'Banco n/a'}</span>
                              {ord.arrendador.clabe_interbancaria ? (
                                <button
                                  type="button"
                                  onClick={() => copiarPortapapeles(ord.arrendador.clabe_interbancaria)}
                                  style={{ display: 'block', background: 'none', border: 'none', padding: 0, color: colors.accent, fontFamily: 'monospace', cursor: 'pointer', fontSize: '12px', marginTop: '2px' }}
                                  title="Copiar CLABE"
                                >
                                  {ord.arrendador.clabe_interbancaria} 📋
                                </button>
                              ) : (
                                <span style={{ color: '#E57373', display: 'block' }}>Sin CLABE registrada</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: colors.textSecondary }}>
                              {ord.cliente_nombre ? `Cliente: ${ord.cliente_nombre}` : 'Sin arrendador'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {esConciliable ? (
                            <button
                              type="button"
                              onClick={() => confirmarCustodiaSPEI(ord.id)}
                              style={{
                                backgroundColor: '#10B981',
                                color: '#000',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ✓ Conciliar SPEI
                            </button>
                          ) : enCustodia ? (
                            <span style={{ color: '#34D399', fontSize: '12px', fontWeight: 'bold' }}>
                              🔒 En Custodia
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TABLA DE AUDITORÍA KYC */
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', overflowX: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: colors.cardInner, color: colors.textSecondary, borderBottom: `1px solid ${colors.border}`, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 16px' }}>Proveedor / Empresa</th>
                  <th style={{ padding: '14px 16px' }}>RFC</th>
                  <th style={{ padding: '14px 16px' }}>Expediente Documental</th>
                  <th style={{ padding: '14px 16px' }}>Estado</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Dictamen</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesKyc.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                      No hay expedientes pendientes de auditoría.
                    </td>
                  </tr>
                ) : (
                  solicitudesKyc.map((sol) => (
                    <tr key={sol.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: colors.textMain, display: 'block' }}>{sol.razon_social}</strong>
                        <span style={{ fontSize: '11px', color: colors.textSecondary }}>Tel: {sol.telefono_contacto}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: colors.accent }}>
                        {sol.rfc}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {sol.url_comprobante_fiscal && (
                            <button
                              type="button"
                              onClick={() => verDocumento(sol.url_comprobante_fiscal)}
                              style={{ backgroundColor: colors.cardInner, border: `1px solid ${colors.border}`, color: colors.textMain, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              📄 Constancia SAT
                            </button>
                          )}
                          {sol.url_identificacion_oficial && (
                            <button
                              type="button"
                              onClick={() => verDocumento(sol.url_identificacion_oficial)}
                              style={{ backgroundColor: colors.cardInner, border: `1px solid ${colors.border}`, color: colors.textMain, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              🪪 INE
                            </button>
                          )}
                          {sol.url_titulo_propiedad && (
                            <button
                              type="button"
                              onClick={() => verDocumento(sol.url_titulo_propiedad)}
                              style={{ backgroundColor: colors.cardInner, border: `1px solid ${colors.border}`, color: colors.textMain, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              🚜 Factura Activo
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: sol.estado === 'aprobado' ? colors.successBg : colors.cardInner,
                          border: `1px solid ${sol.estado === 'aprobado' ? colors.successBorder : colors.border}`,
                          color: sol.estado === 'aprobado' ? '#6EE7B7' : colors.goldText
                        }}>
                          {sol.estado}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {sol.estado === 'pendiente_revision' && (
                          <button
                            type="button"
                            onClick={() => dictaminarVerificacion(sol)}
                            style={{
                              backgroundColor: colors.accent,
                              color: '#1A2332',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🛡️ Otorgar Sello Dorado
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}