import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ClienteKYCForm({ onCompletado }) {
  const [tipoPersona, setTipoPersona] = useState('MORAL');
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [telefono, setTelefono] = useState('');

  const [docIneFrontal, setDocIneFrontal] = useState(null);
  const [docIneReverso, setDocIneReverso] = useState(null);
  const [docConstancia, setDocConstancia] = useState(null);
  const [docDomicilio, setDocDomicilio] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const subirDocumento = async (userId, archivo, prefijo) => {
    const ext = archivo.name.split('.').pop();
    const cleanExt = ext.toLowerCase();
    const path = `${userId}/${prefijo}_${Date.now()}.${cleanExt}`;

    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(path, archivo, { upsert: true });

    if (error) throw error;
    return data.path; // Retorna la ruta relativa para URLs firmadas
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setErrorMsg(null);

    try {
      // 1. Validar autenticación
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Debes iniciar sesión para verificar tu identidad.');

      // 2. Validación de RFC estricta
      const rfcLimpio = rfc.trim().toUpperCase();
      const regexFisica = /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/;
      const regexMoral = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/;

      if (tipoPersona === 'FISICA' && !regexFisica.test(rfcLimpio)) {
        throw new Error('El RFC de Persona Física no tiene una estructura válida (13 caracteres).');
      }
      if (tipoPersona === 'MORAL' && !regexMoral.test(rfcLimpio)) {
        throw new Error('El RFC de Persona Moral no tiene una estructura válida (12 caracteres).');
      }

      if (tipoPersona === 'MORAL' && !representanteLegal.trim()) {
        throw new Error('El nombre del Representante Legal es obligatorio para personas morales.');
      }

      if (!docIneFrontal || !docIneReverso || !docConstancia || !docDomicilio) {
        throw new Error('Debes adjuntar todos los documentos requeridos.');
      }

      // 3. Subir los 4 expedientes al Storage privado
      const [pathIneFrontal, pathIneReverso, pathConstancia, pathDomicilio] = await Promise.all([
        subirDocumento(user.id, docIneFrontal, 'ine_frontal'),
        subirDocumento(user.id, docIneReverso, 'ine_reverso'),
        subirDocumento(user.id, docConstancia, 'constancia_sat'),
        subirDocumento(user.id, docDomicilio, 'comprobante_domicilio')
      ]);

      // 4. Guardar o actualizar registro en la tabla kyc_clientes
      const payload = {
        user_id: user.id,
        tipo_persona: tipoPersona,
        razon_social: razonSocial.trim(),
        rfc: rfcLimpio,
        representante_legal: tipoPersona === 'MORAL' ? representanteLegal.trim() : null,
        telefono_contacto: telefono.trim(),
        url_ine_frontal: pathIneFrontal,
        url_ine_reverso: pathIneReverso,
        url_constancia_sat: pathConstancia,
        url_comprobante_domicilio: pathDomicilio,
        estado: 'PENDIENTE_REVISION',
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('kyc_clientes')
        .upsert(payload, { onConflict: 'user_id' });

      if (dbError) throw dbError;

      if (onCompletado) onCompletado();
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar el expediente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-white shadow-xl">
      <div className="border-b border-zinc-800 pb-4 mb-6">
        <h2 className="text-xl font-bold text-amber-500">Expediente de Arrendatario (KYC)</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Por seguridad contra robo de maquinaria y siniestros en obra, la validación fiscal es obligatoria para despachar equipos.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 bg-red-950/60 border border-red-800 text-red-300 text-sm rounded">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector Tipo Persona */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name="tipoPersona"
              value="MORAL"
              checked={tipoPersona === 'MORAL'}
              onChange={() => setTipoPersona('MORAL')}
              className="accent-amber-500"
            />
            Persona Moral (Empresa / Constructora)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name="tipoPersona"
              value="FISICA"
              checked={tipoPersona === 'FISICA'}
              onChange={() => setTipoPersona('FISICA')}
              className="accent-amber-500"
            />
            Persona Física (Contratista con Act. Empresarial)
          </label>
        </div>

        {/* Campos Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">
              {tipoPersona === 'MORAL' ? 'Razón Social' : 'Nombre Completo'}
            </label>
            <input
              type="text"
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Ej: Constructora del Sureste S.A. de C.V."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">RFC Oficial</label>
            <input
              type="text"
              required
              maxLength={13}
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder={tipoPersona === 'MORAL' ? 'CSU200101XYZ' : 'GARM850101XYZ'}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          {tipoPersona === 'MORAL' && (
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Representante Legal</label>
              <input
                type="text"
                required
                value={representanteLegal}
                onChange={(e) => setRepresentanteLegal(e.target.value)}
                placeholder="Nombre conforme a poder notarial"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1">Teléfono Directo de Obra/Oficina</label>
            <input
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="10 dígitos"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Carga de Documentación */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Documentación Probatoria Requerida (PDF o Imagen)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Constancia de Situación Fiscal (SAT)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                required
                onChange={(e) => setDocConstancia(e.target.files[0])}
                className="w-full text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Comprobante Domicilio Fiscal/Patio</label>
              <input
                type="file"
                accept=".pdf,image/*"
                required
                onChange={(e) => setDocDomicilio(e.target.files[0])}
                className="w-full text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">INE / Identificación Oficial (Frontal)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                required
                onChange={(e) => setDocIneFrontal(e.target.files[0])}
                className="w-full text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">INE / Identificación Oficial (Reverso)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                required
                onChange={(e) => setDocIneReverso(e.target.files[0])}
                className="w-full text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-800 file:text-white"
              />
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded transition disabled:opacity-50"
          >
            {cargando ? 'Cargando y Encriptando Documentos...' : 'Enviar Expediente a Validación'}
          </button>
        </div>
      </form>
    </div>
  );
}