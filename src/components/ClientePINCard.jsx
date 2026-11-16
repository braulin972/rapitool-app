import React, { useEffect, useState } from 'react';

export default function ClientePINCard({ orden, pinPlanoGenerado }) {
  const [tiempoRestante, setTiempoRestante] = useState(null);

  useEffect(() => {
    if (orden.estado !== 'ENTREGADA_VENTANA_PRUEBA' || !orden.limite_ventana_prueba) return;

    const actualizarContador = () => {
      const limite = new Date(orden.limite_ventana_prueba).getTime();
      const ahora = new Date().getTime();
      const diferencia = limite - ahora;

      if (diferencia <= 0) {
        setTiempoRestante('Ventana de prueba finalizada');
      } else {
        const horas = Math.floor((diferencia / (1000 * 60 * 60)) % 24);
        const minutos = Math.floor((diferencia / (1000 * 60)) % 60);
        const segundos = Math.floor((diferencia / 1000) % 60);
        setTiempoRestante(`${horas}h ${minutos}m ${segundos}s`);
      }
    };

    actualizarContador();
    const interval = setInterval(actualizarContador, 1000);
    return () => clearInterval(interval);
  }, [orden]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-white max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Código de Seguridad en Obra</h3>
        <span className="text-xs px-2 py-1 bg-amber-950 text-amber-400 border border-amber-800 rounded font-mono">
          {orden.estado}
        </span>
      </div>

      {orden.estado === 'EN_TRANSITO' || orden.estado === 'EN_CUSTODIA_WERT' ? (
        <div className="text-center py-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <p className="text-xs text-zinc-400 mb-2">ENTREGA ESTE CÓDIGO AL OPERADOR AL LLEGAR:</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-amber-400">
            {pinPlanoGenerado || '••••'}
          </p>
          <p className="text-xs text-zinc-500 mt-2 px-4">
            No proporciones este número antes de inspeccionar que la máquina se encuentra físicamente posicionada en tu terreno.
          </p>
        </div>
      ) : null}

      {orden.estado === 'ENTREGADA_VENTANA_PRUEBA' && (
        <div className="mt-4 p-4 bg-blue-950/40 border border-blue-800 rounded-lg">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
            Ventana de Prueba Activa (2 Horas)
          </p>
          <p className="text-2xl font-mono text-white mt-1">{tiempoRestante}</p>
          <p className="text-xs text-zinc-400 mt-2">
            Verifica el funcionamiento del motor, fugas y sistemas hidráulicos. Si detectas fallas, abre una disputa de inmediato.
          </p>
        </div>
      )}
    </div>
  );
}