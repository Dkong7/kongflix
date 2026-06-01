import { useState, useCallback } from 'react';
import { pb } from '../services/pb';

/**
 * Hook para guardar/cargar progreso de cualquier contenido en watch_history (PocketBase).
 * Compatible con: movies, series, courses, documentaries, concerts, music, comics, games.
 * * @param {string} mediaType  'movie'|'series'|'course'|'documentary'|'concert'|'music'|'comic'
 * @param {string} mediaId    ID del registro original en su respectiva colección
 */
export function useWatchProgress(mediaType, mediaId) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const userId = pb.authStore.model?.id;

  /** Cargar progreso existente desde la DB */
  const loadProgress = useCallback(async () => {
    if (!userId || !mediaId) return null;
    setLoading(true);
    try {
      const res = await pb.collection('watch_history').getFirstListItem(
        `user="${userId}" && media_id="${mediaId}" && media_type="${mediaType}"`,
        { requestKey: null }
      );
      setRecord(res);
      return res;
    } catch {
      // Si entra al catch, significa que es la primera vez que ve este contenido (404)
      setRecord(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, mediaId, mediaType]);

  /**
   * Guardar o actualizar progreso
   * @param {object} data
   * progress   {number}  segundos reproducidos (o lección actual)
   * total      {number}  duración total en segundos (o total lecciones)
   * status     {string}  'watching' | 'finished'
   * season     {number}  temporada (opcional)
   * episode    {number}  episodio/track (opcional)
   * title      {string}  título para mostrar en historial
   * cover_id   {string}  ID o URL de la portada
   */
  const saveProgress = useCallback(async (data) => {
    if (!userId || !mediaId) return;

    const payload = {
      user:       userId,
      media_id:   mediaId,
      media_type: mediaType,
      progress:   data.progress  ?? 0,
      total:      data.total     ?? 0,
      status:     data.status    ?? 'watching',
      season:     data.season    ?? 0,
      episode:    data.episode   ?? 0,
      title:      data.title     ?? '',
      cover_id:   data.cover_id  ?? '',
      last_watch: new Date().toISOString(),
    };

    try {
      if (record?.id) {
        // Actualizar registro existente
        const updated = await pb.collection('watch_history').update(record.id, payload, { requestKey: null });
        setRecord(updated);
        return updated;
      } else {
        // Crear nuevo registro
        const created = await pb.collection('watch_history').create(payload, { requestKey: null });
        setRecord(created);
        return created;
      }
    } catch (err) {
      console.error('[useWatchProgress] Error guardando progreso:', err);
    }
  }, [userId, mediaId, mediaType, record]);

  /** Atajo para marcar como finalizado */
  const markFinished = useCallback((extraData = {}) => {
    return saveProgress({ ...extraData, status: 'finished' });
  }, [saveProgress]);

  /** Calcula el porcentaje completado (0-100) */
  const percent = record && record.total > 0
    ? Math.min(100, Math.max(0, Math.round((record.progress / record.total) * 100)))
    : 0;

  return { record, loading, percent, loadProgress, saveProgress, markFinished };
}

/**
 * Cargar historial completo del usuario actual
 * Útil para la página de "Mi Perfil" o "Historial"
 */
export async function fetchUserHistory(limit = 20) {
  const userId = pb.authStore.model?.id;
  if (!userId) return [];
  try {
    return await pb.collection('watch_history').getFullList({
      filter: `user="${userId}"`,
      sort:   '-last_watch',
      perPage: limit,
      requestKey: null,
    });
  } catch {
    return [];
  }
}

/**
 * Cargar "Continuar viendo" 
 * Útil para un carrusel en el Home o Navbar
 */
export async function fetchContinueWatching() {
  const userId = pb.authStore.model?.id;
  if (!userId) return [];
  try {
    return await pb.collection('watch_history').getFullList({
      filter: `user="${userId}" && status="watching"`,
      sort:   '-last_watch',
      requestKey: null,
    });
  } catch {
    return [];
  }
}