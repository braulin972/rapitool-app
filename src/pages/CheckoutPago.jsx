import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CheckoutPago() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [copiadoClabe, setCopiadoClabe] = useState(false);
  const [copiadoReferencia, setCopiadoReferencia] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Persistencia blindada: recupera de location.state o de sessionStorage ante un F5
  const datosPrevios = useMemo(() => {
    if (location.state && Object.keys(location.state).length > 0) {
      sessionStorage.setItem('wert_checkout_cache', JSON.stringify(location.state));
      return location.state;
    }
    const cache = sessionStorage.getItem('wert_checkout_cache');
    return cache ? JSON.parse(cache) : {};
  }, [location.state]);

  const proveedorId = datosPrevios.proveedorId || null;
  const nombreEquipo = datosPrevios.nombreEquipo || "Maquinaria / Equipo";
  const empresa = datosPrevios.empresa || "Proveedor Certificado";
  const costoRenta = Number(datosPrevios.costoRenta) || 0;
  const costoFlete = Number(datosPrevios.costoFlete) || 0;
  const detallesTiempo = datosPrevios.detallesTiempo || "Periodo acordado";
  const tipoFlete = datosPrevios.tipoFlete || "plataforma";
  const municipioObra = datosPrevios.municipio || "Tuxtla Gutiérrez";
  const esExtension = Boolean(datosPrevios.esExtension || false);
  const ordenPadreId = datosPrevios.ordenPadreId || null;

  // Generación de Folio y PIN
  const [folioRastreo] = useState(() => {
    const prefijoEquipo = (nombreEquipo.split(' ')[0] || 'EQ').toUpperCase().slice(0, 4);
    const timeSlice = Date.now().toString().slice(-4);
    const saltRandom = Math.floor(100 + Math.random() * 900);
    return `WRT-${prefijoEquipo}-${timeSlice}${saltRandom}`;
  });

  const [pinEntrega] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());

  // Variables bancarias
  const clabeBancaria = import.meta.env.VITE_CLABE_CUSTODIA || "012100015572650984";
  const bancoConcentrador = import.meta.env.VITE_BANCO_CUSTODIA || "BBVA México";
  const titularConcentrador = import.meta.env.VITE_TITULAR_CUSTODIA || "Jorge Braulio Nieto Gallegos";

  // Facturación CFDI 4.0
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [rfcFiscal, setRfcFiscal] = useState('');
  const [razonSocialFiscal, setRazonSocialFiscal] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('601');
  const [codigoPostalFiscal, setCodigoPostalFiscal] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');

  // Método de pago (SPEI activo, Tarjeta preparado como Próximamente)
  const [metodoPago, setMetodoPago] = useState('spei');

  // 2. MOTOR MATEMÁTICO DE COMISIONES ESCALONADAS (WERT)
  const calculoFinanciero = useMemo(() => {
    const subtotalServicio = costoRenta + costoFlete;
    let tarifaFija = 0;
    let porcentajeComision = 0;
    let comisionVariable = 0;

    if (subtotalServicio <= 5000) {
      // Escalafón 1: Servicios Cortos (< $5,000)
      // Si es extensión sobre la marcha, la tarifa base no se vuelve a cobrar
      tarifaFija = esExtension ? 0 : 40.00;
      porcentajeComision = 0;
      comisionVariable = 0;
    } else if (subtotalServicio <= 30000) {
      // Escalafón 2: Medianos ($5,001 a $30,000)
      // 8.5% inicial, 4.5% renovación
      porcentajeComision = ordenPadreId ? 4.50 : 8.50;
      comisionVariable = Math.round((subtotalServicio * (porcentajeComision / 100)) * 100) / 100;
      tarifaFija = 0;
    } else {
      // Escalafón 3: Proyectos Grandes ($30,001 a $180,000)
      // 3.5% con tope absoluto de $5,000 MXN
      porcentajeComision = 3.50;
      const comisionCalculada = subtotalServicio * 0.035;
      comisionVariable = Math.min(Math.round(comisionCalculada * 100) / 100, 5000.00);
      tarifaFija = 0;
    }

    const comisionTotalWert = tarifaFija + comisionVariable;
    const netoProveedor = subtotalServicio - comisionTotalWert;
    const costoPasarela = 0; // SPEI = $0.00

    const ivaCalculado = requiereFactura ? Math.round(subtotalServicio * 0.16 * 100) / 100 : 0;
    const totalGarantia = subtotalServicio + ivaCalculado + costoPasarela;

    return {
      subtotalServicio,
      tarifaFija,
      porcentajeComision,
      comisionTotalWert,
      netoProveedor,
      costoPasarela,
      ivaCalculado,
      totalGarantia
    };
  }, [costoRenta, costoFlete, esExtension, ordenPadreId, requiereFactura]);

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

  useEffect(() => {
    async function verificarAutenticacion() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/registro-general', { state: { returnUrl: location.pathname, datosPrevios } });
        return;
      }
      setUser(authUser);
    }
    verificarAutenticacion();
  }, [navigate, location.pathname, datosPrevios]);

  const copiarPortapapeles = async (texto, setEstado) => {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado(true);
      setTimeout(() => setEstado(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = texto;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setEstado(true);
      setTimeout(() => setEstado(false), 2500);
    }
  };

  const handleConfirmarOrden = async () => {
    if (!user) {
      setErrorMsg('Debes contar con una sesión activa para formalizar la orden.');
      return;
    }

    if (!proveedorId) {
      setErrorMsg('Error de asignación: No se detectó el arrendador. Vuelve a seleccionar la máquina.');
      return;
    }

    if (proveedorId === user.id) {
      setErrorMsg('Inconsistencia: No puedes rentarte maquinaria a ti mismo.');
      return;
    }

    if (calculoFinanciero.totalGarantia <= 0) {
      setErrorMsg('El importe total no es válido. Revisa tu cotización.');
      return;
    }

    if (requiereFactura && (!rfcFiscal.trim() || !razonSocialFiscal.trim() || !codigoPostalFiscal.trim())) {
      setErrorMsg('Por favor completa los campos fiscales obligatorios para emitir la factura.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const nombreCliente = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente Industrias Wert';
      const telefonoCliente = user.user_metadata?.telefono || user.phone || '9610000000';

      const { error: ordenError } = await supabase
  .from('ordenes_servicio')
  .insert({
    cliente_id: user.id,
    proveedor_id: proveedorId,
    orden_padre_id: ordenPadreId,
    es_extension: esExtension,
    equipo_nombre: nombreEquipo,
    municipio_entrega: municipioObra,
    cliente_nombre: nombreCliente,
    cliente_telefono: telefonoCliente,
    tipo_flete: tipoFlete,
    codigo_entrega_final: `${folioRastreo} | PIN:${pinEntrega}`,
    estado: 'Pendiente',
    custodia_actual: 'Arrendador',
    monto_total: calculoFinanciero.totalGarantia,
    comision_wert_porcentaje: calculoFinanciero.porcentajeComision,
    monto_comision_wert: calculoFinanciero.comisionTotalWert,
    monto_neto_proveedor: calculoFinanciero.netoProveedor,
    requiere_factura: requiereFactura,
    iva: calculoFinanciero.ivaCalculado,
    rfc_fiscal: requiereFactura ? rfcFiscal.trim().toUpperCase() : null,
    razon_social_fiscal: requiereFactura ? razonSocialFiscal.trim() : null,
    regimen_fiscal: requiereFactura ? regimenFiscal : null,
    cp_fiscal: requiereFactura ? codigoPostalFiscal.trim() : null,
    uso_cfdi: requiereFactura ? usoCfdi : null
  });
      if (ordenError) throw ordenError;

      // Limpiar cache local al completar con éxito
      sessionStorage.removeItem('wert_checkout_cache');

      try {
        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          titulo: 'Folio SPEI Generado',
          mensaje: `Se emitió el folio ${folioRastreo} por $${calculoFinanciero.totalGarantia.toLocaleString('es-MX')} MXN. Realiza la transferencia a la cuenta de custodia.`,
          leido: false
        });
      } catch (notifErr) {
        console.warn('Aviso notificaciones:', notifErr.message);
      }

      navigate('/mis-movimientos');
    } catch (err) {
      console.error('Fallo al formalizar orden:', err);
      setErrorMsg(`No se pudo procesar la orden: ${err.message || 'Error de persistencia.'}`);
      setProcesando(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Arial, sans-serif', padding: '30px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px' }}>
          <Link to="/checkout/flete" style={{ color: colors.accent, textDecoration: 'none', fontWeight: 'bold' }}>
            ← Volver a Configuración de Flete
          </Link>
        </p>

        <div style={{ backgroundColor: colors.card, padding: '28px', borderRadius: '10px', border: `1px solid ${colors.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          
          <h1 style={{ color: colors.textMain, margin: '0 0 6px 0', fontSize: '22px', textAlign: 'center', fontWeight: 'bold' }}>
            🔒 Custodia de Pago en Garantía (Escrow)
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '13px', textAlign: 'center', margin: '0 0 20px 0', lineHeight: '1.4' }}>
            Fondos resguardados de forma neutral por <strong>Industrias Wert</strong>. El pago se liquida al arrendador únicamente cuando la maquinaria arriba a tu obra y verificas su correcto funcionamiento.
          </p>

          {errorMsg && (
            <div style={{ backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.textMain, padding: '12px 14px', borderRadius: '6px', fontSize: '14px', marginBottom: '18px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* SELECTOR DE MÉTODO DE PAGO */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: colors.textSecondary, marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Método de Liquidación:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              
              {/* SPEI */}
              <div 
                onClick={() => setMetodoPago('spei')}
                style={{ 
                  backgroundColor: metodoPago === 'spei' ? colors.cardInner : colors.bg, 
                  border: `2px solid ${metodoPago === 'spei' ? colors.accent : colors.border}`, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: colors.textMain }}>🏦 Transferencia SPEI</div>
                <div style={{ fontSize: '11px', color: '#34D399', marginTop: '2px' }}>$0.00 Comisión pasarela</div>
              </div>

              {/* TARJETA (PRÓXIMAMENTE) */}
              <div 
                style={{ 
                  backgroundColor: colors.bg, 
                  border: `1px dashed ${colors.border}`, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  opacity: 0.65,
                  cursor: 'not-allowed',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: colors.textSecondary }}>💳 Tarjeta Débito / Crédito</div>
                <div style={{ fontSize: '10px', color: colors.goldText, marginTop: '2px', fontWeight: 'bold' }}>
                  ⏳ PRÓXIMAMENTE
                </div>
              </div>

            </div>
          </div>

          {/* RESUMEN DE CONTRATACIÓN Y DESGLOSE WERT */}
          <div style={{ backgroundColor: colors.cardInner, padding: '18px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: colors.accent, fontSize: '13px', textTransform: 'uppercase' }}>
              📋 Desglose Oficial de Operación:
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Activo / Maquinaria:</span>
              <strong style={{ color: colors.textMain }}>{nombreEquipo}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Arrendador:</span>
              <span style={{ color: colors.textMain }}>{empresa}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Destino en Obra:</span>
              <span style={{ color: colors.textMain }}>📍 {municipioObra}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Logística Asignada:</span>
              <span style={{ color: colors.textMain }}>{tipoFlete === 'plataforma' ? '🚚 Plataforma / Lowboy' : '🚜 Recolección Propia'}</span>
            </div>
            
            <hr style={{ border: `0.5px solid ${colors.border}`, margin: '12px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Renta base acordada:</span>
              <span style={{ color: colors.textMain }}>${costoRenta.toLocaleString('es-MX')} MXN</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Flete y arrastre técnico:</span>
              <span style={{ color: colors.textMain }}>${costoFlete.toLocaleString('es-MX')} MXN</span>
            </div>

            {/* TARIFA ESCROW / SERVICIO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>
                Protección Escrow y Mediación Wert:
              </span>
              <span style={{ color: colors.goldText, fontWeight: 'bold' }}>
                {calculoFinanciero.tarifaFija > 0 
                  ? `$${calculoFinanciero.tarifaFija.toFixed(2)} MXN (Fija)` 
                  : `${calculoFinanciero.porcentajeComision}% (${calculoFinanciero.comisionTotalWert.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN)`}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
              <span style={{ color: colors.textSecondary }}>Costo por método de pago (SPEI):</span>
              <span style={{ color: '#34D399', fontWeight: 'bold' }}>$0.00 MXN</span>
            </div>

            {requiereFactura && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                <span style={{ color: colors.textSecondary }}>IVA (16% Fiscal Digital):</span>
                <span style={{ color: colors.textMain }}>${calculoFinanciero.ivaCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
            )}
            
            <hr style={{ border: `0.5px solid ${colors.border}`, margin: '12px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px', color: colors.textMain }}>Total a Liquidar en Garantía:</span>
              <span style={{ fontWeight: 'bold', color: colors.accent, fontSize: '22px' }}>
                ${calculoFinanciero.totalGarantia.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span style={{ fontSize: '13px', color: colors.textSecondary }}>MXN</span>
              </span>
            </div>
          </div>

          {/* MÓDULO CFDI 4.0 */}
          <div style={{ backgroundColor: colors.cardInner, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: colors.textMain }}>
              <input
                type="checkbox"
                checked={requiereFactura}
                onChange={(e) => setRequiereFactura(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: colors.accent }}
              />
              ¿Requieres Factura Fiscal Digital (CFDI 4.0)? (+16% IVA)
            </label>

            {requiereFactura && (
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>Razón Social Fiscal</label>
                  <input
                    type="text"
                    required
                    value={razonSocialFiscal}
                    onChange={(e) => setRazonSocialFiscal(e.target.value)}
                    placeholder="CONSTRUCTORA EJEMPLO S.A. DE C.V."
                    style={{ width: '100%', padding: '8px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', color: '#FFF', boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>RFC Oficial</label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={rfcFiscal}
                    onChange={(e) => setRfcFiscal(e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    style={{ width: '100%', padding: '8px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', color: '#FFF', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>Código Postal Fiscal</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={codigoPostalFiscal}
                    onChange={(e) => setCodigoPostalFiscal(e.target.value)}
                    placeholder="29000"
                    style={{ width: '100%', padding: '8px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', color: '#FFF', boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>Régimen Fiscal</label>
                  <select
                    value={regimenFiscal}
                    onChange={(e) => setRegimenFiscal(e.target.value)}
                    style={{ width: '100%', padding: '8px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', color: '#FFF', boxSizing: 'border-box', fontSize: '12px' }}
                  >
                    <option value="601">601 - General Personas Morales</option>
                    <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                    <option value="626">626 - RESICO</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>Uso de CFDI</label>
                  <select
                    value={usoCfdi}
                    onChange={(e) => setUsoCfdi(e.target.value)}
                    style={{ width: '100%', padding: '8px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', color: '#FFF', boxSizing: 'border-box', fontSize: '12px' }}
                  >
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="I08">I08 - Otra maquinaria y equipo</option>
                    <option value="CP01">CP01 - Pagos</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* DATOS SPEI */}
          <div style={{ padding: '18px', backgroundColor: colors.cardInner, borderRadius: '8px', border: `1px solid ${colors.accent}`, marginBottom: '20px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.goldText, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
              🏦 Instrucciones de Transferencia Bancaria
            </p>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>CLABE Interbancaria Puente (Garantía Wert):</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  readOnly 
                  value={clabeBancaria} 
                  style={{ flex: 1, minHeight: '44px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.textMain, fontWeight: 'bold', fontSize: '15px', padding: '0 10px', textAlign: 'center', fontFamily: 'monospace' }} 
                />
                <button
                  type="button"
                  onClick={() => copiarPortapapeles(clabeBancaria, setCopiadoClabe)}
                  style={{ minHeight: '44px', minWidth: '95px', backgroundColor: copiadoClabe ? colors.successBg : colors.card, border: `1px solid ${copiadoClabe ? colors.successBorder : colors.border}`, color: colors.textMain, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  {copiadoClabe ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', color: '#F8B667', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Concepto / Folio Único de Conciliación:</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  readOnly 
                  value={folioRastreo} 
                  style={{ flex: 1, minHeight: '44px', backgroundColor: colors.bg, border: '1px solid #E58A3C', borderRadius: '6px', color: '#E58A3C', fontWeight: 'bold', fontSize: '16px', padding: '0 10px', textAlign: 'center', fontFamily: 'monospace' }} 
                />
                <button
                  type="button"
                  onClick={() => copiarPortapapeles(folioRastreo, setCopiadoReferencia)}
                  style={{ minHeight: '44px', minWidth: '95px', backgroundColor: copiadoReferencia ? colors.successBg : colors.card, border: `1px solid ${copiadoReferencia ? colors.successBorder : colors.border}`, color: colors.textMain, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  {copiadoReferencia ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: colors.textSecondary }}>* Indispensable capturar este concepto exacto en tu banca móvil para conciliación inmediata.</p>
            </div>

            <div style={{ fontSize: '12px', color: colors.textSecondary, textAlign: 'center', lineHeight: '1.4' }}>
              Beneficiario: <strong style={{ color: colors.textMain }}>{titularConcentrador}</strong> | Banco: <strong style={{ color: colors.textMain }}>{bancoConcentrador}</strong>
            </div>
          </div>

          {/* DESLINDE Y COBERTURA DE MEDIACIÓN LEGAL */}
          <div style={{ backgroundColor: colors.cardInner, padding: '12px 14px', borderRadius: '6px', border: `1px solid ${colors.border}`, fontSize: '11px', color: colors.textSecondary, lineHeight: '1.4', marginBottom: '22px' }}>
            🛡️ <strong>Garantía Blindada Wert:</strong> Tu dinero queda en custodia neutral. Cuentas con una ventana de 2 horas a partir de la descarga del equipo para certificar horómetro y reportar cualquier falla mecánica antes de la dispersión de fondos al arrendador.
          </div>

          {/* BOTÓN DE CONFIRMACIÓN */}
          <button 
            type="button"
            onClick={handleConfirmarOrden} 
            disabled={procesando}
            style={{ 
              width: '100%', 
              minHeight: '48px', 
              backgroundColor: colors.accent, 
              color: '#1A2332', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '15px', 
              cursor: procesando ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              boxSizing: 'border-box' 
            }}
          >
            {procesando ? '⏳ Registrando Garantía...' : '✅ Confirmar Solicitud con Folio SPEI'}
          </button>
        </div>
      </div>
    </div>
  );
}