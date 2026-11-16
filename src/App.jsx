import { useState, useEffect } from 'react';
import { Routes, Route, Link, useSearchParams } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Componentes y Páginas
import Navbar from './components/Navbar';
import RegistroGeneral from './pages/RegistroGeneral';
import RegistroNegocio from './pages/RegistroNegocio';
import Notificaciones from './pages/Notificaciones';
import AgregarRenta from './pages/AgregarRenta';
import InventarioRentas from './pages/InventarioRentas';
import EditarRenta from './pages/EditarRenta';
import DetalleProducto from './pages/DetalleProducto'; 

// Fletes y Bancos
import AgregarFlete from './pages/AgregarFlete';
import AgregarBanco from './pages/AgregarBanco';
import InventarioFletes from './pages/InventarioFletes';
import InventarioBancos from './pages/InventarioBancos';

// Perfil e Historial
import MiPerfil from './pages/MiPerfil';
import MisMovimientos from './pages/MisMovimientos';

// Flujo de Custodia SPEI, Pagos y Backoffice
import CheckoutFlete from './pages/CheckoutFlete';
import CheckoutPago from './pages/CheckoutPago';
import AdminWert from './pages/AdminWert';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23222%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23666%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ESin%20Imagen%3C%2Ftext%3E%3C%2Fsvg%3E";

const publicStyles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', maxWidth: '1100px', margin: '30px auto 0 auto', padding: '0 20px' },
  card: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', minHeight: '380px' },
  imgContainer: { width: '100%', height: '180px', backgroundColor: '#222', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  content: { padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'space-between' },
  title: { fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#FFF', textAlign: 'left', display: '-webkit-box', WebKitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  price: { fontSize: '15px', color: '#FAD02C', fontWeight: 'bold', textAlign: 'left' },
  btnRent: { width: '100%', padding: '12px 0', backgroundColor: '#FAD02C', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', fontSize: '14px', marginTop: 'auto' }
};

export default function App() {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [searchParams] = useSearchParams();
  const terminoBusqueda = (searchParams.get('q') || '').trim();
  const ubicacionObra = 'Tuxtla Gutiérrez, Chiapas';

  useEffect(() => {
    let activo = true;
    async function cargarDatosBase() {
      try {
        setLoading(true);
        setErrorCarga(null);
        
        let query = supabase
          .from('productos')
          .select('id, nombre, precio_dia, foto_url, pausado, activo')
          .or('pausado.is.null,pausado.eq.false')
          .or('activo.is.null,activo.eq.true')
          .order('id', { ascending: false })
          .limit(30);

        if (terminoBusqueda) {
          query = query.ilike('nombre', `%${terminoBusqueda}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        if (activo) setEquipos(data || []);
      } catch (err) {
        console.error("Error al consultar productos:", err.message || err);
        if (activo) setErrorCarga("No se pudo cargar el catálogo. Intenta nuevamente más tarde.");
      } finally {
        if (activo) setLoading(false);
      }
    }
    cargarDatosBase();
    return () => { activo = false; };
  }, [terminoBusqueda]);

  return (
    <div style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', color: '#FFF', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/editar/renta/:id" element={<EditarRenta />} />
          <Route path="/producto/:id" element={<DetalleProducto />} />
          <Route path="/agregar/renta" element={<AgregarRenta />} />
          <Route path="/inventario/rentas" element={<InventarioRentas />} />

          <Route path="/registro-general" element={<RegistroGeneral />} />
          <Route path="/registro-negocio" element={<RegistroNegocio />} />
          <Route path="/notificaciones" element={<Notificaciones />} />

          <Route path="/agregar/flete" element={<AgregarFlete />} />
          <Route path="/inventario/fletes" element={<InventarioFletes />} />
          <Route path="/agregar/banco" element={<AgregarBanco />} />
          <Route path="/inventario/bancos" element={<InventarioBancos />} />

          <Route path="/mi-perfil" element={<MiPerfil />} />
          <Route path="/mis-movimientos" element={<MisMovimientos />} />

          <Route path="/checkout/flete" element={<CheckoutFlete />} />
          <Route path="/checkout/pago" element={<CheckoutPago />} />
          <Route path="/admin-wert" element={<AdminWert />} />

          <Route path="/" element={
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Maquinaria Pesada y Equipos en Renta</h2>
              <p style={{ color: '#AAA', marginTop: '6px' }}>📍 Zona de cobertura: <span style={{ color: '#FAD02C', fontWeight: 'bold' }}>{ubicacionObra}</span></p>
              
              {terminoBusqueda && (
                <p style={{ color: '#C5D1E0', marginTop: '12px', fontSize: '14px' }}>
                  Filtrando por: <strong>"{terminoBusqueda}"</strong> — <Link to="/" style={{ color: '#FAD02C' }}>Ver todo</Link>
                </p>
              )}

              {loading ? (
                <p style={{ color: '#888', marginTop: '30px' }}>Cargando catálogo...</p>
              ) : errorCarga ? (
                <p style={{ color: '#FF5555', marginTop: '30px' }}>{errorCarga}</p>
              ) : equipos.length === 0 ? (
                <p style={{ color: '#666', marginTop: '40px' }}>No hay maquinaria disponible con esos criterios en este momento.</p>
              ) : (
                <div style={publicStyles.grid}>
                  {equipos.map((equipo) => (
                    <Link to={`/producto/${equipo.id}`} key={equipo.id} style={publicStyles.card}>
                      <div style={publicStyles.imgContainer}>
                        <img 
                          src={equipo.foto_url || NO_IMAGE_PLACEHOLDER} 
                          alt={equipo.nombre || 'Equipo'} 
                          style={publicStyles.img} 
                          onError={(e) => { 
                            e.currentTarget.onerror = null; 
                            e.currentTarget.src = NO_IMAGE_PLACEHOLDER; 
                          }}
                        />
                      </div>
                      <div style={publicStyles.content}>
                        <div>
                          <h4 style={publicStyles.title}>{equipo.nombre}</h4>
                          <span style={publicStyles.price}>📅 Día: ${Number(equipo.precio_dia || 0).toLocaleString('es-MX')} MXN</span>
                        </div>
                        <div style={publicStyles.btnRent}>
                          ⚡ Ver Detalles y Rentar
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          } />

          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <h2 style={{ fontSize: '32px', color: '#FAD02C' }}>404</h2>
              <p style={{ color: '#AAA', margin: '15px 0' }}>La página que buscas no existe o fue movida.</p>
              <Link to="/" style={{ color: '#000', backgroundColor: '#FAD02C', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
                Volver al Inicio
              </Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}