import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix obligatorio para íconos de Leaflet en Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CENTRO_TUXTLA = [16.7528, -93.1167];

// Subcomponente para sincronizar la cámara del mapa cuando cambia la posición
function RecentradorMapa({ posicion }) {
  const map = useMap();
  useEffect(() => {
    if (posicion) {
      map.setView(posicion, 14, { animate: true });
    }
  }, [posicion, map]);
  return null;
}

// Subcomponente para capturar clics directos sobre el mapa
function DetectorClicsMapa({ onClic }) {
  useMapEvents({
    click(e) {
      onClic([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function SelectorUbicacion({ onUbicacionConfirmada, onCerrar }) {
  const [posicion, setPosicion] = useState(CENTRO_TUXTLA);
  const [municipioTexto, setMunicipioTexto] = useState('');
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleMapClick = (coords) => {
    setPosicion(coords);
    setMunicipioTexto(`Ubicación seleccionada (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
    setErrorMsg(null);
  };

  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Tu navegador no soporta geolocalización.");
      return;
    }
    setCargandoGPS(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setPosicion(coords);
        setMunicipioTexto("Mi ubicación actual (GPS)");
        setCargandoGPS(false);
      },
      (error) => {
        console.error("Fallo de GPS:", error);
        setErrorMsg("No se pudo acceder a tu GPS. Por favor selecciona un punto en el mapa.");
        setCargandoGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirmar = () => {
    if (!municipioTexto.trim()) {
      setErrorMsg("Por favor, ingresa un municipio o toca el mapa para marcar la obra.");
      return;
    }
    onUbicacionConfirmada({
      nombre: municipioTexto.trim(),
      lat: posicion[0],
      lng: posicion[1]
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: 'Arial, sans-serif', color: '#FFF'
    }}>
      <div style={{
        backgroundColor: '#161616', padding: '24px', borderRadius: '8px',
        maxWidth: '480px', width: '90%', border: '1px solid #2A2A2A', boxSizing: 'border-box',
        position: 'relative'
      }}>
        {onCerrar && (
          <button 
            onClick={onCerrar}
            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}

        <h3 style={{ color: '#FAD02C', textAlign: 'center', margin: '0 0 8px 0', fontSize: '20px' }}>
          📍 Zona de la Obra
        </h3>
        <p style={{ textAlign: 'center', color: '#AAA', fontSize: '13px', margin: '0 0 16px 0' }}>
          Indica la ubicación para calcular fletes y disponibilidad de maquinaria.
        </p>

        {errorMsg && (
          <div style={{ backgroundColor: '#331111', border: '1px solid #772222', color: '#FF7777', padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* Opción GPS */}
        <button 
          onClick={obtenerUbicacionGPS}
          disabled={cargandoGPS}
          style={{
            width: '100%', padding: '10px', backgroundColor: '#0056b3', color: '#FFF',
            border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: cargandoGPS ? 'not-allowed' : 'pointer', marginBottom: '12px', fontSize: '14px'
          }}
        >
          {cargandoGPS ? "Obteniendo coordenadas GPS..." : "🎯 Usar mi ubicación actual"}
        </button>

        {/* Campo de texto */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px' }}>Municipio o Referencia:</label>
          <input 
            type="text" 
            placeholder="Ej. Tuxtla Gutiérrez, Berriozábal, Chiapa de Corzo..." 
            value={municipioTexto}
            onChange={(e) => {
              setMunicipioTexto(e.target.value);
              setErrorMsg(null);
            }}
            style={{ width: '100%', padding: '9px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#222', color: '#FFF', boxSizing: 'border-box', fontSize: '13px' }}
          />
        </div>

        {/* Mapa */}
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px' }}>O marca el punto en el mapa:</label>
        <div style={{ height: '180px', width: '100%', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px', border: '1px solid #333' }}>
          <MapContainer center={posicion} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecentradorMapa posicion={posicion} />
            <DetectorClicsMapa onClic={handleMapClick} />
            <Marker position={posicion} />
          </MapContainer>
        </div>

        {/* Confirmar */}
        <button 
          onClick={handleConfirmar}
          style={{
            width: '100%', padding: '12px', backgroundColor: '#FAD02C', color: '#000',
            border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px'
          }}
        >
          Confirmar y Continuar
        </button>
      </div>
    </div>
  );
}