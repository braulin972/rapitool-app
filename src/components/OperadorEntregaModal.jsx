import React, { useState } from 'react';
import { useEntregaProtocolo } from '../hooks/useEntregaProtocolo';

export default function OperadorEntregaModal({ orden, onEntregaCompletada, onCerrar }) {
  const [pin, setPin] = useState('');
  const [horometro, setHorometro] = useState('');
  const [fotoHorometro, setFotoHorometro] = useState(null);
  const [fotoSitio, setFotoSitio] = useState(null);
  const { confirmarLlegadaObra, subiendo, error } = useEntregaProtocolo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await confirmarLlegadaObra({
        ordenId: orden.id,
        pin,
        horometro,
        fotoHorometro,
        fotoSitio
      });
      onEntregaCompletada();
    } catch (err) {
      // Error expuesto por el hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-xl max-w-lg w-full p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-amber-500">
            Protocolo de Entrega en Sitio
          </h2>
          <p className="text-sm text-zinc-400">
            Folio: <span className="font-mono text-white">{orden.folio_spei}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 text-sm p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">
              PIN Dinámico del Cliente (4 dígitos)
            </label>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-3xl font-mono py-2 bg-zinc-950 border border-zinc-700 rounded tracking-widest focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">
              Lectura Actual del Horómetro (Horas)
            </label>
            <input
              type="number"
              step="0.1"
              required
              value={horometro}
              onChange={(e) => setHorometro(e.target.value)}
              placeholder="Ej: 1450.5"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Foto Horómetro</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                required
                onChange={(e) => setFotoHorometro(e.target.files[0])}
                className="text-xs text-zinc-400 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Foto Máquina en Obra</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                required
                onChange={(e) => setFotoSitio(e.target.files[0])}
                className="text-xs text-zinc-400 file:mr-2 file:py-2 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={subiendo}
              className="flex-1 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendo}
              className="flex-1 py-2 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold transition disabled:opacity-50"
            >
              {subiendo ? 'Validando...' : 'Confirmar Recepción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}