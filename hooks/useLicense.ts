import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { licenseDb } from '../services/licenseService';

export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Leemos el ID específico de Lic. Varas desde las variables de entorno
  const LICENSE_ID = import.meta.env.VITE_LICENSE_CLIENT_ID;

  useEffect(() => {
    if (!LICENSE_ID) {
      console.error("⚠️ ERROR CRÍTICO: No se ha configurado VITE_LICENSE_CLIENT_ID en Vercel.");
      setLoading(false);
      return;
    }

    // Escuchamos en tiempo real el documento en Centrol-Soft
    const clientRef = doc(licenseDb, "clients", LICENSE_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Si isActive es false -> BLOQUEAR
        // Si isActive es true -> PERMITIR
        setIsLocked(data.isActive === false);
      } else {
        // Si borraste el cliente de tu panel -> BLOQUEAR POR SEGURIDAD
        console.warn('Licencia eliminada o no encontrada.');
        setIsLocked(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error verificando licencia:", error);
      // FAIL SAFE: Si falla internet, permitimos el paso para no afectar al médico.
      // Cambia a 'true' si prefieres bloquear ante fallos de red.
      setIsLocked(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
