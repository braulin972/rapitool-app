import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const CAPACIDADES_POR_TIPO = {
  'Volteo 7m3': '7 m³',
  'Volteo 14m3': '14 m³',
  'Góndola 30m3': '30 m³',
  'Plataforma': 'Hasta 30 Toneladas',
  'Pipa de Agua': '10,000 Litros'
};

export default function AgregarFlete() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo: 'exito' | 'error', texto: '' }
  const [userId, setUserId] = useState(null);

  const [formData, setFormData] = useState({
    tipo_unidad: 'Volteo 7m3',
    capacidad: '7 m³',
    tarifa_base: '',
    precio_km: '',
    ubicacion_base: 'Tuxtla Gutiérrez, Chiapas',
    descripcion: '',
    contacto_telefono: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/registro-general?redirect=/agregar/flete');
      } else {
        setUserId(session.user.id);
      }
    }
    verificarSesion();
  }, [navigate]);

  const handleTipoChange = (e) => {
    const nuevoTipo = e.target.value;
    setFormData(prev => ({
      ...prev,
      tipo_unidad: nuevoTipo,
      capacidad: CAPACIDADES_POR_TIPO[nuevoTipo] || prev.capacidad
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setFeedback(null);
    setLoading(true);

    try {
      const { error } = await supabase.from('datos_fletero').insert([{
        usuario_id: userId,
        tipo_unidad: formData.tipo_unidad,
        capacidad: formData.capacidad,
        tarifa_base: parseFloat(formData.tarifa_base) || 0,
        precio_km: parseFloat(formData.precio_km) || 0,
        ubicacion_base: formData.ubicacion_base.trim(),
        descripcion: formData.descripcion.trim(),
        contacto_telefono: formData.contacto_telefono.trim(),
        pausado: false
      }]);

      if (error) throw error;

      setFeedback({ tipo: 'exito', texto: '✅ Unidad de flete registrada con éxito. Redirigiendo a tu inventario...' });
      setTimeout(() => navigate('/inventario/fletes'), 1200);
    } catch (err) {
      console.error('Error al registrar flete:', err);
      setFeedback({ tipo: 'error', texto: err.message || 'Error al guardar la unidad de flete.' });
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
    errorBorder: '#77333B',
    exitoBg: '#1F3D2B',
    exitoBorder: '#2E6343'
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
    fontSize: '14px', 
    fontWeight: 'bold', 
    color: colors.textMain, 
    marginBottom: '6px' 
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, padding: '30px 16px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: colors.card, padding: '30px 24px', borderRadius: '10px', border: `1px solid ${colors.inputBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '22px', color: colors.textMain, margin: 0, fontWeight: 'bold' }}>
            🚛 Alta de Flete y Acarreo
          </h1>
          <Link to="/inventario/fletes" style={{ color: colors.accent, textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
            ← Mis Fletes
          </Link>
        </div>
        
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 20px 0', lineHeight: '1.4' }}>
          Registra camiones de volteo, tolvas, pipas o plataformas disponibles para fletes y frentes de obra en Chiapas.
        </p>

        {feedback && (
          <div style={{
            backgroundColor: feedback.tipo === 'error' ? colors.errorBg : colors.exitoBg,
            border: `1px solid ${feedback.tipo === 'error' ? colors.errorBorder : colors.exitoBorder}`,
            color: colors.textMain,
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {feedback.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={labelStyle}>Tipo de Unidad de Transporte:</label>
            <select 
              value={formData.tipo_unidad} 
              onChange={handleTipoChange} 
              style={inputStyle}
            >
              <option value="Volteo 7m3">Camión de Volteo (7 m³)</option>
              <option value="Volteo 14m3">Camión de Volteo (14 m³)</option>
              <option value="Góndola 30m3">Góndola / Tolva (30 m³)</option>
              <option value="Plataforma">Cama Baja / Lowboy (Maquinaria)</option>
              <option value="Pipa de Agua">Pipa de Agua (10,000 L)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Capacidad de Carga Calculada:</label>
            <input 
              type="text" 
              value={formData.capacidad} 
              onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })} 
              style={inputStyle} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Tarifa Base / Viaje Mínimo ($ MXN) *:</label>
              <input 
                type="number" 
                required 
                placeholder="Ej. 1200" 
                value={formData.tarifa_base} 
                onChange={(e) => setFormData({ ...formData, tarifa_base: e.target.value })} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Costo Adicional por Km ($ MXN):</label>
              <input 
                type="number" 
                placeholder="Ej. 35" 
                value={formData.precio_km} 
                onChange={(e) => setFormData({ ...formData, precio_km: e.target.value })} 
                style={inputStyle} 
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>📍 Base de Operación / Patio:</label>
            <input 
              type="text" 
              required
              value={formData.ubicacion_base} 
              onChange={(e) => setFormData({ ...formData, ubicacion_base: e.target.value })} 
              style={inputStyle} 
              placeholder="Ej. Tuxtla Gutiérrez, Chiapa de Corzo, Berriozábal"
            />
          </div>

          <div>
            <label style={labelStyle}>📱 Teléfono / WhatsApp de Despacho:</label>
            <input 
              type="tel" 
              required 
              placeholder="Ej. 9611234567" 
              value={formData.contacto_telefono} 
              onChange={(e) => setFormData({ ...formData, contacto_telefono: e.target.value })} 
              style={inputStyle} 
            />
          </div>

          <div>
            <label style={labelStyle}>Condiciones de Operación / Detalles:</label>
            <textarea 
              rows="3" 
              placeholder="Disponibilidad diurna/nocturna, viajes locales o foráneos, etc." 
              value={formData.descripcion} 
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} 
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
            />
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
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontSize: '16px',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? '⏳ Guardando unidad...' : '🚛 Registrar Unidad de Transporte'}
          </button>
        </form>
      </div>
    </div>
  );
}