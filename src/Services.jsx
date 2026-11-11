import { useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router-dom';
import { Icon, Photo } from './components';
import { cars, classes, gears } from './data';
import { money, totalPrice } from './utils';
import { matchCars, purposes } from './rentalRules';
import { Availability, RenterAccount } from './RentalPages';
import { TripPlanner } from './TripPlanner';
import './services.css';

const tools = [
  ['compare', 'Сравнение', 'Сравнение автомобилей', 'car'],
  ['calendar', 'Свободные даты', 'Календарь доступности', 'clock'],
  ['finder', 'Подбор', 'Подбор автомобиля', 'gear'],
  ['trip', 'Маршрут', 'Планировщик поездки', 'pin'],
  ['account', 'Мой кабинет', 'Личный кабинет арендатора', 'users']
];

export function Services() {
  const { tool = 'compare' } = useParams();
  const { search } = useLocation();
  const section = tools.find(([id]) => id === tool);
  if (!section) return <div className="container service-page"><h1>Раздел не найден</h1><Link to="/services/compare">К сравнению автомобилей</Link></div>;
  const selected = new URLSearchParams(search).get('car');
  const initialCar = cars.find(car => car.id === selected) || cars[0];
  return <div className="container service-page">
    <div className="breadcrumb"><Link to="/">Главная</Link><span>/</span>Сервисы аренды</div>
    <div className="service-nav" role="navigation" aria-label="Сервисы аренды">{tools.map(([id, label,, icon]) =>
      <NavLink key={id} to={'/services/' + id}><Icon name={icon} size={17}/>{label}</NavLink>
    )}</div>
    <h1>{section[2]}</h1>
    {tool === 'compare' && <Comparison key={search} initialCar={initialCar} fromCard={Boolean(selected)}/>}
    {tool === 'finder' && <Finder/>}
    {tool === 'calendar' && <Availability key={search} initialCar={initialCar}/>}
    {tool === 'trip' && <TripPlanner key={search} initialCar={initialCar}/>}
    {tool === 'account' && <RenterAccount/>}
  </div>;
}

function Comparison({ initialCar, fromCard }) {
  const [ids, setIds] = useState(fromCard ? [initialCar.id] : cars.slice(0, 2).map(car => car.id));
  const [days, setDays] = useState('7');
  const validDays = Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 365;
  const selected = cars.filter(car => ids.includes(car.id));
  const rows = [
    ['Класс', car => classes[car.class]], ['Коробка передач', car => gears[car.gear]],
    ['Места, включая водителя', car => car.seats], ['Двигатель', car => car.engine],
    ['Мощность', car => car.power], ['Расход, л/100 км', car => car.consumption.toLocaleString('ru-RU')],
    ['Цена за сутки', car => money(car.price)], ['Залог', car => money(car.deposit)],
    ['Аренда за период', car => validDays ? money(totalPrice(car, Number(days))) : '—']
  ];
  function toggle(id) {
    setIds(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  }
  return <>
    <div className="service-panel compare-controls">
      <fieldset><legend>Автомобили для сравнения</legend>
        <div className="chip-list">{cars.map(car => <label className="choice-chip" key={car.id}>
          <input type="checkbox" checked={ids.includes(car.id)} onChange={() => toggle(car.id)}/>{car.name}
        </label>)}</div>
      </fieldset>
      <label className="field">Срок, суток<input className="form-control" type="number" min="1" max="365" value={days} onChange={e => setDays(e.target.value)} aria-invalid={!validDays}/></label>
    </div>
    {!validDays && <p className="service-error" role="alert">Введите целое число суток от 1 до 365.</p>}
    {selected.length < 2 && <p role="status" className="service-note">Выберите хотя бы два автомобиля для сравнения.</p>}
    {selected.length > 0 && <div className="service-table-wrap" role="region" tabIndex="0" aria-label="Характеристики и стоимость">
      <table className="compare-table"><thead><tr><th scope="col">Автомобиль</th>{selected.map(car =>
        <th scope="col" key={car.id}><Photo name={car.image} alt="" width="200" height="105"/>{car.name}</th>)}</tr></thead>
        <tbody>{rows.map(([title, value]) => <tr key={title}><th scope="row">{title}</th>{selected.map(car => <td key={car.id}>{value(car)}</td>)}</tr>)}
          <tr><th scope="row">Доступность</th>{selected.map(car => <td key={car.id}><Link to={'/services/calendar?car=' + car.id}>Выбрать даты ↗</Link></td>)}</tr>
        </tbody>
      </table>
    </div>}
    <p className="fine">Скидки за срок включены в стоимость аренды. Возвратный залог указан отдельно.</p>
  </>;
}

function Finder() {
  const [budget, setBudget] = useState('6000');
  const [seats, setSeats] = useState('2');
  const [purpose, setPurpose] = useState('');
  const valid = Number.isFinite(Number(budget)) && Number(budget) > 0;
  const matched = valid ? matchCars(cars, Number(budget), Number(seats), purpose) : [];
  return <>
    <div className="service-panel service-fields">
      <label className="field">Бюджет за сутки, ₽<input type="number" className="form-control" min="1" value={budget} onChange={e => setBudget(e.target.value)} aria-invalid={!valid}/></label>
      <label className="field">Сколько человек с водителем<select className="form-select" value={seats} onChange={e => setSeats(e.target.value)}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>
      <label className="field">Цель поездки<select className="form-select" value={purpose} onChange={e => setPurpose(e.target.value)}><option value="">Любая</option>{Object.entries(purposes).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
    </div>
    <p className="service-note" role="status">{!valid ? 'Укажите положительный бюджет.' : matched.length ? 'Подходящие автомобили: ' + matched.length : 'Совпадений нет. Измените бюджет, число мест или цель поездки.'}</p>
    <div className="service-cards">{matched.map(car => <article className="service-car" key={car.id}>
      <Photo name={car.image} alt={car.name} loading="lazy"/>
      <div><h2>{car.name}</h2><p>Мест с водителем: {car.seats} · {gears[car.gear]}</p>
        <p>{car.purposes.map(id => purposes[id]).join(' · ')}</p>
        <strong>{money(car.price)} / сутки</strong>
        <Link className="btn btn--light" to={'/services/calendar?car=' + car.id}>Выбрать даты <Icon size={15}/></Link>
      </div></article>)}</div>
  </>;
}
