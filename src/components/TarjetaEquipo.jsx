import { Link } from 'react-router-dom';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231A2332%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%238A9BB0%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ESin%20Imagen%20Disponible%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function TarjetaEquipo({ equipo = {} }) {
  const idFinal = equipo.id || '0';
  const nombreFinal = equipo.nombre_equipo || equipo.nombre || 'Equipo en renta';
  const precioFinal = Number(equipo.precio_dia || equipo.precio || 0);
  const esPesada = equipo.categoria_automatica === 'maquinaria_pesada' || equipo.categoria === 'pesada';
  
  // Soporte para join relacional o propiedad plana
  const estaVerificado = Boolean(
    equipo.perfiles_proveedores?.verificado || 
    equipo.proveedor_verificado || 
    equipo.verificado
  );

  const colors = {
    cardBg: '#2A374A',
    cardInner: '#1A2332',
    border: '#3F4E65',
    textMain: '#F4EFE6',
    textSecondary: '#C5D1E0',
    accent: '#E58A3C',
    goldBg: '#3B3216',
    goldBorder: '#C89D3C',
    goldText: '#F7D070',
    warnBg: '#382818',
    warnBorder: '#8A531C',
    warnText: '#F8B667'
  };

  return (
    <article style={{ 
      backgroundColor: colors.cardBg, 
      border: `1px solid ${colors.border}`, 
      borderRadius: '8px', 
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative'
    }}>
      {/* Contenedor de Imagen con Insignia Superpuesta */}
      <div style={{ width: '100%', height: '170px', backgroundColor: colors.cardInner, overflow: 'hidden', position: 'relative' }}>
        <img 
          src={equipo.foto_url || NO_IMAGE_PLACEHOLDER} 
          alt={nombreFinal}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = NO_IMAGE_PLACEHOLDER;
          }}
        />

        {/* Doble señalización en la imagen (Ícono + Categoría) */}
        <span style={{ 
          position: 'absolute',
          top: '10px',
          left: '10px',
          fontSize: '11px', 
          color: colors.textMain, 
          fontWeight: 'bold', 
          backgroundColor: 'rgba(26, 35, 50, 0.9)', 
          border: `1px solid ${colors.border}`,
          padding: '4px 8px', 
          borderRadius: '4px',
          textTransform: 'uppercase',
          backdropFilter: 'blur(4px)'
        }}>
          {esPesada ? '🚜 PESADA' : '🧰 LIGERA'}
        </span>
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          {/* SELLO OFICIAL VS ADVERTENCIA DE DESLINDE */}
          <div style={{ marginBottom: '10px' }}>
            {estaVerificado ? (
              <div 
                title="Proveedor auditado físicamente en patio y con documentación fiscal/seguro cotejada."
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  backgroundColor: colors.goldBg, 
                  border: `1px solid ${colors.goldBorder}`, 
                  color: colors.goldText, 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold' 
                }}
              >
                <span>🛡️</span>
                <span>Avalado por Industrias Wert</span>
              </div>
            ) : (
              <div 
                title="Industrias Wert actúa únicamente como tablón técnico neutral. Operación bajo propio riesgo."
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  backgroundColor: colors.warnBg, 
                  border: `1px solid ${colors.warnBorder}`, 
                  color: colors.warnText, 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontWeight: 'bold' 
                }}
              >
                <span>⚠️</span>
                <span>Proveedor Independiente (No Auditado)</span>
              </div>
            )}
          </div>

          <h3 style={{ 
            margin: '0 0 6px 0', 
            color: colors.textMain, 
            fontSize: '16px', 
            fontWeight: 'bold',
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '42px'
          }}>
            {nombreFinal}
          </h3>

          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textSecondary }}>
            📍 {equipo.ubicacion || 'Centro • Chiapas'}
          </p>
        </div>

        {/* Barra de Precio y Acción con área táctil >= 48px */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: `1px solid ${colors.border}` 
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: colors.textSecondary }}>Tarifa Diaria</p>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: colors.accent }}>
              ${precioFinal.toLocaleString('es-MX')}{' '}
              <span style={{ fontSize: '11px', color: colors.textSecondary }}>MXN</span>
            </p>
          </div>
          
          <Link 
            to={`/producto/${idFinal}`} 
            style={{ 
              textDecoration: 'none',
              minHeight: '48px',
              padding: '0 16px', 
              backgroundColor: colors.accent, 
              color: '#1A2332', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}
          >
            Ver Detalles
          </Link>
        </div>
      </div>
    </article>
  );
}