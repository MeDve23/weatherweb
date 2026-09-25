const API_KEY = 'b0a8907870c84d43cd9995146a01778e';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CARTO_API_KEY = 'cb1_3xlt_1_866e1ad8ced1178c18238cd8';


const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const currentWeatherCard = document.getElementById('currentWeatherCard');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingText = document.getElementById('loadingText');
const errorIndicator = document.getElementById('errorIndicator');
const errorMessage = document.getElementById('errorMessage');
const forecastSection = document.getElementById('forecastSection');
const hourlySection = document.getElementById('hourlySection');
const radarSection = document.getElementById('radarSection');
const historyContainer = document.getElementById('historyContainer');
const currentCity = document.getElementById('currentCity');
const currentDate = document.getElementById('currentDate');
const currentTemp = document.getElementById('currentTemp');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecastContainer');
const hourlyContainer = document.getElementById('hourlyContainer');
const locationMethod = document.getElementById('locationMethod');

let currentWeatherData = null;
let weatherChart = null;
let currentLocationMethod = 'manual';

// Térkép változók
let weatherMap = null;
let currentLayer = null;
let mapMarker = null;
let rainviewerHost = 'https://tilecache.rainviewer.com';
let rainviewerPath = '';

// --- Dátum és idő formázás ---
function formatDate(timestamp, options = {}) {
    const date = new Date(timestamp * 1000);
    const formatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    return date.toLocaleDateString('hu-HU', formatOptions);
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

// --- Animált Meteocons időjárás ikonok ---
function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'clear-day',
        '01n': 'clear-night',
        '02d': 'partly-cloudy-day',
        '02n': 'partly-cloudy-night',
        '03d': 'cloudy',
        '03n': 'cloudy',
        '04d': 'overcast',
        '04n': 'overcast',
        '09d': 'rain',
        '09n': 'rain',
        '10d': 'rain',
        '10n': 'rain',
        '11d': 'thunderstorms',
        '11n': 'thunderstorms',
        '13d': 'snow',
        '13n': 'snow',
        '50d': 'fog',
        '50n': 'fog'
    };
    
    const iconName = iconMap[iconCode] || 'cloudy';
    const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${iconName}.svg`;
    
    return `<img src="${iconUrl}" 
                alt="Időjárás ikon" 
                class="weather-icon-img" 
                loading="lazy"
                onerror="this.onerror=null; this.src='https://openweathermap.org/img/wn/${iconCode}@4x.png';">`;
}

// --- RainViewer időbélyeg lekérése ---
async function fetchRainViewerTimestamp() {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        if (data && data.radar) {
            rainviewerHost = data.host || 'https://tilecache.rainviewer.com';
            if (data.radar.past && data.radar.past.length > 0) {
                rainviewerPath = data.radar.past[data.radar.past.length - 1].path;
            } else if (data.radar.nowcast && data.radar.nowcast.length > 0) {
                rainviewerPath = data.radar.nowcast[0].path;
            }
            console.log('✅ RainViewer timestamp betöltve:', rainviewerPath);
        }
    } catch (error) {
        console.warn('⚠️ RainViewer timestamp nem elérhető:', error);
    }
}

// --- Térkép inicializálás ---
async function initMap() {
    if (weatherMap) return;
    
    weatherMap = L.map('weatherMap', {
        center: [47.1625, 19.5033],
        zoom: 6,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true
    });

    L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 18,
        maxNativeZoom: 18
    }).addTo(weatherMap);

    await fetchRainViewerTimestamp();
    setRadarLayer('precipitation');
}

// --- Radar rétegek ---
function setRadarLayer(layerType) {
    if (!weatherMap) return;

    if (currentLayer) {
        weatherMap.removeLayer(currentLayer);
    }

    switch (layerType) {
        case 'precipitation': {
            const path = rainviewerPath || '/v2/radar/nowcast';
            currentLayer = L.tileLayer(
                `${rainviewerHost}${path}/256/{z}/{x}/{y}/2/1_1.png`,
                {
                    opacity: 0.7,
                    attribution: '&copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
                    zIndex: 10,
                    maxNativeZoom: 10,
                    maxZoom: 18
                }
            );
            break;
        }

        case 'clouds':
            currentLayer = L.tileLayer(
                `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
                {
                    opacity: 0.6,
                    attribution: '&copy; OpenWeatherMap',
                    zIndex: 10,
                    maxNativeZoom: 18,
                    maxZoom: 18
                }
            );
            break;

        case 'temp':
            currentLayer = L.tileLayer(
                `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
                {
                    opacity: 0.6,
                    attribution: '&copy; OpenWeatherMap',
                    zIndex: 10,
                    maxNativeZoom: 18,
                    maxZoom: 18
                }
            );
            break;

        case 'wind':
            currentLayer = L.tileLayer(
                `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
                {
                    opacity: 0.6,
                    attribution: '&copy; OpenWeatherMap',
                    zIndex: 10,
                    maxNativeZoom: 18,
                    maxZoom: 18
                }
            );
            break;
    }

    if (currentLayer) {
        currentLayer.addTo(weatherMap);
    }
}

