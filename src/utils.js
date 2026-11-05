export const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
export const discount = days => days >= 30 ? 20 : days >= 7 ? 10 : 0;
export const dailyRate = (car, days) => Math.round(car.price * (1 - discount(days) / 100));
export const totalPrice = (car, days) => dailyRate(car, days) * days;
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function dateNumber(value) { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:NaN; }
export const rentalDays = (start, end) => (dateNumber(end)-dateNumber(start))/86400000;
export const formatDate = date => date.split('-').reverse().join('.');
export function validateBooking(values,cars,currentDate=today()) {
 const errors={};
 if(!cars.some(car=>car.id===values.car))errors.car='Выберите автомобиль.';
 if(!Number.isFinite(dateNumber(values.start)))errors.start='Укажите дату начала аренды.';
 else if(values.start<currentDate)errors.start='Дата начала не может быть в прошлом.';
 if(!Number.isFinite(dateNumber(values.end)))errors.end='Укажите дату окончания аренды.';
 else if(Number.isFinite(dateNumber(values.start))&&values.end<=values.start)errors.end='Дата окончания должна быть позже даты начала.';
 else if(rentalDays(values.start,values.end)>365)errors.end='Выберите период не более 365 дней.';
 if(values.name.trim().length<2)errors.name='Введите имя: не менее двух символов.';
 const phone=values.phone.trim(),digits=phone.replace(/\D/g,'');
 if(!/^[+\d\s()\-]+$/.test(phone)||!((digits.length===11&&/^[78]/.test(digits))||digits.length===10))errors.phone='Введите номер: +7 и 10 цифр.';
 return errors;
}
