import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CENTRO_CHIAPAS = [16.7528, -93.1152];

function ControladorCentro({ posicion }) {
  const map = useMap();
  useEffect(() => {
    if (posicion) {
      map.setView(posicion, map.getZoom(), { animate: true });
    }
  }, [posicion, map]);
  return null;
}

export default function AgregarRenta() {
  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [horometro, setHorometro] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  
  const [precioHora, setPrecioHora] = useState('');
  const [precioDia, setPrecioDia] = useState('');
  const [precioMes, setPrecioMes] = useState('');
  
  const [pesoKg, setPesoKg] = useState('');
  const [largoMetros, setLargoMetros] = useState('');
  const [anchoMetros, setAnchoMetros] = useState('');
  const [altoMetros, setAltoMetros] = useState('');

  const [direccion, setDireccion] = useState('Tuxtla Gutiérrez, Chiapas');
  const [posicion, setPosicion] = useState(CENTRO_CHIAPAS);

  const [loading, setLoading] = useState(false);
  const [validandoPerfil, setValidandoPerfil] = useState(true);
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let montado = true;
    async function verificarSesionYEmpresa() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          if (montado) navigate('/registro-general?redirect=/agregar/renta');
          return;
        }

        const { data: perfil } = await supabase
          .from('perfiles_proveedores')
          .select('id')
          .eq('usuario_id', user.id)
          .maybeSingle();

        if (!perfil) {
          if (montado) navigate('/registro-negocio?redirect=/agregar/renta');
          return;
        }

        if (montado) setUserId(user.id);
      } finally {
        if (montado) setValidandoPerfil(false);
      }
    }
    verificarSesionYEmpresa();
    return () => { montado = false; };
  }, [navigate]);

  function MonitorClickMapa() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosicion([lat, lng]);
        setDireccion(`Zona de resguardo (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      },
    });
    return null;
  }

  const handleSubirMaquinaria = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setErrorFeedback(null);
    setLoading(true);

    try {
      let urlImagenFinal = null;

      if (imagenArchivo) {
        const fileExt = imagenArchivo.name.split('.').pop().toLowerCase();
        const cleanFileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes-maquinaria')
          .upload(cleanFileName, imagenArchivo, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`No se pudo subir la fotografía (${uploadError.message}). Verifica que pese menos de 5 MB.`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('imagenes-maquinaria')
          .getPublicUrl(cleanFileName);
        urlImagenFinal = publicUrlData?.publicUrl || null;
      }

      const pesoNum = parseInt(pesoKg, 10) || 0;

      const { error } = await supabase
        .from('productos')
        .insert([
          {
            id_arrendador: userId,
            nombre: `${tipo} ${marca.trim()} ${modelo.trim()}`.trim(),
            precio_hora: parseFloat(precioHora) || 0,
            precio_dia: parseFloat(precioDia) || 0,
            precio_mes: parseFloat(precioMes) || 0,
            peso_kg: pesoNum,
            largo_metros: parseFloat(largoMetros) || 0,
            ancho_metros: parseFloat(anchoMetros) || 0,
            alto_metros: parseFloat(altoMetros) || 0,
            ubicacion_almacen: direccion.trim(),
            foto_url: urlImagenFinal,
            horometro: parseFloat(horometro) || 0,
            pausado: false,
            activo: true,
            disponible: true,
            disponibilidad: true
          }
        ]);

      if (error) throw error;

      navigate('/inventario/rentas');
    } catch (err) {
      console.error('Error al dar de alta equipo:', err);
      setErrorFeedback(err.message || 'No fue posible registrar la maquinaria en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    inputBg: '#1A2332',
    inputBorder: '#3F4E65',
    errorBg: '#442226',
    errorBorder: '#77333B'
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

  if (validandoPerfil) {
    return (
      <div style={{ minHeight: '85vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMain, fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '18px' }}>Verificando perfil de empresa...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', padding: '30px 16px', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: colors.card, padding: '30px 24px', borderRadius: '10px', border: `1px solid ${colors.inputBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        
        <h1 style={{ color: colors.textMain, fontSize: '22px', margin: '0 0 6px 0', textAlign: 'center', fontWeight: 'bold' }}>
          🚜 Alta de Maquinaria y Equipos
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: '0 0 24px 0', lineHeight: '1.4' }}>
          Registra el equipo con sus especificaciones técnicas y tarifas de renta para clientes en Chiapas.
        </p>

        {errorFeedback && (
          <div style={{ backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.textMain, padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
            ⚠️ {errorFeedback}
          </div>
        )}

        <form onSubmit={handleSubirMaquinaria} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Tipo de Equipo / Activo:</label>
            <select style={inputStyle} value={tipo} onChange={(e) => setTipo(e.target.value)} required>
              <option value="">-- Selecciona el tipo de equipo --</option>
              <option value="Excavadora">Excavadora</option>
              <option value="Retroexcavadora">Retroexcavadora</option>
              <option value="Camión de Volteo">Camión de Volteo</option>
              <option value="Vibrocompactador">Vibrocompactador</option>
              <option value="Motoniveladora">Motoniveladora</option>
              <option value="Tractor de Orugas">Tractor de Orugas</option>
              <option value="Minicargador">Minicargador</option>
              <option value="Torre de Iluminación">Torre de Iluminación / Generador</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Marca:</label>
              <input style={inputStyle} type="text" placeholder="Ej. Caterpillar, Komatsu, CASE" value={marca} onChange={(e) => setMarca(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Modelo:</label>
              <input style={inputStyle} type="text" placeholder="Ej. 320D, PC200, 416E" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Horómetro Actual (hrs):</label>
              <input style={inputStyle} type="number" step="0.1" placeholder="Ej. 4250.5" value={horometro} onChange={(e) => setHorometro(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Peso Operativo (Kg):</label>
              <input style={inputStyle} type="number" placeholder="Ej. 21000" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Fotografía del Equipo (Inspección Visual):</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setImagenArchivo(e.target.files[0] || null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: `1px dashed ${colors.inputBorder}`,
                backgroundColor: colors.inputBg,
                color: colors.textSecondary,
                fontSize: '14px',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div>
            <label style={labelStyle}>Dimensiones para Flete (Largo × Ancho × Alto en metros):</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <input style={inputStyle} type="number" step="0.01" placeholder="Largo (m)" value={largoMetros} onChange={(e) => setLargoMetros(e.target.value)} />
              <input style={inputStyle} type="number" step="0.01" placeholder="Ancho (m)" value={anchoMetros} onChange={(e) => setAnchoMetros(e.target.value)} />
              <input style={inputStyle} type="number" step="0.01" placeholder="Alto (m)" value={altoMetros} onChange={(e) => setAltoMetros(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Patio Base / Ubicación de Resguardo:</label>
            <input style={inputStyle} type="text" placeholder="Ej. Tuxtla Gutiérrez, Chiapa de Corzo, Berriozábal" value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
            
            <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '8px 0 6px 0' }}>Toca el mapa para fijar el punto de patio:</p>
            <div style={{ width: '100%', height: '200px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${colors.inputBorder}` }}>
              <MapContainer center={posicion} zoom={13} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ControladorCentro posicion={posicion} />
                <Marker position={posicion} />
                <MonitorClickMapa />
              </MapContainer>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Esquema de Precios (Tarifas de Renta):</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Tarifa Hora ($ MXN):</span>
                <input style={inputStyle} type="number" placeholder="Ej. 850" value={precioHora} onChange={(e) => setPrecioHora(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.accent, display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Tarifa Día ($ MXN) *:</span>
                <input style={inputStyle} type="number" required placeholder="Ej. 6500" value={precioDia} onChange={(e) => setPrecioDia(e.target.value)} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Tarifa Mes ($ MXN):</span>
                <input style={inputStyle} type="number" placeholder="Ej. 120000" value={precioMes} onChange={(e) => setPrecioMes(e.target.value)} />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              minHeight: '48px', 
              backgroundColor: colors.accent, 
              color: '#1A2332', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', 
              fontSize: '16px', 
              marginTop: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? '⏳ Guardando en catálogo...' : '🚜 Registrar y Publicar Maquinaria'}
          </button>
        </form>
      </div>
    </div>
  );
}