import { useEffect, useState } from 'react';
import { cars } from './data.js';
import { today } from './utils.js';
import { extensionQuote, periodError } from './rentalRules.js';

const storeName = 'rentals';
const changes = new EventTarget();
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('avtoprokat-rentals') : null;
channel?.addEventListener('message', () => changes.dispatchEvent(new Event('change')));
let opening;

function openDatabase() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('avtoprokat-renter', 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => { database.close(); opening = undefined; };
        resolve(database);
      };
      request.onerror = () => reject(request.error);
    }).catch(error => { opening = undefined; throw error; });
  }
  return opening;
}

// Reading availability and writing the booking in one transaction also protects concurrent tabs.
async function withRecords(change) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, change ? 'readwrite' : 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    let result, validationError;
    request.onsuccess = () => {
      try {
        result = change ? change(request.result) : request.result;
        if (change) store.put(result);
      } catch (error) {
        validationError = error;
        transaction.abort();
      }
    };
    transaction.onabort = () => reject(validationError || transaction.error);
    transaction.oncomplete = () => {
      if (change) {
        changes.dispatchEvent(new Event('change'));
        channel?.postMessage('change');
      }
      resolve(result);
    };
  });
}

export function createRental({ car, start, end }) {
  return withRecords(records => {
    const model = cars.find(item => item.id === car);
    if (!model) throw new Error('Выберите автомобиль.');
    const error = periodError(records, car, start, end, today());
    if (error) throw new Error(error);
    return { id: crypto.randomUUID(), car, start, end, price: model.price };
  });
}

export function extendRental(id, expectedEnd, end) {
  return withRecords(records => {
    const record = records.find(item => item.id === id);
    if (!record || record.end !== expectedEnd) throw new Error('Даты изменились. Проверьте новую дату возврата.');
    extensionQuote(records, record, end, today());
    return { ...record, end };
  });
}

export function storageMessage(error) {
  return error instanceof Error && !(error instanceof DOMException) && error.name === 'Error'
    ? error.message : 'Не удалось открыть хранилище бронирований. Проверьте настройки браузера и попробуйте ещё раз.';
}

export function useRentals() {
  const [state, setState] = useState({ records: [], loading: true, error: '' });
  useEffect(() => {
    let version = 0;
    async function refresh() {
      const current = ++version;
      try {
        const records = await withRecords();
        if (current === version) setState({ records, loading: false, error: '' });
      } catch (error) {
        if (current === version) setState({ records: [], loading: false, error: storageMessage(error) });
      }
    }
    refresh();
    changes.addEventListener('change', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      version++;
      changes.removeEventListener('change', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return state;
}
