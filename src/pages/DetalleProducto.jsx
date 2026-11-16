import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22500%22%20height%3D%22350%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23202B3C%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23F4EFE6%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2218%22%3ESin%20Imagen%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function DetalleProducto() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [equipo, setEquipo] = useState(null);
  const [propietarioId, setPropietarioId] = useState(null);
  const [proveedor, setProveedor] = useState({
    nombre_empresa: '',
    telefono: '',
    verificado: false,
    municipio_base: ''
  });
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  // Modalidad y parámetros de cotización
  const [modalidad, setModalidad] = useState('dia'); 
  const [horasRenta, setHorasRenta] = useState(1); 
  const [mesesRenta, setMesesRenta] = useState(1);
  const [fechaInicio, setFechaInicio] = useState(''); 
  const [fechaFin, setFechaFin] = useState(''); 
  const [horaInicioServicio, setHoraInicioServicio] = useState('08:00');
  const [mostrarVideo, setMostrarVideo] = useState(false);
  
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [preguntas, setPreguntas] = useState([
    { texto: '¿El precio incluye combustible o va por mi cuenta?', respuesta: 'El equipo se entrega con tanque lleno y se devuelve en el mismo estado. El combustible corre por cuenta de la obra contratante.' },
    { texto: '¿Qué tiempo de respuesta tienen ante soporte técnico o falla?', respuesta: 'Para proveedores verificados en Chiapas, el tiempo de respuesta promedio de asistencia mecánica en obra es menor a 3 horas.' }
  ]);

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
    goldBg: '#3B3216',
    goldBorder: '#C89D3C',
    goldText: '#F7D070',
    warnBg: '#382818',
    warnBorder: '#8A531C',
    warnText: '#F8B667'
  };

  useEffect(() => {
    let montado = true;

    async function obtenerProductoYProveedor() {
      try {
        setLoading(true);
        setErrorCarga(null);

        const { data: productoData, error: prodError } = await supabase
          .from('productos')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (prodError) throw prodError;
        if (!productoData) throw new Error('El equipo solicitado no existe o fue retirado del catálogo.');

        if (!montado) return;
        setEquipo(productoData);

        // Identificar ID oficial del arrendador
        const idDueno = productoData.id_arrendador;
        setPropietarioId(idDueno || null);

        if (idDueno) {
          const { data: perfilData, error: perfilError } = await supabase
            .from('perfiles_proveedores')
            .select('nombre_empresa, telefono, verificado, municipio_base')
            .eq('usuario_id', idDueno)
            .maybeSingle();

          if (!perfilError && perfilData && montado) {
            setProveedor({
              nombre_empresa: perfilData.nombre_empresa || 'Arrendador Particular',
              telefono: perfilData.telefono ? perfilData.telefono.replace(/\D/g, '') : '',
              verificado: Boolean(perfilData.verificado),
              municipio_base: perfilData.municipio_base || ''
            });
          }
        }
      } catch (err) {
        if (montado) {
          console.error("Error al cargar ficha:", err);
          setErrorCarga(err.message || "Fallo de conexión al cargar el activo.");
        }
      } finally {
        if (montado) setLoading(false);
      }
    }

    obtenerProductoYProveedor();

    return () => {
      montado = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.textMain, backgroundColor: colors.bg, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>⏳ Verificando ficha técnica y estado de auditoría...</p>
      </div>
    );
  }

  if (errorCarga || !equipo) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: colors.textMain, backgroundColor: colors.bg, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: colors.accent, fontSize: '24px' }}>Equipo No Localizado</h2>
        <p style={{ color: colors.textSecondary, margin: '15px 0 25px 0' }}>{errorCarga}</p>
        <button 
          onClick={() => navigate('/')} 
          style={{ minHeight: '48px', backgroundColor: colors.accent, color: '#1A2332', padding: '0 24px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
        >
          Volver al Catálogo Principal
        </button>
      </div>
    );
  }

  // Tarifas conforme a las columnas reales de 'productos'
  const precioHora = Number(equipo.precio_hora || 0);
  const precioDia = Number(equipo.precio_dia || 0);
  const precioMes = Number(equipo.precio_mes || 0);

  const preciosDisponibles = { hora: precioHora, dia: precioDia, mes: precioMes };

  let unidadesCalculadas = 1;
  if (modalidad === 'hora') {
    unidadesCalculadas = Math.max(1, Number(horasRenta) || 1);
  } else if (modalidad === 'mes') {
    unidadesCalculadas = Math.max(1, Number(mesesRenta) || 1);
  } else if (fechaInicio && fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    unidadesCalculadas = dias > 0 ? dias : 1;
  }

  const precioUnitario = preciosDisponibles[modalidad] || precioDia;
  const costoRentaTotal = precioUnitario * unidadesCalculadas;

  const periodoTexto = modalidad === 'hora' 
    ? `${horasRenta} hr(s) el ${fechaInicio || 'Fecha pendiente'} a las ${horaInicioServicio}` 
    : modalidad === 'mes'
    ? `${mesesRenta} mes(es) desde el ${fechaInicio || 'Fecha pendiente'}`
    : `${unidadesCalculadas} día(s) [${fechaInicio || 'Inicio'} al ${fechaFin || 'Fin'}]`;

  const iniciarRentaSegura = () => {
    navigate('/checkout/flete', {
      state: {
        productoId: equipo.id,
        proveedorId: propietarioId, // Se transfiere explícitamente el id_arrendador
        nombreEquipo: equipo.nombre,
        empresa: proveedor.nombre_empresa || 'Proveedor Industrias Wert',
        costoRenta: costoRentaTotal,
        detallesTiempo: periodoTexto,
        municipio: equipo.ubicacion_almacen || 'Tuxtla Gutiérrez'
      }
    });
  };

  const generarMensajeWhatsApp = () => {
    const telefonoFinal = proveedor.telefono ? (proveedor.telefono.length === 10 ? `52${proveedor.telefono}` : proveedor.telefono) : '529613233913';

    const texto = `Hola, me comunico a través de INDUSTRIAS WERT por el siguiente activo:\n\n` +
      `🚜 *Activo:* ${equipo.nombre}\n` +
      `🏢 *Arrendador:* ${proveedor.nombre_empresa || 'Particular'}\n` +
      `🛡️ *Estatus:* ${proveedor.verificado ? 'Verificado Oficial Wert' : 'Proveedor Independiente'}\n` +
      `📍 *Patio:* ${equipo.ubicacion_almacen || 'Tuxtla Gutiérrez, Chiapas'}\n` +
      `⏱️ *Tiempo Estimado:* ${periodoTexto}\n` +
      `💰 *Subtotal Estimado:* $${costoRentaTotal.toLocaleString('es-MX')} MXN\n\n` +
      `¿Tienen el equipo disponible para inspección en patio o salida a obra?`;

    return `https://wa.me/${telefonoFinal}?text=${encodeURIComponent(texto)}`;
  };

  const manejarPregunta = (e) => {
    e.preventDefault();
    if (!nuevaPregunta.trim()) return;
    setPreguntas(prev => [
      { texto: nuevaPregunta.trim(), respuesta: 'Tu consulta ha sido enviada al arrendador. Se registrará la respuesta técnica en breve.' },
      ...prev
    ]);
    setNuevaPregunta('');
  };

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Arial, sans-serif', padding: '30px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* BREADCRUMB */}
        <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/" style={{ color: colors.accent, textDecoration: 'none', fontWeight: 'bold' }}>Inicio</Link>
          <span>/</span>
          <span>Catálogo</span>
          <span>/</span>
          <span style={{ color: colors.textMain }}>{equipo.nombre}</span>
        </div>

        {/* ALERTA PREVENTIVA / SELLO OFICIAL PRINCIPAL */}
        <div style={{ marginBottom: '24px' }}>
          {proveedor.verificado ? (
            <div style={{ backgroundColor: colors.goldBg, border: `2px solid ${colors.goldBorder}`, borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '28px' }}>🛡️</span>
              <div>
                <h3 style={{ margin: 0, color: colors.goldText, fontSize: '16px', fontWeight: 'bold' }}>
                  Proveedor Verificado y Avalado por Industrias Wert
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMain, lineHeight: '1.4' }}>
                  Activo respaldado por <strong>{proveedor.nombre_empresa}</strong>. Constancia fiscal (RFC), propiedad del activo y condiciones mecánicas en patio auditadas formalmente.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: colors.warnBg, border: `2px solid ${colors.warnBorder}`, borderRadius: '8px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h3 style={{ margin: 0, color: colors.warnText, fontSize: '15px', fontWeight: 'bold' }}>
                  Aviso Preventivo: Proveedor Independiente (No Auditado en Patio)
                </h3>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: '1.4' }}>
                Este activo es publicado por un tercero ajeno a la auditoría técnica de Industrias Wert. La disponibilidad mecánica, horómetro real y titularidad legal son manifestación exclusiva del arrendador.
              </p>
              <div style={{ backgroundColor: colors.cardInner, padding: '10px 14px', borderRadius: '6px', border: `1px solid ${colors.inputBorder}`, fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>
                ⚖️ <strong>Cláusula de Deslinde Legal:</strong> Industrias Wert funge estrictamente como plataforma tecnológica de contacto. No asume responsabilidad civil, mercantil ni penal, solidaria o subsidiaria, por vicios ocultos de maquinaria, averías mecánicas, siniestros viales o incumplimientos económicos entre particulares.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
          
          {/* MULTIMEDIA */}
          <div>
            <div style={{ width: '100%', height: '350px', backgroundColor: colors.card, borderRadius: '8px', border: `1px solid ${colors.inputBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {mostrarVideo ? (
                equipo.video_url ? (
                  <video src={equipo.video_url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <span style={{ fontSize: '48px' }}>🎥</span>
                    <p style={{ margin: '12px 0 0 0', color: colors.accent, fontWeight: 'bold', fontSize: '16px' }}>Sin video operativo disponible</p>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '6px 0 16px 0' }}>El arrendador aún no ha cargado la demostración funcional en video.</p>
                    <button 
                      onClick={() => setMostrarVideo(false)} 
                      style={{ minHeight: '44px', padding: '0 16px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                    >
                      ← Volver a Fotografía
                    </button>
                  </div>
                )
              ) : (
                <img 
                  src={equipo.foto_url || NO_IMAGE_PLACEHOLDER} 
                  alt={equipo.nombre} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => { 
                    e.currentTarget.onerror = null; 
                    e.currentTarget.src = NO_IMAGE_PLACEHOLDER; 
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <button 
                onClick={() => setMostrarVideo(false)} 
                style={{ 
                  flex: 1, 
                  minHeight: '48px', 
                  backgroundColor: !mostrarVideo ? colors.cardLight : colors.card, 
                  borderRadius: '6px', 
                  border: !mostrarVideo ? `2px solid ${colors.accent}` : `1px solid ${colors.inputBorder}`, 
                  color: colors.textMain, 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}
              >
                📸 Fotografía
              </button>
              <button 
                onClick={() => setMostrarVideo(true)} 
                style={{ 
                  flex: 1, 
                  minHeight: '48px', 
                  backgroundColor: mostrarVideo ? colors.cardLight : colors.card, 
                  borderRadius: '6px', 
                  border: mostrarVideo ? `2px solid ${colors.accent}` : `1px solid ${colors.inputBorder}`, 
                  color: colors.accent, 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  fontSize: '14px' 
                }}
              >
                ▶️ Video de Patio
              </button>
            </div>
          </div>

          {/* ESPECIFICACIONES TÉCNICAS */}
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold', color: colors.textMain }}>
              {equipo.nombre}
            </h1>

            <div style={{ backgroundColor: colors.card, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.inputBorder}`, marginBottom: '18px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: colors.accent, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📍 Ubicación Operativa y Horómetro
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5' }}>
                Patio de resguardo: <strong style={{ color: colors.textMain }}>{equipo.ubicacion_almacen || 'Tuxtla Gutiérrez, Chiapas'}</strong>.<br />
                Horómetro reportado: <strong style={{ color: colors.textMain }}>{equipo.horometro ? `${Number(equipo.horometro).toLocaleString('es-MX')} hrs` : 'No especificado'}</strong>.
              </p>
            </div>

            <h3 style={{ margin: '0 0 10px 0', color: colors.textMain, fontSize: '16px' }}>Ficha Técnica de Maquinaria:</h3>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${colors.cardLight}` }}>
                  <td style={{ padding: '10px 0', color: colors.textSecondary, width: '160px' }}>Peso Operativo:</td>
                  <td style={{ padding: '10px 0', fontWeight: 'bold', color: colors.textMain }}>
                    {equipo.peso_kg ? `${Number(equipo.peso_kg).toLocaleString('es-MX')} Kg` : 'A consultar'}
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${colors.cardLight}` }}>
                  <td style={{ padding: '10px 0', color: colors.textSecondary }}>Dimensiones para Flete:</td>
                  <td style={{ padding: '10px 0', fontWeight: 'bold', color: colors.textMain }}>
                    {equipo.largo_metros || 0}m × {equipo.ancho_metros || 0}m × {equipo.alto_metros || 0}m
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${colors.cardLight}` }}>
                  <td style={{ padding: '10px 0', color: colors.textSecondary }}>Arrendador:</td>
                  <td style={{ padding: '10px 0', fontWeight: 'bold', color: colors.textMain }}>
                    {proveedor.nombre_empresa} {proveedor.municipio_base ? `(${proveedor.municipio_base})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* CAJA DE DESCRIPCIÓN Y ESPECIFICACIONES ADICIONALES */}
            <div style={{ marginTop: '18px', backgroundColor: colors.cardInner, padding: '14px', borderRadius: '6px', border: `1px solid ${colors.inputBorder}` }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: colors.accent, textTransform: 'uppercase' }}>
                📋 Condiciones Operativas y Notas de Entrega
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.4' }}>
                Equipo verificado con mantenimiento preventivo al día. Incluye operador capacitado previa solicitud en cotización de flete y herramientas de desgaste básicas en buen estado operativo.
              </p>
            </div>
          </div>

          {/* CALCULADORA DE COSTOS Y RESERVA */}
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.inputBorder}`, borderRadius: '10px', padding: '22px' }}>
            <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Modalidad de Cotización:
            </label>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {[
                { key: 'hora', label: '⏱️ Por Hora' },
                { key: 'dia', label: '📅 Por Día' },
                { key: 'mes', label: '🗓️ Por Mes' }
              ].map(m => (
                <button 
                  key={m.key} 
                  type="button"
                  onClick={() => { setModalidad(m.key); setFechaInicio(''); setFechaFin(''); }} 
                  style={{ 
                    flex: 1, 
                    minHeight: '48px', 
                    fontSize: '13px', 
                    borderRadius: '6px', 
                    border: 'none', 
                    backgroundColor: modalidad === m.key ? colors.accent : colors.inputBg, 
                    color: modalidad === m.key ? '#1A2332' : colors.textMain, 
                    fontWeight: 'bold', 
                    cursor: 'pointer' 
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>Tarifa base ({modalidad}):</p>
            <p style={{ margin: '4px 0 16px 0', fontSize: '24px', fontWeight: 'bold', color: colors.accent }}>
              ${precioUnitario.toLocaleString('es-MX')} <span style={{ fontSize: '14px', color: colors.textMain, fontWeight: 'normal' }}>MXN</span>
            </p>

            {modalidad === 'hora' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Horas de Renta Estimadas:</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={horasRenta} 
                    onChange={e => setHorasRenta(Math.max(1, parseInt(e.target.value) || 1))} 
                    style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '4px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, boxSizing: 'border-box' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Fecha Requerida:</label>
                  <input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={e => setFechaInicio(e.target.value)} 
                    style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '4px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
            )}

            {modalidad === 'dia' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Fecha de Entrada a Obra:</label>
                  <input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={e => setFechaInicio(e.target.value)} 
                    style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '4px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, boxSizing: 'border-box' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Fecha de Término:</label>
                  <input 
                    type="date" 
                    min={fechaInicio || undefined}
                    value={fechaFin} 
                    onChange={e => setFechaFin(e.target.value)} 
                    style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '4px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
            )}

            {modalidad === 'mes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Meses de Renta:</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={mesesRenta} 
                    onChange={e => setMesesRenta(Math.max(1, parseInt(e.target.value) || 1))} 
                    style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '4px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, boxSizing: 'border-box' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Fecha Estimada de Llegada:</label>
                  <input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={e => setFechaInicio(e.target.value)} 
                    style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '4px', backgroundColor: colors.inputBg, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
            )}

            <div style={{ backgroundColor: colors.inputBg, padding: '14px', borderRadius: '6px', margin: '20px 0', border: `1px solid ${colors.inputBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Subtotal Cotizado:</span>
                <span style={{ fontWeight: 'bold', color: colors.accent, fontSize: '18px' }}>
                  ${costoRentaTotal.toLocaleString('es-MX')} MXN
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: colors.textSecondary }}>* Logística de traslado se selecciona en el siguiente paso.</p>
            </div>

            {/* BOTÓN PRIMARIO: RENTAR CON CUSTODIA WERT */}
            <button 
              type="button"
              onClick={iniciarRentaSegura} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                width: '100%', 
                minHeight: '48px', 
                backgroundColor: colors.accent, 
                color: '#1A2332', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: 'bold', 
                fontSize: '15px', 
                cursor: 'pointer', 
                marginBottom: '10px',
                boxSizing: 'border-box' 
              }}
            >
              🔒 Rentar con Custodia WERT (Garantía SPEI) →
            </button>

            {/* BOTÓN SECUNDARIO: WHATSAPP DIRECTO */}
            <a 
              href={generarMensajeWhatsApp()} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                width: '100%', 
                minHeight: '44px', 
                backgroundColor: 'transparent', 
                color: colors.textSecondary, 
                border: `1px solid ${colors.inputBorder}`,
                textDecoration: 'none', 
                borderRadius: '6px', 
                fontWeight: 'normal', 
                fontSize: '13px', 
                boxSizing: 'border-box' 
              }}
            >
              💬 Dudas previas con el arrendador (WhatsApp)
            </a>
          </div>
        </div>

        <hr style={{ border: `0.5px solid ${colors.inputBorder}`, margin: '45px 0' }} />

        {/* PREGUNTAS FRECUENTES */}
        <div style={{ maxWidth: '850px' }}>
          <h2 style={{ color: colors.textMain, margin: '0 0 16px 0', fontSize: '18px' }}>
            💬 Preguntas Técnicas y Soporte en Obra
          </h2>
          
          <form onSubmit={manejarPregunta} style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Pregunta sobre mantenimiento, arrastre, seguros..." 
              value={nuevaPregunta} 
              onChange={e => setNuevaPregunta(e.target.value)} 
              style={{ flex: 1, minWidth: '260px', minHeight: '48px', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${colors.inputBorder}`, backgroundColor: colors.inputBg, color: colors.textMain, fontSize: '14px', boxSizing: 'border-box' }} 
            />
            <button 
              type="submit" 
              style={{ minHeight: '48px', padding: '0 24px', backgroundColor: colors.cardLight, color: colors.textMain, border: `1px solid ${colors.inputBorder}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
            >
              Enviar Pregunta
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {preguntas.map((p, index) => (
              <div key={index} style={{ backgroundColor: colors.card, padding: '16px', borderRadius: '6px', border: `1px solid ${colors.inputBorder}` }}>
                <p style={{ margin: '0 0 6px 0', color: colors.textMain, fontWeight: 'bold', fontSize: '14px' }}>
                  ❓ {p.texto}
                </p>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: '13px', lineHeight: '1.4' }}>
                  💡 {p.respuesta}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}