// --- Térkép fókusz ---
function focusMapOnCity(lat, lon, cityName, temp) {
    if (!weatherMap) return;

    weatherMap.setView([lat, lon], 9);

    if (mapMarker) {
        weatherMap.removeLayer(mapMarker);
    }

    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background: linear-gradient(135deg, #38bdf8, #0ea5e9);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.8), 0 0 40px rgba(56, 189, 248, 0.4);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    mapMarker = L.marker([lat, lon], { icon: customIcon }).addTo(weatherMap);
    mapMarker.bindPopup(`
        <div style="text-align:center;padding:0.25rem;">
            <strong style="font-size:1rem;">${cityName}</strong><br>
            <span style="color:#38bdf8;font-weight:600;">${temp}°C</span>
        </div>
    `).openPopup();
}

// --- API hívások ---
async function fetchWeatherData(city) {
    const currentResponse = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=hu`);
    if (!currentResponse.ok) throw new Error('Város nem található');
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=hu`);
    if (!forecastResponse.ok) throw new Error('Előrejelzési adatok nem elérhetők');
    const forecastData = await forecastResponse.json();
    
    return { current: currentData, forecast: forecastData };
}

async function fetchWeatherByCoords(lat, lon) {
    const currentResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=hu`);
    if (!currentResponse.ok) throw new Error('Helyadatok nem elérhetők');
    const currentData = await currentResponse.json();
    
    const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=hu`);
    if (!forecastResponse.ok) throw new Error('Előrejelzési adatok nem elérhetők');
    const forecastData = await forecastResponse.json();
    
    return { current: currentData, forecast: forecastData };
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('A böngésző nem támogatja a helymeghatározást'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => resolve({ 
                lat: position.coords.latitude, 
                lon: position.coords.longitude 
            }),
            error => {
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED: 
                        errorMessage = '❌ A helymeghatározást elutasítottad. Engedélyezd a böngésző beállításaiban!'; 
                        break;
                    case error.POSITION_UNAVAILABLE: 
                        errorMessage = '❌ Helyinformáció nem elérhető.'; 
                        break;
                    case error.TIMEOUT: 
                        errorMessage = '❌ A helymeghatározás túllépte az időkeretet.'; 
                        break;
                    default: 
                        errorMessage = '❌ Ismeretlen hiba a helymeghatározás során.'; 
                        break;
                }
                reject(new Error(errorMessage));
            },
            { 
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 300000
            }
        );
    });
}

// --- Megjelenítés ---
function displayCurrentWeather(data) {
    const { current } = data;
    currentCity.textContent = `${current.name}, ${current.sys.country}`;
    currentDate.textContent = formatDate(current.dt);
    currentTemp.textContent = `${Math.round(current.main.temp)}°C`;
    weatherDescription.textContent = current.weather[0].description;
    weatherIcon.innerHTML = getWeatherIcon(current.weather[0].icon);
    
    feelsLike.textContent = `${Math.round(current.main.feels_like)}°C`;
    humidity.textContent = `${current.main.humidity}%`;
    windSpeed.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
    pressure.textContent = `${current.main.pressure} hPa`;
    
    locationMethod.textContent = currentLocationMethod === 'geolocation' 
        ? '📍 Automatikus helymeghatározás' 
        : '🔍 Keresés alapján';
    
    currentWeatherCard.style.display = 'block';
    hideLoading();
}

