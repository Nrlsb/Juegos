/**
 * Mapa de películas Disney/Pixar a sus URLs de portadas.
 * Usa el CDN de imágenes de TMDB (The Movie Database).
 * Las claves coinciden exactamente con los nombres en los `options` de las preguntas.
 *
 * Para actualizar/agregar posters:
 * 1. Busca la película en https://www.themoviedb.org
 * 2. Copia el path del poster de la URL de la imagen
 * 3. Usa el formato: https://image.tmdb.org/t/p/w342/{poster_path}
 */
export const MOVIE_POSTERS: Record<string, string> = {
  // ─── Pixar modernas ───────────────────────────────────────────────────────────
  'Turning Red':              'https://image.tmdb.org/t/p/w342/qSdjk9oAKSzmUfu86I07KAScKIQ.jpg',
  'Luca':                     'https://image.tmdb.org/t/p/w342/jTswp6KyDYKtvC52GbHagrZbGvD.jpg',
  'Soul':                     'https://image.tmdb.org/t/p/w342/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg',
  'Intensamente':             'https://image.tmdb.org/t/p/w342/ltarPqc84ePye9eFMt0FGMhxFak.jpg',
  'Coco':                     'https://image.tmdb.org/t/p/w342/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg',
  'Encanto':                  'https://image.tmdb.org/t/p/w342/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg',
  'Moana':                    'https://image.tmdb.org/t/p/w342/inVq3FRqcYIRl2la8iZikYYxFNR.jpg',
  'Raya y el último dragón':  'https://image.tmdb.org/t/p/w342/lPsD10PP4rgUGiGR4CCXA6iY0QQ.jpg',

  // ─── Disney modernas ──────────────────────────────────────────────────────────
  'Frozen':                   'https://image.tmdb.org/t/p/w342/kgwjIb2JDHRhNk13lmSxiClFjVk.jpg',
  'Enredados':                'https://image.tmdb.org/t/p/w342/pCJFMLMCH5zLecDFfaKCFsGC5sm.jpg',
  'Valiente':                 'https://image.tmdb.org/t/p/w342/aMEsvTUklw0uZ3gk7oPlrRly9JH.jpg',
  'La Princesa y el Sapo':    'https://image.tmdb.org/t/p/w342/mAkVFnFB1VEeKfOmxCSp2QCGFKo.jpg',

  // ─── Clásicas Disney ─────────────────────────────────────────────────────────
  'La Bella y la Bestia':     'https://image.tmdb.org/t/p/w342/9GYBaFmFYQe2RRJEk4Hb7GGPBR1.jpg',
  'Cenicienta':               'https://image.tmdb.org/t/p/w342/7fHYiMRNLBjzJRBpFR8ovgmBz9R.jpg',
  'La Sirenita':              'https://image.tmdb.org/t/p/w342/v0yCCyXJoMoRmFhUXHAUSmfuhWE.jpg',
  'Aladdin':                  'https://image.tmdb.org/t/p/w342/oa3mulLVJfNGGMhXjPOBOEfzNDT.jpg',
  'Pocahontas':               'https://image.tmdb.org/t/p/w342/r2WFbQtH7V7kijJZtRlNI4mVEUJ.jpg',
  'Mulan':                    'https://image.tmdb.org/t/p/w342/oEeXDH4lsQiRjATVaI7g0FQyZNa.jpg',
  'Hércules':                 'https://image.tmdb.org/t/p/w342/q72sXvAo3bG5kLMFJG9GJpvFfCJ.jpg',
  'Tarzán':                   'https://image.tmdb.org/t/p/w342/ekiKMQp7xTfkE80UNjU8JakH9GR.jpg',
  'La Bella Durmiente':       'https://image.tmdb.org/t/p/w342/mEFfRnhPBLxJiVSj5l8pCWFQqBo.jpg',
  'Blancanieves y los siete enanos': 'https://image.tmdb.org/t/p/w342/hRNmCWoKMVHAIJpPBJBMhzPdlFr.jpg',
  'Pinocho':                  'https://image.tmdb.org/t/p/w342/jEpuorBjPhQ3PNVPp6ky1UBxEfA.jpg',
  'Alicia en el país de las maravillas': 'https://image.tmdb.org/t/p/w342/m7BaTyNwHCEYC3TKCApV3hjNJOo.jpg',

  // ─── Pixar clásicas ──────────────────────────────────────────────────────────
  'Toy Story':                'https://image.tmdb.org/t/p/w342/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
  'Monsters, Inc.':           'https://image.tmdb.org/t/p/w342/sgheSKxZkttIe8ONsf2sWXPgip3.jpg',
  'Buscando a Nemo':          'https://image.tmdb.org/t/p/w342/zj6DP2SgVFvBsRm0lA9XVHsaQAL.jpg',
  'Cars':                     'https://image.tmdb.org/t/p/w342/5yXDzI6u0qBMcfJAy0JGBHKdEGF.jpg',
  'Ratatouille':              'https://image.tmdb.org/t/p/w342/npHNjldbeTHdKKw28bJKs7lzqzj.jpg',
  'Wall-E':                   'https://image.tmdb.org/t/p/w342/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
  'Up: Una aventura de altura': 'https://image.tmdb.org/t/p/w342/a104yvFEqEiCEtVEIkT1yv6OHfP.jpg',

  // ─── Clásicas ─────────────────────────────────────────────────────────────────
  'El Rey León':              'https://image.tmdb.org/t/p/w342/sCanDWNcC6g6qFxMfSXjRzAlreF.jpg',
  'El Libro de la Selva':     'https://image.tmdb.org/t/p/w342/eDaebg0bG4bJ5NrNi3FbLHAHoMi.jpg',
  'El Libro de la Vida':      'https://image.tmdb.org/t/p/w342/qvf4mKCjq3Coj07e1e5x4lxTr0T.jpg',
  'Tierra de Osos':           'https://image.tmdb.org/t/p/w342/5GBMbJsJBHn2a7hJJZstDJ3CRBQ.jpg',
  'Lilo y Stitch':            'https://image.tmdb.org/t/p/w342/jlBPNaTiQzN9eGfbBPzIqq4xFlJ.jpg',
  'Peter Pan':                'https://image.tmdb.org/t/p/w342/ufNlMMKwh7Jbqv5Sa8gWEhaCmE2.jpg',
  'Aviones':                  'https://image.tmdb.org/t/p/w342/jTBd29fFVLRt9Ww8ryxcR1BRnY5.jpg',
};

/**
 * Obtiene la URL del poster de una película dado su nombre.
 * Si no se encuentra, retorna null (mostrará un fallback).
 */
export function getMoviePoster(movieName: string): string | null {
  return MOVIE_POSTERS[movieName] ?? null;
}
