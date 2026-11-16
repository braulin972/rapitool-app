import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function MiPerfil() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState(null);

  const [perfil, setPerfil] = useState({
    nombre_empresa: '',
    telefono: '',
    rfc: '',
    direccion_fiscal: '',
    municipio_base: '',
    banco_receptor: '',
    clabe_interbancaria: '',
    titular_cuenta: '',
    verificado: false
  });

  const [solicitudActiva, setSolicitudActiva] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [enviandoDoc, setEnviandoDoc] = useState(false);
  const [archivos, setArchivos] = useState({
    fiscal: null,
    identificacion: null,
    titulo: null,
    seguro: null
  });
  const [tipoProveedor, setTipoProveedor] = useState('maquinaria');
  const [notasProveedor, setNotasProveedor] = useState('');

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardInner: '#1A2332',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    border: '#3F4E65',
    errorBg: '#442226',
    errorBorder: '#77333B',
    exitoBg: '#1F3D2B',
    exitoBorder: '#2E6343',
    goldBg: '#3B3216',
    goldBorder: '#C89D3C',
    goldText: '#F7D070'
  };

  const inputStyle = {
    width: '100%',
    minHeight: '48px',
    padding: '10px 14px',
    backgroundColor: colors.cardInner,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.textMain,
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none'
  };

  const cargarDatos = useCallback(async (sessionUser) => {
    try {
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfiles_proveedores')
        .select('*')
        .eq('usuario_id', sessionUser.id)
        .maybeSingle();

      if (perfilError) throw perfilError;

      if (perfilData) {
        setPerfil({
          nombre_empresa: perfilData.nombre_empresa || '',
          telefono: perfilData.telefono || '',
          rfc: perfilData.rfc || '',
          direccion_fiscal: perfilData.direccion_fiscal || '',
          municipio_base: perfilData.municipio_base || '',
          banco_receptor: perfilData.banco_receptor || '',
          clabe_interbancaria: perfilData.clabe_interbancaria || '',
          titular_cuenta: perfilData.titular_cuenta || '',
          verificado: perfilData.verificado || false
        });
      }

      const { data: solData, error: solError } = await supabase
        .from('solicitudes_verificacion')
        .select('*')
        .eq('usuario_id', sessionUser.id)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (solError) throw solError;
      setSolicitudActiva(solData || null);

    } catch (err) {
      console.error('Error al sincronizar datos:', err.message || err);
      setMensajeFeedback({ tipo: 'error', texto: 'No se pudo sincronizar la información del perfil.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;
    async function checarAuth() {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) {
        if (montado) navigate('/registro-general');
        return;
      }
      if (montado) {
        setUser(authUser);
        await cargarDatos(authUser);
      }
    }
    checarAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) navigate('/registro-general');
    });

    return () => {
      montado = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate, cargarDatos]);

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeFeedback(null);

    // Validación CLABE de 18 dígitos
    const clabeLimpia = perfil.clabe_interbancaria.trim();
    if (clabeLimpia && (!/^\d{18}$/.test(clabeLimpia))) {
      setMensajeFeedback({ tipo: 'error', texto: 'La CLABE interbancaria debe tener exactamente 18 dígitos numéricos.' });
      setGuardando(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('perfiles_proveedores')
        .upsert({
          usuario_id: user.id,
          nombre_empresa: perfil.nombre_empresa.trim(),
          telefono: perfil.telefono.trim(),
          rfc: perfil.rfc.toUpperCase().trim(),
          direccion_fiscal: perfil.direccion_fiscal.trim(),
          municipio_base: perfil.municipio_base.trim(),
          banco_receptor: perfil.banco_receptor.trim(),
          clabe_interbancaria: clabeLimpia || null,
          titular_cuenta: perfil.titular_cuenta.trim()
        }, { onConflict: 'usuario_id' });

      if (error) throw error;
      setMensajeFeedback({ tipo: 'exito', texto: '✅ Información comercial y bancaria guardada correctamente.' });
    } catch (err) {
      setMensajeFeedback({ tipo: 'error', texto: `Error al guardar: ${err.message}` });
    } finally {
      setGuardando(false);
    }
  };

  const subirArchivoSeguro = async (archivo, categoria) => {
    const extension = archivo.name.split('.').pop();
    const nombreLimpio = `${Date.now()}_${categoria}.${extension}`;
    const rutaCompleta = `${user.id}/${nombreLimpio}`;

    const { error } = await supabase.storage
      .from('expedientes-verificacion')
      .upload(rutaCompleta, archivo, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return rutaCompleta;
  };

  const handleEnviarSolicitudVerificacion = async (e) => {
    e.preventDefault();
    setEnviandoDoc(true);
    setMensajeFeedback(null);

    if (!archivos.fiscal || !archivos.identificacion || !archivos.titulo) {
      alert('Debes adjuntar obligatoriamente Comprobante Fiscal, Identificación Oficial y Título/Factura.');
      setEnviandoDoc(false);
      return;
    }

    try {
      const [urlFiscal, urlId, urlTitulo, urlSeguro] = await Promise.all([
        subirArchivoSeguro(archivos.fiscal, 'fiscal'),
        subirArchivoSeguro(archivos.identificacion, 'ine'),
        subirArchivoSeguro(archivos.titulo, 'propiedad'),
        archivos.seguro ? subirArchivoSeguro(archivos.seguro, 'poliza') : Promise.resolve(null)
      ]);

      const { error: insertError } = await supabase
        .from('solicitudes_verificacion')
        .insert({
          usuario_id: user.id,
          rfc: perfil.rfc.toUpperCase().trim() || 'NO_REGISTRADO',
          razon_social: perfil.nombre_empresa.trim() || 'SIN_RAZON_SOCIAL',
          telefono_contacto: perfil.telefono.trim(),
          tipo_proveedor: tipoProveedor,
          url_comprobante_fiscal: urlFiscal,
          url_identificacion_oficial: urlId,
          url_titulo_propiedad: urlTitulo,
          url_poliza_seguro: urlSeguro,
          notas_proveedor: notasProveedor.trim(),
          estado: 'pendiente_revision'
        });

      if (insertError) throw insertError;

      setMostrarModal(false);
      setMensajeFeedback({
        tipo: 'exito',
        texto: '📋 Expediente enviado a revisión. Auditoría programará contacto para inspección en patio.'
      });
      await cargarDatos(user);
    } catch (err) {
      console.error('Fallo en expediente:', err);
      alert(`Error al cargar expediente: ${err.message}`);
    } finally {
      setEnviandoDoc(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain }}>
        <p style={{ fontSize: '18px' }}>Cargando perfil seguro...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '90vh', backgroundColor: colors.bg, padding: '30px 16px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: colors.card, borderRadius: '10px', border: `1px solid ${colors.border}`, padding: '28px', color: colors.textMain }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold' }}>⚙️ Mi Perfil y Cuenta Bancaria</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textSecondary }}>Industrias Wert — Región Chiapas</p>
          </div>
          <button
            type="button"
            onClick={() => { supabase.auth.signOut(); navigate('/'); }}
            style={{ minHeight: '48px', backgroundColor: '#772226', color: '#FFF', border: 'none', padding: '0 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>

        {/* FEEDBACK */}
        {mensajeFeedback && (
          <div style={{
            backgroundColor: mensajeFeedback.tipo === 'error' ? colors.errorBg : colors.exitoBg,
            border: `1px solid ${mensajeFeedback.tipo === 'error' ? colors.errorBorder : colors.exitoBorder}`,
            padding: '14px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {mensajeFeedback.texto}
          </div>
        )}

        {/* ESTATUS DE AUDITORÍA */}
        <div style={{ marginBottom: '24px' }}>
          {perfil.verificado ? (
            <div style={{ backgroundColor: colors.goldBg, border: `2px solid ${colors.goldBorder}`, padding: '18px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', color: colors.goldText, fontSize: '16px' }}>🛡️ Proveedor Verificado y Avalado por Industrias Wert</h3>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textMain }}>Tus máquinas y servicios cuentan con el distintivo de auditoría documental y de patio aprobada.</p>
            </div>
          ) : solicitudActiva && solicitudActiva.estado === 'pendiente_revision' ? (
            <div style={{ backgroundColor: colors.cardInner, border: `1px solid ${colors.border}`, padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', color: colors.accent, fontSize: '15px' }}>⏳ Expediente en Auditoría Documental</h3>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>Tu solicitud fue ingresada el {new Date(solicitudActiva.creado_en).toLocaleDateString('es-MX')}. Estamos cotejando RFC y documentación física antes de patio.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: colors.cardInner, border: `1px dashed ${colors.border}`, padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#3A2814', color: '#F4BA60', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
                ⚠️ Proveedor Independiente (No Auditado en Patio)
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: '1.4' }}>
                Tus publicaciones muestran una leyenda preventiva. Obtén el sello dorado presentando situación fiscal y revisión de activos.
              </p>
              <button
                type="button"
                onClick={() => setMostrarModal(true)}
                style={{
                  minHeight: '48px',
                  backgroundColor: colors.accent,
                  color: '#1A2332',
                  border: 'none',
                  padding: '0 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📑 Solicitar Verificación y Auditoría Física
              </button>
            </div>
          )}
        </div>

        {/* FORMULARIO DE PERFIL Y DISPERSIÓN BANCARIA */}
        <form onSubmit={handleGuardarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>🏷️ Razón Social o Nombre Comercial</label>
            <input
              type="text"
              placeholder="Ej. Maquinaria y Acarreos del Sureste"
              value={perfil.nombre_empresa}
              onChange={(e) => setPerfil({ ...perfil, nombre_empresa: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>📱 Teléfono Operativo (WhatsApp)</label>
            <input
              type="tel"
              required
              placeholder="Ej. 9611234567"
              value={perfil.telefono}
              onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>📄 RFC</label>
              <input
                type="text"
                placeholder="XAXX010101000"
                value={perfil.rfc}
                onChange={(e) => setPerfil({ ...perfil, rfc: e.target.value.toUpperCase() })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>📍 Municipio Base</label>
              <input
                type="text"
                placeholder="Tuxtla Gutiérrez, Berriozábal, etc."
                value={perfil.municipio_base}
                onChange={(e) => setPerfil({ ...perfil, municipio_base: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>📍 Domicilio Fiscal / Patio de Maquinaria</label>
            <input
              type="text"
              placeholder="Carretera Panamericana Km..."
              value={perfil.direccion_fiscal}
              onChange={(e) => setPerfil({ ...perfil, direccion_fiscal: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* SECCIÓN OBLIGATORIA: CUENTA BANCARIA PARA DISPERSIÓN SPEI */}
          <div style={{ backgroundColor: colors.cardInner, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.accent}`, marginTop: '10px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: colors.accent, fontWeight: 'bold' }}>
              🏦 Cuenta Bancaria para Dispersión de Rentas
            </h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: colors.textSecondary }}>
              A esta cuenta CLABE transferirá el administrador de Industrias Wert la liquidación neta de tus equipos una vez verificado el horómetro.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: colors.textSecondary, marginBottom: '4px' }}>Titular Oficial de la Cuenta</label>
                <input
                  type="text"
                  placeholder="Nombre exacto del titular en el banco"
                  value={perfil.titular_cuenta}
                  onChange={(e) => setPerfil({ ...perfil, titular_cuenta: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textSecondary, marginBottom: '4px' }}>Banco Receptor</label>
                  <input
                    type="text"
                    placeholder="BBVA, Banorte, Santander..."
                    value={perfil.banco_receptor}
                    onChange={(e) => setPerfil({ ...perfil, banco_receptor: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: colors.textSecondary, marginBottom: '4px' }}>CLABE Interbancaria (18 dígitos)</label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="012914..."
                    value={perfil.clabe_interbancaria}
                    onChange={(e) => setPerfil({ ...perfil, clabe_interbancaria: e.target.value.replace(/\D/g, '') })}
                    style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            style={{
              minHeight: '48px',
              backgroundColor: colors.accent,
              color: '#1A2332',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: guardando ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              marginTop: '10px'
            }}
          >
            {guardando ? '⏳ Guardando...' : '💾 Guardar Datos Comerciales y Bancarios'}
          </button>
        </form>

        {/* MODAL AUDITORÍA DE PATIO */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
            <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>📋 Apertura de Expediente de Validación</h3>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ background: 'transparent', border: 'none', color: colors.textSecondary, fontSize: '20px', cursor: 'pointer' }}>✖</button>
              </div>

              <form onSubmit={handleEnviarSolicitudVerificacion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de Servicio Principal</label>
                  <select
                    value={tipoProveedor}
                    onChange={(e) => setTipoProveedor(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="maquinaria">Renta de Maquinaria Pesada / Ligera</option>
                    <option value="fletes">Logística de Carga y Acarreos (Volteo / Góndola / Pipa)</option>
                    <option value="banco_materiales">Suministro Directo de Banco de Materiales</option>
                    <option value="mixto">Operación Mixta</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>📄 Constancia de Situación Fiscal (PDF o Imagen)</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setArchivos({ ...archivos, fiscal: e.target.files[0] })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>🪪 Identificación Oficial del Representante / Propietario</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setArchivos({ ...archivos, identificacion: e.target.files[0] })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>🚜 Factura o Título de Propiedad de Activo Principal</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setArchivos({ ...archivos, titulo: e.target.files[0] })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>🛡️ Póliza de Seguro / Arrastre (Opcional)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setArchivos({ ...archivos, seguro: e.target.files[0] })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Ubicación de Patio / Notas para Auditoría</label>
                  <textarea
                    rows="2"
                    placeholder="Indica horarios disponibles para cotejo físico de activos en Tuxtla / Chiapas..."
                    value={notasProveedor}
                    onChange={(e) => setNotasProveedor(e.target.value)}
                    style={{ ...inputStyle, minHeight: '60px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarModal(false)}
                    style={{ flex: 1, minHeight: '48px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoDoc}
                    style={{ flex: 2, minHeight: '48px', backgroundColor: colors.accent, border: 'none', color: '#1A2332', fontWeight: 'bold', borderRadius: '6px', cursor: enviandoDoc ? 'not-allowed' : 'pointer' }}
                  >
                    {enviandoDoc ? '⏳ Transfiriendo archivos...' : '🚀 Enviar Expediente Seguro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}