import { dateNumber, rentalDays, totalPrice } from './utils.js';

export function shiftDay(day, offset) {
  return new Date(dateNumber(day) + offset * 86400000).toISOString().slice(0, 10);
}

export function periodError(records, car, start, end, earliest, exceptId) {
  const days = rentalDays(start, end);
  if (!Number.isInteger(days) || days < 1 || days > 365) return 'Укажите период от 1 до 365 суток.';
  if (start < earliest) return 'Дата начала уже прошла.';
  const overlaps = records.some(record =>
    record.id !== exceptId && record.car === car && start < record.end && record.start < end
  );
  return overlaps ? 'Автомобиль занят в этот период. Выберите другие даты.' : '';
}

export function rentalStatus(record, day) {
  if (day < record.start) return 'upcoming';
  return day < record.end ? 'active' : 'past';
}

export function extensionQuote(records, record, end, day) {
  if (record.end <= day) throw new Error('Завершённую аренду нельзя продлить.');
  if (end <= record.end) throw new Error('Новая дата должна быть позже текущей даты возврата.');
  const error = periodError(records, record.car, record.start, end, record.start, record.id);
  if (error) throw new Error(error);
  const days = rentalDays(record.start, end);
  return { days, total: totalPrice({ price: record.price }, days) };
}

export const purposes = { city: 'По городу', family: 'Семейная поездка', business: 'Деловая встреча', weekend: 'На выходные' };

export function matchCars(fleet, budget, seats, purpose) {
  return fleet.filter(car => car.price <= budget && car.seats >= seats &&
    (!purpose || car.purposes.includes(purpose))).sort((a, b) => a.price - b.price);
}
