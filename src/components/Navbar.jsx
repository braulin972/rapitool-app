import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [subInventarioAbierto, setSubInventarioAbierto] = useState(false);
  const [conteoNoLeidas, setConteoNoLeidas] = useState(0);
  const [tienePerfilNegocio, setTienePerfilNegocio] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickAfuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  useEffect(() => {
    let canalNotificaciones = null;

    async function sincronizarSesion(usuarioActual) {
      setUser(usuarioActual);
      if (usuarioActual) {
        cargarConteoNotificaciones(usuarioActual.id);
        verificarPerfilNegocio(usuarioActual.id);
        if (!canalNotificaciones) {
          canalNotificaciones = suscribirNotificaciones(usuarioActual.id);
        }
      } else {
        setConteoNoLeidas(0);
        setMenuAbierto(false);
        setTienePerfilNegocio(false);
        if (canalNotificaciones) {
          supabase.removeChannel(canalNotificaciones);
          canalNotificaciones = null;
        }
      }
    }

    supabase.auth.getUser().then(({ data: { user: activeUser } }) => {
      sincronizarSesion(activeUser ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sincronizarSesion(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      if (canalNotificaciones) {
        supabase.removeChannel(canalNotificaciones);
      }
    };
  }, []);

  const cargarConteoNotificaciones = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)
        .eq('leido', false);
      if (!error && count !== null) setConteoNoLeidas(count);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    }
  };

  const verificarPerfilNegocio = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles_proveedores')
        .select('id')
        .eq('usuario_id', userId)
        .maybeSingle();
      if (!error) {
        setTienePerfilNegocio(Boolean(data));
      }
    } catch (err) {
      console.error("Error al verificar perfil de negocio:", err);
      setTienePerfilNegocio(false);
    }
  };

  const suscribirNotificaciones = (userId) => {
    try {
      const topicName = `notificaciones-reales-${userId}`;
      const canalExistente = supabase.getChannels().find(c => c.topic === `realtime:${topicName}`);
      if (canalExistente) supabase.removeChannel(canalExistente);

      return supabase
        .channel(topicName)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notificaciones', 
          filter: `usuario_id=eq.${userId}` 
        }, () => {
          cargarConteoNotificaciones(userId);
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn("Realtime no activo o sin permisos en tabla 'notificaciones'.");
          }
        });
    } catch (err) {
      console.error("Fallo de suscripción Realtime:", err);
      return null;
    }
  };

  const handleProfileClick = () => {
    if (!user) {
      navigate('/registro-general');
    } else {
      verificarPerfilNegocio(user.id);
      setMenuAbierto(prev => !prev);
    }
  };

  const handleAgregarClick = async (rutaExito) => {
    setMenuAbierto(false);
    if (!user) {
      navigate(`/registro-general?redirect=${encodeURIComponent(rutaExito)}`);
      return;
    }
    const { data } = await supabase
      .from('perfiles_proveedores')
      .select('id')
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (data) {
      setTienePerfilNegocio(true);
      navigate(rutaExito);
    } else {
      setTienePerfilNegocio(false);
      navigate(`/registro-negocio?redirect=${encodeURIComponent(rutaExito)}`);
    }
  };

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    setMenuAbierto(false);
    setTienePerfilNegocio(false);
    navigate('/');
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    if (!busqueda.trim()) {
      navigate('/');
      return;
    }
    navigate(`/?q=${encodeURIComponent(busqueda.trim())}`);
  };

  return (
    <header style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#111', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', position: 'relative', zIndex: 100 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <strong 
            style={{ color: '#FFF', fontSize: '18px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }} 
            onClick={() => navigate('/')}
          >
            INDUSTRIAS WERT<span style={{ color: '#FAD02C' }}>.</span>
          </strong>
        </div>

        <form onSubmit={handleBuscar} style={{ flex: 1, maxWidth: '500px', margin: '0 20px', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar excavadoras, retroexcavadoras, volteos..." 
            style={{ width: '100%', padding: '6px 12px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#222', color: '#FFF', fontSize: '14px', outline: 'none' }} 
          />
          <button type="submit" style={{ backgroundColor: '#FAD02C', color: '#000', border: 'none', padding: '6px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Buscar
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '25px', position: 'relative' }} ref={menuRef}>
          <div 
            onClick={() => user ? navigate('/notificaciones') : navigate('/registro-general')} 
            style={{ position: 'relative', cursor: 'pointer', fontSize: '18px', userSelect: 'none' }} 
            title="Notificaciones"
          >
            🔔
            {conteoNoLeidas > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-8px', backgroundColor: '#FF3B30', color: '#FFF', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', lineHeight: '1', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }}>
                {conteoNoLeidas}
              </span>
            )}
          </div>

          <div 
            onClick={handleProfileClick} 
            style={{ backgroundColor: '#0056b3', color: '#FFF', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
          >
            {user?.email ? user.email[0].toUpperCase() : '👤'}
          </div>

          {menuAbierto && user && (
            <div style={{ position: 'absolute', top: '45px', right: '0', backgroundColor: '#FFFFFF', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', padding: '12px', width: '240px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 101, border: '1px solid #ddd' }}>
              
              <div style={{ color: '#333', fontSize: '11px', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '6px', wordBreak: 'break-all' }}>
                👤 {user.email}
              </div>

              <button onClick={() => { setMenuAbierto(false); navigate('/mi-perfil'); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#333', cursor: 'pointer', borderRadius: '4px' }}>
                ⚙️ 1. Mi Perfil
              </button>

              <button onClick={() => { setMenuAbierto(false); navigate('/mis-movimientos'); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#333', cursor: 'pointer', borderRadius: '4px' }}>
                📦 2. Mis Movimientos (Historial)
              </button>

              <div>
                <button 
                  onClick={() => setSubInventarioAbierto(prev => !prev)} 
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#333', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>🗂️ 3. Mi Inventario</span>
                  <span>{subInventarioAbierto ? '▲' : '▼'}</span>
                </button>
                
                {subInventarioAbierto && (
                  <div style={{ backgroundColor: '#f9f9f9', borderRadius: '4px', paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    <button onClick={() => { setMenuAbierto(false); navigate('/inventario/rentas'); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '5px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>• Maquinaria / Rentas</button>
                    <button onClick={() => { setMenuAbierto(false); navigate('/inventario/fletes'); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '5px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>• Fletes y Logística</button>
                    <button onClick={() => { setMenuAbierto(false); navigate('/inventario/bancos'); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '5px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>• Bancos de Materiales</button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #eee', margin: '6px 0' }}></div>

              <button onClick={() => handleAgregarClick('/agregar/renta')} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#0056b3', cursor: 'pointer', fontWeight: 'bold' }}>
                ➕ 4. Agregar Renta
              </button>

              <button onClick={() => handleAgregarClick('/agregar/flete')} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#0056b3', cursor: 'pointer', fontWeight: 'bold' }}>
                🚛 5. Agregar Fletes
              </button>

              <button onClick={() => handleAgregarClick('/agregar/banco')} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#0056b3', cursor: 'pointer', fontWeight: 'bold' }}>
                🏦 6. Registrar Banco
              </button>

              <button onClick={handleCerrarSesion} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#cc0000', cursor: 'pointer', fontWeight: 'bold', borderTop: '1px solid #eee', marginTop: '6px', paddingTop: '10px' }}>
                🚪 Cerrar Sesión
              </button>

            </div>
          )}
        </div>
      </div>

      <nav style={{ backgroundColor: '#111', padding: '8px 20px', display: 'flex', gap: '25px', fontSize: '13px', borderBottom: '1px solid #222', color: '#AAA' }}>
        <span style={{ color: '#FAD02C', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/')}>
          🚜 Maquinaria y Equipos
        </span>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/inventario/fletes')}>
          🚛 Fletes y Logística
        </span>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/inventario/bancos')}>
          🏦 Bancos de Materiales
        </span>
      </nav>
    </header>
  );
}