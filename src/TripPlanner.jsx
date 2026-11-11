import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cars } from './data';
import { places, planTrip } from './tripRoutes';
import { Photo } from './components';

const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

function PlaceSelect({ title, value, onChange, optional }) {
  return <label className="field">{title}<select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
    {optional && <option value="">Без остановки</option>}
    {places.map(([name], index) => <option value={index} key={name}>{name}</option>)}
  </select></label>;
}

export function TripPlanner({ initialCar }) {
  const [from, setFrom] = useState('0');
  const [to, setTo] = useState('1');
  const [via, setVia] = useState('');
  const [round, setRound] = useState(false);
  const [car, setCar] = useState(initialCar);
  const [consumption, setConsumption] = useState(String(car.consumption));
  let plan, error;
  try {
    plan = planTrip(Number(from), via === '' ? null : Number(via), Number(to), round, Number(consumption));
  } catch (problem) { error = problem.message; }
  function chooseModel(id) {
    const model = cars.find(item => item.id === id);
    setCar(model);
    setConsumption(String(model.consumption));
  }
  return <>
    <div className="service-split">
      <div className="service-panel tool-form"><h2>Маршрут</h2>
        <PlaceSelect title="Откуда" value={from} onChange={setFrom}/>
        <PlaceSelect title="Через" value={via} onChange={setVia} optional/>
        <PlaceSelect title="Куда" value={to} onChange={setTo}/>
        <label className="check-line"><input type="checkbox" checked={round} onChange={e => setRound(e.target.checked)}/>Вернуться в точку отправления</label>
        <label className="field">Автомобиль<select className="form-select" value={car.id} onChange={e => chooseModel(e.target.value)}>{cars.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Плановый расход, л/100 км<input type="number" className="form-control" step="0.1" min="0.1" max="60" value={consumption} onChange={e => setConsumption(e.target.value)}/></label>
      </div>
      <div className="service-result"><Photo name={car.image} alt={car.name} className="trip-photo"/>
        <div className="result-body" aria-live="polite">{error ? <p role="alert">{error}</p> : <>
          <h2>{places[Number(from)][0]} → {places[Number(to)][0]}</h2>
          <dl className="trip-metrics"><div><dt>Расстояние</dt><dd>{decimal.format(plan.km)} км</dd></div><div><dt>За рулём</dt><dd>{Math.floor(plan.minutes / 60)} ч {plan.minutes % 60} мин</dd></div><div><dt>Топливо</dt><dd>{decimal.format(plan.litres)} л</dd></div></dl>
          <ol className="trip-legs">{plan.legs.map(leg => <li key={leg.start + '-' + leg.end}>{places[leg.start][0]} → {places[leg.end][0]} <strong>{decimal.format(leg.km)} км</strong></li>)}</ol>
          <a className="btn" href={plan.map} target="_blank" rel="noopener noreferrer">Открыть маршрут на карте ↗</a>
        </>}</div>
      </div>
    </div>
    <p className="fine">Время в пути рассчитано без пробок и остановок. Расход можно уточнить для своего автомобиля. Дорожные данные — <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, расчёт маршрутов — <a href="https://project-osrm.org/">OSRM</a>.</p>
    <Link className="text-link" to={'/services/calendar?car=' + car.id}>Выбрать даты аренды ↗</Link>
  </>;
}
