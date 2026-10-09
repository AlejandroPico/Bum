# Identificadores de artículos de la enciclopedia (usar SOLO estos en enlaces [[id|texto]] y en `related`)

## Fundamentos (fund) — archivo fundamentos.ts
atomo, isotopos, radiactividad, fision, reaccion-en-cadena, masa-critica, fusion, energia-y-tnt, uranio, plutonio, combustibles-de-fusion, unidades-de-radiacion

## Tipos de armas (tipos) — archivo tipos.ts
arma-de-fision, tipo-canon, implosion, fision-potenciada, bomba-de-hidrogeno, armas-de-tres-etapas, bomba-de-neutrones, bomba-sucia, explosivos-convencionales, vectores, bomba-de-caida-libre, misil-balistico, mirv, misil-de-crucero, planeador-hipersonico, torpedo-nuclear, artilleria-nuclear, triada-nuclear

## Historia (hist) — archivo historia.ts
descubrimiento-de-la-fision, carta-de-einstein, proyecto-manhattan, los-alamos, oak-ridge-y-hanford, oppenheimer, prueba-trinity, hiroshima, nagasaki, fin-de-la-guerra, hibakusha, operacion-crossroads, programa-sovietico, la-super, ivy-mike, castle-bravo, tsar-bomba, carrera-armamentistica, destruccion-mutua-asegurada, crisis-de-los-misiles, tratados, pruebas-nucleares, potencias-nucleares, arsenales-actuales

## Efectos (efec) — archivo efectos.ts
bola-de-fuego, nube-de-hongo, onda-expansiva, radiacion-termica, radiacion-inicial, lluvia-radiactiva, pulso-electromagnetico, explosiones-aereas-y-de-superficie, efectos-en-la-salud, invierno-nuclear, proteccion-civil

## Accidentes y desastres (acc) — archivo accidentes.ts
palomares, thule, goldsboro, damascus-titan, kyshtym, windscale, chernobil, fukushima, accidentes-de-criticidad, falsas-alarmas

## Impactos cósmicos (cosmos) — archivo cosmos.ts
asteroides-y-cometas, tunguska, cheliabinsk, chicxulub, meteor-crater, shoemaker-levy-9, defensa-planetaria, escalas-de-riesgo

## Catálogo (cat) — archivo catalogo.ts
Un artículo por cada preset de src/data/presets.ts con id "cat-" + slug del nombre
(minúsculas, sin acentos, espacios y símbolos → guiones, sin guiones repetidos ni al final).
Ejemplos: "Tsar Bomba (URSS, 1961)" → cat-tsar-bomba-urss-1961 ; "Little Boy — Hiroshima (1945)" → cat-little-boy-hiroshima-1945
Usa la función slug() exportada por src/encyclopedia/slug.ts para comprobarlo.
