import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cars } from './data';
import { Photo } from './components';
import { dateNumber, formatDate, money, rentalDays, today, totalPrice } from './utils';
import { extensionQuote, periodError, rentalStatus, shiftDay } from './rentalRules';
import { extendRental, storageMessage, useRentals } from './rentalStore';

const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
function moveMonth(month, amount) {
  const date = new Date(dateNumber(month + '-01'));
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export function Availability({ initialCar }) {
  const day = today();
  const [carId, setCarId] = useState(initialCar.id);
  const [month, setMonth] = useState(day.slice(0, 7));
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const { records, loading, error } = useRentals();
  const car = cars.find(item => item.id === carId);
  const first = month + '-01';
  const days = rentalDays(first, moveMonth(month, 1) + '-01');
  const offset = (new Date(dateNumber(first)).getUTCDay() + 6) % 7;
  const bookings = records.filter(record => record.car === carId);
  const issue = start && end ? periodError(records, carId, start, end, day) : '';
  function selectStart(value) {
    setStart(value);
    setEnd(shiftDay(value, 1));
  }
  return <div className="service-split calendar-layout">
    <div className="service-panel">
      <label className="field">Автомобиль<select className="form-select" value={carId} onChange={e => { setCarId(e.target.value); setStart(''); setEnd(''); }}>{cars.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="calendar-head">
        <button type="button" className="month-button" aria-label="Предыдущий месяц" disabled={month <= day.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>‹</button>
        <h2 aria-live="polite">{monthLabel.format(dateNumber(first))}</h2>
        <button type="button" className="month-button" aria-label="Следующий месяц" onClick={() => setMonth(moveMonth(month, 1))}>›</button>
      </div>
      {error || loading ? <p role="status">{error || 'Загрузка календаря…'}</p> : <>
        <div className="calendar-grid">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(label => <b key={label}>{label}</b>)}
          {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={'pad' + index}/>)}
          {Array.from({ length: days }, (_, index) => {
            const value = shiftDay(first, index);
            const busy = bookings.some(record => record.start <= value && value < record.end);
            const past = value < day;
            const selected = value === start;
            const inRange = start && end && !issue && start < value && value < end;
            const style = past ? 'past' : busy ? 'busy' : inRange ? 'range' : 'free';
            return <button type="button" className={'cal-day ' + style} key={value} disabled={past || busy}
              aria-pressed={selected} aria-label={formatDate(value) + (past ? ', прошедшая дата' : busy ? ', занято' : ', свободно')}
              onClick={() => selectStart(value)}>{index + 1}</button>;
          })}
        </div>
        <div className="calendar-key"><span>🟢 Свободно</span><span>▧ Занято</span></div>
      </>}
    </div>
    <div className="service-result"><Photo name={car.image} alt={car.name} className="trip-photo"/>
      <div className="result-body"><h2>{car.name}</h2><p>{money(car.price)} / сутки</p>
        <p>Нажмите на свободный день начала и укажите дату возврата.</p>
        <div className="date-pair"><div><small>Начало аренды</small><strong>{start ? formatDate(start) : '—'}</strong></div>
          <label className="field">Возврат<input type="date" className="form-control" disabled={!start} value={end} min={start ? shiftDay(start, 1) : undefined} max={start ? shiftDay(start, 365) : undefined} onInput={e => setEnd(e.currentTarget.value)} onBlur={e => setEnd(e.currentTarget.value)}/></label>
        </div>
        {issue && <p className="service-error" role="alert">{issue}</p>}
        {start && end && !issue && !error && !loading && <div className="calendar-summary">
          <strong>{rentalDays(start, end)} сут. · {money(totalPrice(car, rentalDays(start, end)))}</strong>
          <Link className="btn" to={'/?' + new URLSearchParams({ car: carId, start, end }) + '#booking'}>Перейти к бронированию</Link>
        </div>}
      </div>
    </div>
  </div>;
}

const groups = [['active', 'Текущие аренды'], ['upcoming', 'Предстоящие бронирования'], ['past', 'История аренд']];
function RentalRow({ record, records, day, canExtend }) {
  const [editing, setEditing] = useState(false);
  const [end, setEnd] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const car = cars.find(item => item.id === record.car);
  const days = rentalDays(record.start, record.end);
  let quote, issue;
  if (editing) {
    try { quote = extensionQuote(records, record, end, day); }
    catch (problem) { issue = problem.message; }
  }
  async function submit(event) {
    event.preventDefault();
    if (!quote || pending) return;
    setPending(true);
    try {
      await extendRental(record.id, record.end, end);
      setEditing(false);
      setMessage('Дата возврата обновлена.');
    } catch (problem) { setMessage(storageMessage(problem)); }
    finally { setPending(false); }
  }
  return <article className="rental-row">
    <div className="rental-overview"><Photo name={car.image} alt="" loading="lazy"/>
      <div><h3>{car.name}</h3><p>{formatDate(record.start)} — {formatDate(record.end)} · {days} сут.</p><strong>{money(totalPrice({ price: record.price }, days))}</strong></div>
      {canExtend && !editing && days < 365 && <button type="button" className="btn btn--light" onClick={() => { setEditing(true); setMessage(''); setEnd(shiftDay(record.end, 1)); }}>Продлить</button>}
    </div>
    {editing && <form className="extension-form" onSubmit={submit}>
      <label className="field">Новая дата возврата<input type="date" className="form-control" value={end} min={shiftDay(record.end, 1)} max={shiftDay(record.start, 365)} onInput={e => { setEnd(e.currentTarget.value); setMessage(''); }} onBlur={e => setEnd(e.currentTarget.value)}/></label>
      {issue ? <p className="service-error" role="status">{issue}</p> : <p>Новая стоимость за {quote.days} сут. <strong>{money(quote.total)}</strong></p>}
      <div className="tool-actions"><button className="btn" disabled={!quote || pending}>Сохранить продление</button><button type="button" className="btn btn--light" disabled={pending} onClick={() => setEditing(false)}>Отмена</button></div>
    </form>}
    {message && <p role="status" className="service-note">{message}</p>}
  </article>;
}

export function RenterAccount() {
  const { records, loading, error } = useRentals();
  const day = today();
  if (error || loading) return <p role="status">{error || 'Загрузка бронирований…'}</p>;
  if (!records.length) return <div className="service-panel account-empty">
    <h2>У вас пока нет бронирований</h2><p>После заполнения формы поездка появится в кабинете на этом устройстве.</p>
    <Link className="btn" to="/catalog">Выбрать автомобиль</Link>
  </div>;
  return <><p className="service-note">Бронирования на этом устройстве. Стоимость указана за весь период аренды.</p>
    {groups.map(([key, title]) => {
      const items = records.filter(record => rentalStatus(record, day) === key).sort((a, b) =>
        key === 'past' ? b.end.localeCompare(a.end) : a.start.localeCompare(b.start));
      return <section className="account-group" key={key}><h2>{title} <small>{items.length}</small></h2>
        {items.length ? items.map(record => <RentalRow key={record.id} record={record} records={records} day={day} canExtend={key !== 'past'}/>) : <p>Пока нет записей.</p>}
      </section>;
    })}
  </>;
}
