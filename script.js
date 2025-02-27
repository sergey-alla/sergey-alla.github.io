const countdownContainer = document.getElementById('countdown-cont');
const countdownUnits = countdownContainer.querySelector('.countdown-units');

let targetSec = new Date() / 1000 - 1;

const wordForms = {
    days: ['дней', 'день', 'дня'],
    hours: ['часов', 'час', 'часа'],
    minutes: ['минут', 'минута', 'минуты'],
    seconds: ['секунд', 'секунда', 'секунды']
};

const currentUrl = new URL(window.location.href);
const urlParams = new URLSearchParams(currentUrl.search);
let key = urlParams.get('key');
if (!key) {
    key = localStorage.getItem('wedding-sa-zis') ?? '';
    if (key) {
        urlParams.set('key', key);
        currentUrl.search = urlParams.toString();
        window.history.replaceState({}, '', currentUrl);
    }
} else {
    localStorage.setItem('wedding-sa-zis', key);
}

let decrypted = false;
let decryptedData = {};

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
            countdownUnits.querySelector(`.${unit}${i}`).innerText = value.charAt(i);
        }
        countdownUnits.querySelector(`.${unit}-desc`).innerText = wordForms[unit][formIndex(units[unit])];
    }
};

const intervalSec = 1000;
let expectedTime = Math.floor(Date.now() / 1000) * 1000 + intervalSec;
const countdown = () => {
    const now = Date.now();
    var delta = now - expectedTime;
    expectedTime += intervalSec;
    // todo check if time is up
    renderTime(getDiffUnits(Math.max(targetSec - now / 1000, 0)));

    setTimeout(countdown, Math.max(0, intervalSec - delta));
};
setTimeout(countdown, intervalSec);

const foldBox = box => {
    box.classList.toggle('collapsed');
}

[...document.getElementsByClassName('foldable-box')].forEach(box => {
    if (!box.classList.contains('opened')) {
        box.classList.add('collapsed');
    }
    box.querySelector('.foldable-header').addEventListener('click', () => foldBox(box));
    box.classList.add('animated');
});

const decrypt = (data, key) => {
    console.debug(`key: ${key}`);
    console.debug(`data: ${data}`);
    if (!key) {
        console.warn('Не удалось расшифровать файл: передан пустой ключ');
    } else if (!data) {
        console.warn('Не удалось расшифровать файл: не переданы зашифрованные данные');
    } else {
        try {
            const bytes = CryptoJS.AES.decrypt(data, key);
            const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
            if (decryptedText) return decryptedText;
            console.warn('Не удалось расшифровать файл: передан неверный ключ');
        } catch (e) {
            console.warn('Возникла ошибка при расшифровке файла');
            console.warn(e);
        }
    }
    return null;
};

const isTimeInRange = (time, range) => {
    const [startHour, endHour] = range;
    const utcOffset = 4 * 60;
    const localTime = new Date(time.getTime() + (time.getTimezoneOffset() + utcOffset) * 60000);

    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const startTotalMinutes = startHour * 60;
    const endTotalMinutes = endHour * 60;

    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
};

const sendTg = async (message, recipient) => {
    const tg = decryptedData.tg;
    const start = new Date();
    console.debug(`ID получателя "${recipient}": ${tg[recipient] ?? '<null>'}; сообщение: "${message}"`);
    return fetch(`https://api.telegram.org/bot${tg.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: tg[recipient],
            text: message,
            parse_mode: 'HTML',
            disable_notification: !isTimeInRange(start, [8, 23])
        })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.ok) return Promise.reject(data);
            const end = new Date();
            console.debug(
                `Сообщение успешно отправлено за ${Math.round((end.getTime() - start.getTime())) / 1000} секунд!`
            );
        })
        .catch(e => {
            console.error('Произошла ошибка при отправке сообщения!');
            console.error(e);
        });
};

function main() {
    const dateUTC = decryptedData.dateUTC;
    targetSec = Date.UTC(dateUTC.year, dateUTC.month - 1, dateUTC.day, dateUTC.hour, dateUTC.minute, 0) / 1000;
}

{
    fetch('encryptedData.txt')
        .then(response => response.ok ? response.text() : Promise.resolve(''))
        .then(data => decrypt(data, key))
        .then(data => {
            let jsonData = null;
            if (data) {
                try {
                    jsonData = JSON.parse(data);
                } catch (_) {
                    console.error(`Ошибка парсинга JSON из расшифрованных данных. Данные: ${data}`);
                }
            } else console.error('Не удалось расшифровать данные');
            decryptedData = jsonData ?? {};
            decrypted = !!jsonData;
            return decrypted ? Promise.resolve() : Promise.reject();
        })
        .then(() => new Promise(
            resolve => {
                if (document.readyState === 'complete') resolve();
                else window.addEventListener('load', resolve);
            }
        ))
        .then(() => new Promise(resolve => setTimeout(resolve, 200)))
        .then(() => {
            console.debug(decryptedData);
            document.body.classList.remove('preload');
            main();
        })
        .catch(() => {
            // todo
        });
}