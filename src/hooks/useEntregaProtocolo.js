import { useState } from 'react';
import { supabase } from '../supabaseClient';

export function useEntregaProtocolo() {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  const subirEvidenciaTerreno = async (ordenId, archivo, prefijo) => {
    const fileExt = archivo.name.split('.').pop();
    const filePath = `entregas/${ordenId}/${prefijo}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, archivo, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const confirmarLlegadaObra = async ({ ordenId, pin, horometro, fotoHorometro, fotoSitio }) => {
    setSubiendo(true);
    setError(null);

    try {
      if (!/^\d{4}$/.test(pin)) {
        throw new Error('El PIN debe ser exactamente de 4 dígitos numéricos.');
      }
      if (!horometro || Number(horometro) <= 0) {
        throw new Error('La lectura del horómetro inicial debe ser válida.');
      }
      if (!fotoHorometro || !fotoSitio) {
        throw new Error('Las dos fotografías probatorias son obligatorias.');
      }

      // 1. Subir evidencias fotográficas
      const [urlFotoHoro, urlFotoSitio] = await Promise.all([
        subirEvidenciaTerreno(ordenId, fotoHorometro, 'horometro_inicial'),
        subirEvidenciaTerreno(ordenId, fotoSitio, 'maquina_sitio')
      ]);

      // 2. Ejecutar función PostgreSQL SECURITY DEFINER
      const { data, error: rpcError } = await supabase.rpc('fn_validar_pin_entrega', {
        p_orden_id: ordenId,
        p_pin_plano: pin,
        p_horometro_inicial: parseFloat(horometro),
        p_foto_horometro_url: urlFotoHoro,
        p_foto_sitio_url: urlFotoSitio
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      setError(err.message || 'Fallo en la verificación de entrega.');
      throw err;
    } finally {
      setSubiendo(false);
    }
  };

  return { confirmarLlegadaObra, subiendo, error };
}