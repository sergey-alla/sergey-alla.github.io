const countdownContainer = document.getElementById('countdown-cont');
const countdownUnits = countdownContainer.querySelector('.countdown-units');

const targetSec = Date.UTC(2025, 8, 27, 10, 0, 0) / 1000; // 27.09.2025 14:00 GMT+1

const wordForms = {
    days: ['дней', 'день', 'дня'],
    hours: ['часов', 'час', 'часа'],
    minutes: ['минут', 'минута', 'минуты'],
    seconds: ['секунд', 'секунда', 'секунды']
};

const formIndex = amount => {
    const last = amount % 10;
    if (last === 0 || (amount % 100 > 10 && amount % 100 < 20)) return 0;
    if (last === 1) return 1;
    if (last < 5) return 2;
    return 0;
};

const getDiffUnits = diffSec => ({
    days: Math.floor(diffSec / 86400),
    hours: Math.floor((diffSec % 86400) / 3600),
    minutes: Math.floor((diffSec % 3600) / 60),
    seconds: Math.floor(diffSec % 60)
});

const renderTime = units => {
    for (let unit in units) {
        const value = String(units[unit]).padStart(unit === 'days' ? 3 : 2, '0');
        for (let i = 0; i < value.length; i++) {
            countdownUnits.querySelector(`.${unit}${i}`).innerHTML = value.charAt(i);
        }
        countdownUnits.querySelector(`.${unit}-desc`).innerHTML = wordForms[unit][formIndex(units[unit])];
    }
};

const intervalSec = 1000;
let expectedTime = Math.floor(Date.now() / 1000) * 1000 + intervalSec;
const countdown = () => {
    const now = Date.now();
    var delta = now - expectedTime;
    expectedTime += intervalSec;
    // todo check if time is up
    renderTime(getDiffUnits(targetSec - now / 1000));

    setTimeout(countdown, Math.max(0, intervalSec - delta));
};
setTimeout(countdown, intervalSec);
