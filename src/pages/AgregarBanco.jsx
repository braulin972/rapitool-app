import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function AgregarBanco() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo: 'exito' | 'error', texto: '' }
  const [userId, setUserId] = useState(null);

  const [formData, setFormData] = useState({
    nombre_banco: '',
    tipo_material: 'Grava 3/4',
    precio_m3: '',
    municipio: 'Tuxtla Gutiérrez',
    ubicacion_referencia: '',
    telefono: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/registro-general?redirect=/agregar/banco');
      } else {
        setUserId(session.user.id);
      }
    }
    verificarSesion();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setFeedback(null);
    setLoading(true);

    try {
      const { error } = await supabase.from('catalogo_maestro').insert([{
        usuario_id: userId,
        nombre: `${formData.tipo_material} - ${formData.nombre_banco.trim()}`,
        categoria: 'Materiales de Banco',
        precio_unitario: parseFloat(formData.precio_m3) || 0,
        unidad: 'm³',
        ubicacion: `${formData.municipio.trim()} (${formData.ubicacion_referencia.trim()})`,
        contacto: formData.telefono.trim(),
        pausado: false
      }]);

      if (error) throw error;

      setFeedback({ tipo: 'exito', texto: '✅ Material registrado exitosamente. Redirigiendo a tu inventario...' });
      setTimeout(() => navigate('/inventario/bancos'), 1200);
    } catch (err) {
      console.error('Error al registrar material de banco:', err);
      setFeedback({ tipo: 'error', texto: err.message || 'Error al guardar el material en la base de datos.' });
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
            🏦 Registro de Banco de Materiales
          </h1>
          <Link to="/inventario/bancos" style={{ color: colors.accent, textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
            ← Mis Bancos
          </Link>
        </div>

        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 20px 0', lineHeight: '1.4' }}>
          Publica agregados pétreos, material de banco o triturados para constructores y fleteros en Chiapas.
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
            <label style={labelStyle}>Nombre del Banco o Planta Trituradora:</label>
            <input 
              type="text" 
              required 
              placeholder="Ej. Triturados del Grijalva / Banco San José" 
              value={formData.nombre_banco} 
              onChange={(e) => setFormData({ ...formData, nombre_banco: e.target.value })} 
              style={inputStyle} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Tipo de Agregado / Material:</label>
              <select 
                value={formData.tipo_material} 
                onChange={(e) => setFormData({ ...formData, tipo_material: e.target.value })} 
                style={inputStyle}
              >
                <option value="Grava 3/4">Grava 3/4"</option>
                <option value="Arena Triturada">Arena Triturada</option>
                <option value="Base Hidráulica">Base Hidráulica</option>
                <option value="Sub-base">Sub-base</option>
                <option value="Piedra Braza">Piedra Braza / Mampostería</option>
                <option value="Sello 3/8">Sello 3/8"</option>
                <option value="Balastro">Balastro</option>
                <option value="Tierra Negra">Tierra Negra / Capote</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Precio por m³ en Banco ($ MXN) *:</label>
              <input 
                type="number" 
                required 
                placeholder="Ej. 280" 
                value={formData.precio_m3} 
                onChange={(e) => setFormData({ ...formData, precio_m3: e.target.value })} 
                style={inputStyle} 
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>📍 Municipio / Región:</label>
            <input 
              type="text" 
              required
              value={formData.municipio} 
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })} 
              style={inputStyle} 
              placeholder="Ej. Tuxtla Gutiérrez, Chiapa de Corzo, San Fernando"
            />
          </div>

          <div>
            <label style={labelStyle}>Referencia de Acceso o Tramo Carretero:</label>
            <input 
              type="text" 
              placeholder="Ej. Km 8.5 Carretera Tuxtla - Aeropuerto, desvío a mano derecha" 
              value={formData.ubicacion_referencia} 
              onChange={(e) => setFormData({ ...formData, ubicacion_referencia: e.target.value })} 
              style={inputStyle} 
            />
          </div>

          <div>
            <label style={labelStyle}>📱 Teléfono / WhatsApp de Despacho:</label>
            <input 
              type="tel" 
              required 
              placeholder="Ej. 9611234567" 
              value={formData.telefono} 
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
              style={inputStyle} 
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
            {loading ? '⏳ Publicando material...' : '🏦 Dar de Alta Material en Banco'}
          </button>
        </form>
      </div>
    </div>
  );
}