import test from 'node:test';
import assert from 'node:assert/strict';
import { cars } from '../src/data.js';
import { shiftDay, periodError, rentalStatus, extensionQuote, matchCars } from '../src/rentalRules.js';
import { planTrip } from '../src/tripRoutes.js';

const may = '2028-05-01';
const lease = { id: 'first', car: 'toyota', start: may, end: '2028-05-05', price: 4500 };
const next = { ...lease, id: 'second', start: '2028-05-08', end: '2028-05-10' };

test('a booking blocks the entire interval, permits return-day handover and leaves other cars free', () => {
  assert.ok(periodError([lease], 'toyota', '2028-04-30', '2028-05-06', '2028-04-01'));
  assert.equal(periodError([lease], 'toyota', lease.end, next.start, may), '');
  assert.equal(periodError([lease], 'fiat', may, lease.end, may), '');
  assert.ok(periodError([], 'fiat', '2028-02-30', '2028-03-01', may));
  assert.equal(shiftDay('2028-02-28', 1), '2028-02-29');
});
test('extension uses the original daily price and discounts the full term; rejects overlap and expired rentals', () => {
  assert.deepEqual(extensionQuote([lease,next], lease, next.start, may), { days: 7, total: 28350 });
  assert.throws(() => extensionQuote([lease,next], lease, next.end, may), /занят/);
  assert.throws(() => extensionQuote([lease], lease, next.start, lease.end), /Завершённую/);
  assert.throws(() => extensionQuote([lease], lease, lease.end, may), /позже/);
  assert.throws(() => extensionQuote([lease], lease, '2030-01-01', may), /365/);
});
test('renter history changes status exactly on pickup and return dates', () => {
  assert.equal(rentalStatus(lease, '2028-04-30'), 'upcoming');
  assert.equal(rentalStatus(lease, lease.start), 'active');
  assert.equal(rentalStatus(lease, lease.end), 'past');
});
test('selection applies seats, budget and travel purpose together', () => {
  assert.deepEqual(matchCars(cars, 4500, 5, 'family').map(car => car.id), ['toyota']);
  assert.deepEqual(matchCars(cars, 4499, 5, 'family'), []);
  assert.deepEqual(matchCars(cars, 2500, 4, 'city').map(car => car.id), ['fiat']);
});
test('route with a stop and direct return uses directional distances and fuel in litres', () => {
  const plan = planTrip(0, 1, 6, true, 7.5);
  assert.deepEqual(plan.legs.map(({ start,end }) => [start,end]), [[0,1],[1,6],[6,0]]);
  assert.ok(Math.abs(plan.km - (73694.6 + 69137.3 + 142327) / 1000) < 0.0001);
  assert.equal(plan.minutes, Math.round((4355.4 + 4160.6 + 7856.1) / 60));
  assert.equal(plan.litres, plan.km * 7.5 / 100);
  assert.throws(() => planTrip(0, null, 0, false, 8));
  assert.throws(() => planTrip(0, null, 2, false, 0));
});