function displayForecast(data) {
    const { forecast } = data;
    const dailyForecasts = forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5);
    forecastContainer.innerHTML = '';
    
    dailyForecasts.forEach(day => {
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-date">${formatDate(day.dt, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div class="forecast-icon">${getWeatherIcon(day.weather[0].icon)}</div>
            <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
            <div class="forecast-description">${day.weather[0].description}</div>
        `;
        forecastContainer.appendChild(forecastCard);
    });
    forecastSection.style.display = 'block';
}

function displayHourlyForecast(data) {
    const { forecast } = data;
    const hourlyForecasts = forecast.list.slice(0, 8);
    hourlyContainer.innerHTML = '';
    
    hourlyForecasts.forEach(hour => {
        const hourlyCard = document.createElement('div');
        hourlyCard.className = 'hourly-card';
        hourlyCard.innerHTML = `
            <div class="hourly-time">${formatTime(hour.dt)}</div>
            <div class="hourly-icon">${getWeatherIcon(hour.weather[0].icon)}</div>
            <div class="hourly-temp">${Math.round(hour.main.temp)}°C</div>
        `;
        hourlyContainer.appendChild(hourlyCard);
    });
    
    createTemperatureChart(hourlyForecasts);
    hourlySection.style.display = 'block';
}

function createTemperatureChart(hourlyData) {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    if (weatherChart) weatherChart.destroy();
    
    const labels = hourlyData.map(hour => formatTime(hour.dt));
    const temperatures = hourlyData.map(hour => Math.round(hour.main.temp));
    
    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hőmérséklet (°C)',
                data: temperatures,
                borderColor: '#38bdf8',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(56, 189, 248, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
                    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
                    return gradient;
                },
                borderWidth: 3,
                pointBackgroundColor: '#38bdf8',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#38bdf8',
                    borderColor: '#38bdf8',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// --- Radar megjelenítés ---
async function displayRadar(data) {
    const { current } = data;
    
    radarSection.style.display = 'block';
    
    if (!weatherMap) {
        await initMap();
    }
    
    setTimeout(() => {
        focusMapOnCity(current.coord.lat, current.coord.lon, current.name, Math.round(current.main.temp));
        weatherMap.invalidateSize();
    }, 200);
}

// --- Előzmények ---
function saveToHistory(city) {
    let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    if (history.length > 5) history.pop();
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    if (history.length === 0) {
        historyContainer.innerHTML = '<p class="empty-history">Még nincsenek korábbi keresések</p>';
        return;
    }
    historyContainer.innerHTML = '';
    history.forEach(city => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = city;
        historyItem.addEventListener('click', () => {
            cityInput.value = city;
            getWeatherData(city);
        });
        historyContainer.appendChild(historyItem);
    });
}

// --- UI állapotok ---
function showLoading() {
    loadingIndicator.style.display = 'flex';
    errorIndicator.style.display = 'none';
    currentWeatherCard.style.display = 'none';
    forecastSection.style.display = 'none';
    hourlySection.style.display = 'none';
    radarSection.style.display = 'none';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    loadingIndicator.style.display = 'none';
    errorIndicator.style.display = 'flex';
    errorMessage.textContent = message;
    
    document.getElementById('retryButton').onclick = () => {
        errorIndicator.style.display = 'none';
        getWeatherData('Budapest');
    };
}

// --- Fő vezérlés ---
async function getWeatherData(city) {
    try {
        showLoading();
        currentLocationMethod = 'manual';
        const data = await fetchWeatherData(city);
        currentWeatherData = data;
        displayCurrentWeather(data);
        displayForecast(data);
        displayHourlyForecast(data);
        await displayRadar(data);
        saveToHistory(city);
    } catch (error) {
        console.error('Hiba:', error);
        showError(error.message);
    }
}

async function getWeatherByLocation() {
    try {
        // Gomb loading állapot
        geoBtn.classList.add('loading');
        geoBtn.disabled = true;
        
        currentLocationMethod = 'geolocation';
        showLoading();
        loadingText.textContent = 'Helymeghatározás...';
        
        const coords = await getCurrentLocation();
        loadingText.textContent = 'Időjárási adatok betöltése...';
        
        const data = await fetchWeatherByCoords(coords.lat, coords.lon);
        currentWeatherData = data;
        displayCurrentWeather(data);
        displayForecast(data);
        displayHourlyForecast(data);
        await displayRadar(data);
        // Geolokációnál NEM mentjük az előzményekbe (mert nincs városnév, csak koordináta)
    } catch (error) {
        console.error('Hiba a helymeghatározás során:', error);
        showError(error.message);
    } finally {
        geoBtn.classList.remove('loading');
        geoBtn.disabled = false;
    }
}

// --- Eseménykezelők ---
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) getWeatherData(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) getWeatherData(city);
    }
});

geoBtn.addEventListener('click', () => {
    getWeatherByLocation();
});

// Radar gombok
document.querySelectorAll('.radar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.radar-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setRadarLayer(btn.dataset.layer);
    });
});

// --- Indítás ---
function initApp() {
    displayHistory();
    
    // NEM hívjuk automatikusan a geolokációt! (böngésző blokkolja)
    // Helyette az utolsó keresett várost, vagy Budapestet töltjük be
    const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    if (history.length > 0) {
        getWeatherData(history[0]);
    } else {
        getWeatherData('Budapest');
    }
}

document.addEventListener('DOMContentLoaded', initApp);