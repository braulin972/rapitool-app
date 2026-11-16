import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

export default function CheckoutFlete() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tipoFlete, setTipoFlete] = useState('plataforma');

  // Respaldo preventivo si entran directo sin state
  const datosPrevios = location.state || {
    nombreEquipo: "Maquinaria en Renta",
    empresa: "Industrias Wert",
    costoRenta: 4500,
    detallesTiempo: "1 día"
  };

  const nombreEquipo = datosPrevios.nombreEquipo || "Maquinaria en Renta";
  const empresa = datosPrevios.empresa || "Industrias Wert";
  const costoRenta = Number(datosPrevios.costoRenta) || 0;
  const detallesTiempo = datosPrevios.detallesTiempo || "Periodo acordado";

  const costoFlete = tipoFlete === 'plataforma' ? 1500 : 0;
  const granTotal = costoRenta + costoFlete;

 const procederAlPago = () => {
    navigate('/checkout/pago', {
      state: { 
        ...datosPrevios, // Conserva productoId, proveedorId, municipio, etc.
        nombreEquipo, 
        empresa, 
        costoRenta, 
        costoFlete, 
        granTotal, 
        detallesTiempo,
        tipoFlete 
      }
    });
  };

  const colors = {
    bg: '#202B3C',
    card: '#2A374A',
    cardSelected: '#33445C',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    inputBg: '#1A2332',
    inputBorder: '#3F4E65'
  };

  return (
    <div style={{ backgroundColor: colors.bg, minHeight: '100vh', color: colors.textMain, fontFamily: 'Arial, sans-serif', padding: '30px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* ENLACE DE RETORNO */}
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px' }}>
          <Link to="/" style={{ color: colors.accent, textDecoration: 'none', fontWeight: 'bold' }}>← Volver al Catálogo</Link>
        </p>

        <div style={{ backgroundColor: colors.card, padding: '30px 24px', borderRadius: '10px', border: `1px solid ${colors.inputBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          
          <h1 style={{ color: colors.textMain, margin: '0 0 6px 0', fontSize: '22px', fontWeight: 'bold' }}>
            🚛 Logística y Traslado a Obra
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.4' }}>
            Selecciona cómo llegará la maquinaria a tu frente de trabajo:
          </p>

          {/* OPCIONES DE TRASLADO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '25px' }}>
            
            <div 
              onClick={() => setTipoFlete('plataforma')}
              style={{ 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'center', 
                padding: '18px', 
                backgroundColor: tipoFlete === 'plataforma' ? colors.cardSelected : colors.inputBg, 
                borderRadius: '8px', 
                border: tipoFlete === 'plataforma' ? `2px solid ${colors.accent}` : `1px solid ${colors.inputBorder}`, 
                cursor: 'pointer' 
              }}
            >
              <input 
                type="radio" 
                name="flete"
                checked={tipoFlete === 'plataforma'} 
                onChange={() => setTipoFlete('plataforma')} 
                style={{ width: '20px', height: '20px', accentColor: colors.accent, cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '16px', color: colors.textMain, display: 'block', marginBottom: '4px' }}>
                  🚚 Flete Oficial Industrias Wert (+ $1,500 MXN)
                </strong>
                <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.4' }}>
                  Traslado coordinado en cama baja o lowboy con amarre certificado y póliza activa de arrastre.
                </p>
              </div>
            </div>

            <div 
              onClick={() => setTipoFlete('autoflete')}
              style={{ 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'center', 
                padding: '18px', 
                backgroundColor: tipoFlete === 'autoflete' ? colors.cardSelected : colors.inputBg, 
                borderRadius: '8px', 
                border: tipoFlete === 'autoflete' ? `2px solid ${colors.accent}` : `1px solid ${colors.inputBorder}`, 
                cursor: 'pointer' 
              }}
            >
              <input 
                type="radio" 
                name="flete"
                checked={tipoFlete === 'autoflete'} 
                onChange={() => setTipoFlete('autoflete')} 
                style={{ width: '20px', height: '20px', accentColor: colors.accent, cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '16px', color: colors.textMain, display: 'block', marginBottom: '4px' }}>
                  🚜 Autoflete / Recolección Propia ($0.00 MXN)
                </strong>
                <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary, lineHeight: '1.4' }}>
                  Envías tu propio transporte de plataforma a cargar y retirar el equipo directamente al patio base.
                </p>
              </div>
            </div>

          </div>

          {/* RESUMEN FINANCIERO */}
          <div style={{ backgroundColor: colors.inputBg, padding: '18px', borderRadius: '8px', border: `1px solid ${colors.inputBorder}`, marginBottom: '25px', fontSize: '15px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' }}>
              Resumen de Operación:
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: colors.textSecondary }}>{nombreEquipo} ({detallesTiempo}):</span>
              <span style={{ fontWeight: 'bold', color: colors.textMain }}>${costoRenta.toLocaleString('es-MX')} MXN</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: colors.textSecondary }}>Servicio de Flete:</span>
              <span style={{ fontWeight: 'bold', color: colors.textMain }}>${costoFlete.toLocaleString('es-MX')} MXN</span>
            </div>
            <hr style={{ border: `0.5px solid ${colors.inputBorder}`, margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: colors.textMain }}>Total a Liquidar:</span>
              <span style={{ fontWeight: 'bold', color: colors.accent, fontSize: '20px' }}>
                ${granTotal.toLocaleString('es-MX')} MXN
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={procederAlPago} 
            style={{ 
              width: '100%', 
              minHeight: '48px', 
              backgroundColor: colors.accent, 
              color: '#1A2332', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '16px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Continuar al Método de Liquidación →
          </button>
        </div>
      </div>
    </div>
  );
}