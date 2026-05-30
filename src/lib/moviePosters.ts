/**
 * Mapa de películas Disney/Pixar a sus URLs de portadas.
 * Todos los paths fueron verificados directamente contra la API de TMDB.
 * Las claves coinciden exactamente con los nombres en los `options` de las preguntas.
 *
 * Fuente: https://api.themoviedb.org/3/search/movie
 * CDN: https://image.tmdb.org/t/p/w342/{poster_path}
 */
export const MOVIE_POSTERS: Record<string, string> = {
  // ─── Pixar modernas ───────────────────────────────────────────────────────────
  'Turning Red':              'https://image.tmdb.org/t/p/w342/djM4COTksd5YRIdd9uEl8eA3iaa.jpg',  // id: 508947
  'Luca':                     'https://image.tmdb.org/t/p/w342/jTswp6KyDYKtvC52GbHagrZbGvD.jpg',  // id: 508943
  'Soul':                     'https://image.tmdb.org/t/p/w342/xJ7MCAy4oCLerPo3JjnB8lKOhl4.jpg',  // id: 508442
  'Intensamente':             'https://image.tmdb.org/t/p/w342/sG3bHZWCMOZwhUq71WbPG9Vrrwc.jpg',  // id: 150540 (Inside Out)
  'Coco':                     'https://image.tmdb.org/t/p/w342/vwsFGblLYxWBNjg9pdWN1Mm5YfW.jpg',  // id: 354912
  'Encanto':                  'https://image.tmdb.org/t/p/w342/d0ezQ1Jz0lpNsX1skEmIvqRL7mN.jpg',  // id: 568124
  'Moana':                    'https://image.tmdb.org/t/p/w342/y6wkgEH1gTWAafH9Bc7cNNut0Kf.jpg',  // id: 277834 (Vaiana 2016)
  'Raya y el último dragón':  'https://image.tmdb.org/t/p/w342/hbjOtofNpvFvhzBUUoZGAjkjjsl.jpg',  // id: 527774

  // ─── Disney modernas ──────────────────────────────────────────────────────────
  'Frozen':                   'https://image.tmdb.org/t/p/w342/sGNuWC4BwqOB4l0tkbKwLy70tXC.jpg',  // id: 109445
  'Enredados':                'https://image.tmdb.org/t/p/w342/z5kvXWek4smCyeWBDJQkT5sLc9T.jpg',  // id: 38757
  'Valiente':                 'https://image.tmdb.org/t/p/w342/cTouCa0ObuGD1P2nKOQ7A21wm9p.jpg',  // id: 62177 (Brave)
  'La Princesa y el Sapo':    'https://image.tmdb.org/t/p/w342/lSNqVycC40mujo0tiRZvp6Ef5qQ.jpg',  // id: 10198

  // ─── Clásicas Disney ─────────────────────────────────────────────────────────
  'La Bella y la Bestia':     'https://image.tmdb.org/t/p/w342/1FxMtEUc6DP1MXsTBftOFaoCVVO.jpg',  // id: 10020
  'Cenicienta':               'https://image.tmdb.org/t/p/w342/vqzeSm5Agvio7DahhKXaySUbUUW.jpg',  // id: 11224
  'La Sirenita':              'https://image.tmdb.org/t/p/w342/Vc0KvO7z2OzEbRs6nyZs9xD81s.jpg',   // id: 10144
  'Aladdin':                  'https://image.tmdb.org/t/p/w342/5ALwczKzFxbsiMDlHuy7aREDCzr.jpg',  // id: 812
  'Pocahontas':               'https://image.tmdb.org/t/p/w342/o8QGvm0zDrJ8aONM8G5dW4BNawG.jpg',  // id: 10530
  'Mulan':                    'https://image.tmdb.org/t/p/w342/towmTJ0k29quKI9IDnOZKAAtQx.jpg',   // id: 10674
  'Hércules':                 'https://image.tmdb.org/t/p/w342/iwjP7ImLzXZjKHnCUChJThEtNJG.jpg',  // id: 11970
  'Tarzán':                   'https://image.tmdb.org/t/p/w342/1Gk8iihu4Q4BGh2n1IwNLB3zM8E.jpg',  // id: 37135
  'La Bella Durmiente':       'https://image.tmdb.org/t/p/w342/ofoVXR8gBYhV4e0MpRQtSpeXLiK.jpg',  // id: 10882
  'Blancanieves y los siete enanos': 'https://image.tmdb.org/t/p/w342/b2ZPP3bZqDOzqTHr1TlFIFPWP48.jpg', // id: 408
  'Pinocho':                  'https://image.tmdb.org/t/p/w342/sAluF7lNc4Mv3qxx1mmOgsfbr0C.jpg',  // id: 10895
  'Alicia en el país de las maravillas': 'https://image.tmdb.org/t/p/w342/zOJKtTdToc8FcjmmbavkjUxv2Ue.jpg', // id: 12092
  'Peter Pan':                'https://image.tmdb.org/t/p/w342/tDvGRWSdqT31ADijJf9OhbTbQ77.jpg',  // id: 10693

  // ─── Pixar clásicas ──────────────────────────────────────────────────────────
  'Toy Story':                'https://image.tmdb.org/t/p/w342/jvn7wy3RSNEXnFSXLpH2of2LcV6.jpg',  // id: 862
  'Monsters, Inc.':           'https://image.tmdb.org/t/p/w342/g3SgHEb5ej2MioGfYLrZVshF909.jpg',  // id: 585
  'Buscando a Nemo':          'https://image.tmdb.org/t/p/w342/jPhak722pNGxQIXSEfeWIUqBrO5.jpg',  // id: 12
  'Cars':                     'https://image.tmdb.org/t/p/w342/lgBe9KD6DoLyQP28JZ6fSUGK8j0.jpg',  // id: 920 ✅
  'Ratatouille':              'https://image.tmdb.org/t/p/w342/nGUelOVetiRpY2wTBMHTbrTIGYC.jpg',  // id: 2062
  'Wall-E':                   'https://image.tmdb.org/t/p/w342/5CXpoYB2YAZRPBcv9pjkgR6tZ0X.jpg',  // id: 10681
  'Up: Una aventura de altura': 'https://image.tmdb.org/t/p/w342/1N0LtzUueXrlnpL466jQBJ6iAuj.jpg', // id: 14160

  // ─── Clásicas ─────────────────────────────────────────────────────────────────
  'El Rey León':              'https://image.tmdb.org/t/p/w342/b0MxU37dNmMwKtoPVYPKOZSIrIn.jpg',  // id: 8587
  'El Libro de la Selva':     'https://image.tmdb.org/t/p/w342/1w8wk8htVPW5cdCYnRU4bt5y5Fw.jpg',  // id: 9325
  'El Libro de la Vida':      'https://image.tmdb.org/t/p/w342/k669nOalwu7NKhW7aWNJKN7Nxvi.jpg',  // id: 228326
  'Tierra de Osos':           'https://image.tmdb.org/t/p/w342/1XwOQNSby3HZfKMZcY7rtZw4KR.jpg',  // id: 10009 (Brother Bear)
  'Lilo y Stitch':            'https://image.tmdb.org/t/p/w342/dTYyAszU6NWbmWGvhqLZpZTdS5T.jpg',  // id: 11544
  'Aviones':                  'https://image.tmdb.org/t/p/w342/6S5JjRheyl3oyLmJVcxcQ8yqDU3.jpg',  // id: 151960
};

/**
 * Obtiene la URL del poster de una película dado su nombre.
 * Si no se encuentra, retorna null (mostrará un fallback con ícono de música).
 */
export function getMoviePoster(movieName: string): string | null {
  return MOVIE_POSTERS[movieName] ?? null;
}
