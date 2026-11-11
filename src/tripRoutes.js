// Directed road distances (metres) and travel times (seconds), OSRM / OpenStreetMap.
// Point order matches both matrices. Each direction follows its own road route.
export const places = [
  ['Москва · Тверская', 55.75692, 37.61456], ['Сергиев Посад', 56.3121, 38.1301],
  ['Коломна', 55.1033, 38.7784], ['Тула', 54.1934, 37.6185],
  ['Владимир', 56.1291, 40.4069], ['Суздаль', 56.4196, 40.4490],
  ['Переславль-Залесский', 56.7364, 38.8523]
];
const distances = [
  [0,73694.6,115013.8,183963.8,197505.5,232211.2,141215.1],
  [74917,0,193149.4,266501.4,186131.1,185852,69137.3],
  [115450.3,188066.2,0,172736,234408.4,269114.1,255586.7],
  [182959,264911.8,174050.4,0,369864.4,404570.1,332432.3],
  [198453.8,184357.7,234884.8,370553.5,0,36322,137759.2],
  [233008.6,185982.3,269439.6,405108.3,35421.5,0,128103.6],
  [142327,67052.8,260559.4,333911.4,137733.8,128106.4,0]
];
const durations = [
  [0,4355.4,6776.2,9036.2,10684.5,12740.2,7769.8],
  [4507.3,0,9406.5,12744.3,10273.4,11109.3,4160.6],
  [6828,9135.5,0,10281.3,12091.6,14147.3,12549.9],
  [8898.2,12591.7,10270.1,0,17511.5,19567.2,16006.1],
  [10812.6,10244.3,12107.4,17539.5,0,2118.4,7947.5],
  [12859,11132.9,14153.8,19585.9,2099.4,0,7553.1],
  [7856.1,4256.1,12755.3,16093.1,7930.4,7549.1,0]
];

export function planTrip(from, via, to, returnTrip, consumption) {
  const stops = via === null ? [from, to] : [from, via, to];
  if (!Number.isFinite(consumption) || consumption < 0.1 || consumption > 60) throw new Error('Укажите расход от 0,1 до 60 л/100 км.');
  if (stops.some(point => !Number.isInteger(point) || !places[point]) || new Set(stops).size !== stops.length)
    throw new Error('Выберите разные пункты маршрута.');
  if (returnTrip) stops.push(from);
  const legs = stops.slice(1).map((end, i) => {
    const start = stops[i];
    return { start, end, km: distances[start][end] / 1000, seconds: durations[start][end] };
  });
  const km = legs.reduce((sum, leg) => sum + leg.km, 0);
  const minutes = Math.round(legs.reduce((sum, leg) => sum + leg.seconds, 0) / 60);
  const coords = stops.map(index => places[index].slice(1).join(',')).join('~');
  return { legs, km, minutes, litres: km * consumption / 100, map: 'https://yandex.ru/maps/?rtt=auto&rtext=' + encodeURIComponent(coords) };
}
