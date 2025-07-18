// Téma váltás (sötét/világos mód)
const themeToggleBtn = document.getElementById('themeToggleBtn');
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    themeToggleBtn.textContent = '🌙 Sötét mód';
  } else {
    document.body.classList.remove('light-mode');
    themeToggleBtn.textContent = '☀️ Világos mód';
  }
  localStorage.setItem('weatherTheme', theme);
}
themeToggleBtn.addEventListener('click', () => {
  const isLight = document.body.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
});
// Alapértelmezett téma betöltése
const savedTheme = localStorage.getItem('weatherTheme');
applyTheme(savedTheme === 'light' ? 'light' : 'dark');
const apiKey = 'b0a8907870c84d43cd9995146a01778e'; // saját kulcsod

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherSection = document.getElementById('weatherSection');
const historyList = document.getElementById('historyList');
const hourlySection = document.getElementById('hourlySection');
const hourlyDetails = document.getElementById('hourlyDetails');
const next24hSection = document.getElementById('next24hSection');
const next24hDetails = document.getElementById('next24hDetails');

let currentForecastData = null;
let tempChart = null;

function saveToHistory(city) {
  let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
  city = city.toLowerCase();
  if (!history.includes(city)) {
    history.unshift(city);
    if (history.length > 5) history.pop();
    localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
  }
  renderHistory();
}

function renderHistory() {
  let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
  historyList.innerHTML = '';
  history.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city.charAt(0).toUpperCase() + city.slice(1);
    li.addEventListener('click', () => {
      cityInput.value = city;
      getWeather(city);
    });
    historyList.appendChild(li);
  });
}

function getDailySummary(data) {
  const dailyData = {};
  data.list.forEach(entry => {
    const date = entry.dt_txt.split(' ')[0];
    if (!dailyData[date]) dailyData[date] = [];
    dailyData[date].push(entry);
  });
  const days = Object.keys(dailyData).slice(0, 5);
  return { dailyData, days };
}

function renderDailyCards(dailyData, days) {
const weatherCardsWrapper = document.getElementById('weatherCardsWrapper');
weatherCardsWrapper.innerHTML = '';

days.forEach(day => {
  const entries = dailyData[day];

  // Átlaghőmérséklet
  const temps = entries.map(e => e.main.temp);
  const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);

  // Leggyakoribb időjárási leírás és ikon
  const descCounts = {};
  const iconCounts = {};

  entries.forEach(e => {
    const d = e.weather[0].description;
    const i = e.weather[0].icon;
    descCounts[d] = (descCounts[d] || 0) + 1;
    iconCounts[i] = (iconCounts[i] || 0) + 1;
  });

  const mainDesc = Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0][0];
  const mainIcon = Object.entries(iconCounts).sort((a, b) => b[1] - a[1])[0][0];

  const card = document.createElement('div');
  card.className = 'weather-card';
  card.innerHTML = `
    <h4>${new Date(day).toLocaleDateString('hu-HU', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
    <img src="https://openweathermap.org/img/wn/${mainIcon}@2x.png" alt="időjárás ikon" />
    <p>${mainDesc}</p>
    <p><strong>${avgTemp} °C</strong></p>
  `;

  card.addEventListener('click', () => {
    renderHourlyDetails(day);
    hourlySection.style.display = 'block';
    hourlySection.scrollIntoView({ behavior: 'smooth' });
  });

  weatherCardsWrapper.appendChild(card);
});
}

function renderHourlyDetails(day) {
  if (!currentForecastData) return;
  const entries = currentForecastData.list.filter(entry => entry.dt_txt.startsWith(day));
  hourlyDetails.innerHTML = '';

  entries.forEach(entry => {
    const time = new Date(entry.dt_txt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    const temp = entry.main.temp.toFixed(1);
    const desc = entry.weather[0].description;
    const icon = entry.weather[0].icon;

    const card = document.createElement('div');
    card.className = 'hourly-card';
    card.innerHTML = `
      <p><strong>${time}</strong></p>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="időjárás ikon" />
      <p>${desc}</p>
      <p><strong>${temp} °C</strong></p>
    `;
    hourlyDetails.appendChild(card);
  });

  // Hőmérséklet grafikon
  const labels = entries.map(item => new Date(item.dt_txt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }));
  const temps = entries.map(item => item.main.temp);

  const ctx = document.getElementById('tempChart').getContext('2d');

  if (tempChart) {
    tempChart.destroy();
  }

  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Hőmérséklet (°C)',
        data: temps,
        backgroundColor: 'rgba(180, 180, 180, 0.2)',
        borderColor: '#bfc4cc',
        borderWidth: 2,
        fill: true,
        pointRadius: 3,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: '#333'
          },
          ticks: {
            color: '#fff'
          }
        },
        x: {
          grid: {
            color: '#333'
          },
          ticks: {
            color: '#fff'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#fff'
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw} °C`
          },
          backgroundColor: '#23272f',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#444',
          borderWidth: 1
        }
      }
    }
  });
}

function renderNext24Hours(list) {
  next24hDetails.innerHTML = '';
  const next8 = list.slice(0, 8); // 8 * 3h = 24h

  next8.forEach(entry => {
    const time = new Date(entry.dt_txt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    const temp = entry.main.temp.toFixed(1);
    const desc = entry.weather[0].description;
    const icon = entry.weather[0].icon;

    const card = document.createElement('div');
    card.className = 'hourly-card';
    card.innerHTML = `
      <p><strong>${time}</strong></p>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="időjárás ikon" />
      <p>${desc}</p>
      <p><strong>${temp} °C</strong></p>
    `;

    next24hDetails.appendChild(card);
  });

  next24hSection.style.display = 'block';
}

async function getWeather(city) {
  if (!city) city = cityInput.value.trim();
  if (!city) {
    alert('Kérlek, írj be egy városnevet!');
    return;
  }

  try {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=hu`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) throw new Error('Nem található adat ehhez a városhoz');
    const forecastData = await forecastRes.json();

    currentForecastData = forecastData;

    const { dailyData, days } = getDailySummary(forecastData);

    renderDailyCards(dailyData, days);
    renderNext24Hours(forecastData.list);
    hourlySection.style.display = 'none';

    saveToHistory(city);
  } catch (error) {
    weatherSection.innerHTML = `<p style="color: white; text-align:center;">${error.message}</p>`;
    hourlySection.style.display = 'none';
    next24hSection.style.display = 'none';
    next24hDetails.innerHTML = '';
  }
}

// Lokáció alapú időjárás lekérés oldal betöltésekor
window.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        getWeatherByCoords(lat, lon);
      },
      err => {
        // Ha a felhasználó nem engedélyezi, marad a város kereső
      }
    );
  }
});

async function getWeatherByCoords(lat, lon) {
  try {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=hu`;
    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) throw new Error('Nem található adat ehhez a helyhez');
    const forecastData = await forecastRes.json();

    currentForecastData = forecastData;
    const { dailyData, days } = getDailySummary(forecastData);
    renderDailyCards(dailyData, days);
    renderNext24Hours(forecastData.list);
    hourlySection.style.display = 'none';

    // Mentés a keresési előzményekbe a városnév alapján
    if (forecastData.city && forecastData.city.name) {
      saveToHistory(forecastData.city.name);
    }
  } catch (error) {
    weatherSection.innerHTML = `<p style="color: white; text-align:center;">${error.message}</p>`;
    hourlySection.style.display = 'none';
    next24hSection.style.display = 'none';
    next24hDetails.innerHTML = '';
  }
}

searchBtn.addEventListener('click', () => getWeather());
cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') getWeather();
});

renderHistory();
