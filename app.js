const API_KEY = 'b0a8907870c84d43cd9995146a01778e';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CARTO_API_KEY = 'cb1_3xlt_1_866e1ad8ced1178c18238cd8';


const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const appHeader = document.getElementById('appHeader');
const currentWeatherCard = document.getElementById('currentWeatherCard');
const skeletonCard = document.getElementById('skeletonCard');
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
const tempMin = document.getElementById('tempMin');
const tempMax = document.getElementById('tempMax');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const uvIndex = document.getElementById('uvIndex');
const airQuality = document.getElementById('airQuality');
const forecastContainer = document.getElementById('forecastContainer');
const hourlyContainer = document.getElementById('hourlyContainer');
const locationMethod = document.getElementById('locationMethod');
const toast = document.getElementById('toast');

let currentWeatherData = null;
let weatherChart = null;
let currentLocationMethod = 'manual';

// Térkép változók
let weatherMap = null;
let currentLayer = null;
let mapMarker = null;
let rainviewerHost = 'https://tilecache.rainviewer.com';
let rainviewerPath = '';

// === TOAST ===
function showToast(message, type = 'info', duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// === REZGÉS ===
function vibrate(pattern = 30) {
    if ('vibrate' in navigator) {
        try { navigator.vibrate(pattern); } catch(e) {}
    }
}

// === DÁTUM ===
function formatDate(timestamp, options = {}) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('hu-HU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    });
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

// === IKONOK ===
function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'clear-day', '01n': 'clear-night',
        '02d': 'partly-cloudy-day', '02n': 'partly-cloudy-night',
        '03d': 'cloudy', '03n': 'cloudy',
        '04d': 'overcast', '04n': 'overcast',
        '09d': 'rain', '09n': 'rain',
        '10d': 'rain', '10n': 'rain',
        '11d': 'thunderstorms', '11n': 'thunderstorms',
        '13d': 'snow', '13n': 'snow',
        '50d': 'fog', '50n': 'fog'
    };
    
    const iconName = iconMap[iconCode] || 'cloudy';
    const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/${iconName}.svg`;
    
    return `<img src="${iconUrl}" alt="Időjárás ikon" class="weather-icon-img" loading="lazy"
                onerror="this.onerror=null; this.src='https://openweathermap.org/img/wn/${iconCode}@4x.png';">`;
}

// === UV ÉS AQI ===
function getUVDescription(uv) {
    if (uv <= 2) return 'Alacsony';
    if (uv <= 5) return 'Mérsékelt';
    if (uv <= 7) return 'Magas';
    if (uv <= 10) return 'Nagyon magas';
    return 'Extrém';
}

function getAQIDescription(aqi) {
    const map = { 1: 'Jó', 2: 'Elfogadható', 3: 'Mérsékelt', 4: 'Rossz', 5: 'Nagyon rossz' };
    return map[aqi] || '--';
}

async function fetchAirQuality(lat, lon) {
    try {
        const response = await fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        if (!response.ok) throw new Error('AQI nem elérhető');
        const data = await response.json();
        return data.list[0].main.aqi;
    } catch (e) {
        console.warn('AQI hiba:', e);
        return null;
    }
}

async function fetchUVIndex(lat, lon) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index`);
        const data = await response.json();
        return data.current?.uv_index ?? null;
    } catch { return null; }
}

// === RAINVIEWER ===
async function fetchRainViewerTimestamp() {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        if (data && data.radar) {
            rainviewerHost = data.host || 'https://tilecache.rainviewer.com';
            if (data.radar.past && data.radar.past.length > 0) {
                rainviewerPath = data.radar.past[data.radar.past.length - 1].path;
            }
        }
    } catch (error) {
        console.warn('RainViewer hiba:', error);
    }
}

// === TÉRKÉP ===
async function initMap() {
    if (weatherMap) return;
    
    const mapContainer = document.getElementById('weatherMap');
    if (!mapContainer) return;
    
    let attempts = 0;
    while ((mapContainer.offsetHeight === 0 || mapContainer.offsetWidth === 0) && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (mapContainer.offsetHeight === 0) return;
    
    try {
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
        
        setTimeout(() => weatherMap && weatherMap.invalidateSize(), 100);
        setTimeout(() => weatherMap && weatherMap.invalidateSize(), 500);
        setTimeout(() => weatherMap && weatherMap.invalidateSize(), 1000);
    } catch (err) {
        console.error('Térkép hiba:', err);
    }
}

function setRadarLayer(layerType) {
    if (!weatherMap) return;
    if (currentLayer) weatherMap.removeLayer(currentLayer);

    switch (layerType) {
        case 'precipitation': {
            const path = rainviewerPath || '/v2/radar/nowcast';
            currentLayer = L.tileLayer(`${rainviewerHost}${path}/256/{z}/{x}/{y}/2/1_1.png`, {
                opacity: 0.7,
                attribution: '&copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
                zIndex: 10, maxNativeZoom: 10, maxZoom: 18
            });
            break;
        }
        case 'clouds':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                opacity: 0.6, zIndex: 10, maxNativeZoom: 18, maxZoom: 18
            });
            break;
        case 'temp':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                opacity: 0.6, zIndex: 10, maxNativeZoom: 18, maxZoom: 18
            });
            break;
        case 'wind':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                opacity: 0.6, zIndex: 10, maxNativeZoom: 18, maxZoom: 18
            });
            break;
    }
    if (currentLayer) currentLayer.addTo(weatherMap);
}

function focusMapOnCity(lat, lon, cityName, temp) {
    if (!weatherMap) return;
    weatherMap.setView([lat, lon], 9);
    if (mapMarker) weatherMap.removeLayer(mapMarker);

    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: linear-gradient(135deg, #38bdf8, #0ea5e9); width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 20px rgba(56, 189, 248, 0.8);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
    });

    mapMarker = L.marker([lat, lon], { icon: customIcon }).addTo(weatherMap);
    mapMarker.bindPopup(`<div style="text-align:center;padding:0.25rem;"><strong>${cityName}</strong><br><span style="color:#38bdf8;font-weight:600;">${temp}°C</span></div>`).openPopup();
}

// === API ===
async function fetchWeatherData(city) {
    const [currentResponse, forecastResponse] = await Promise.all([
        fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=hu`),
        fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=hu`)
    ]);
    if (!currentResponse.ok) throw new Error('Város nem található');
    if (!forecastResponse.ok) throw new Error('Előrejelzés nem elérhető');
    
    const [current, forecast] = await Promise.all([currentResponse.json(), forecastResponse.json()]);
    return { current, forecast };
}

async function fetchWeatherByCoords(lat, lon) {
    const [currentResponse, forecastResponse] = await Promise.all([
        fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=hu`),
        fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=hu`)
    ]);
    if (!currentResponse.ok) throw new Error('Helyadatok nem elérhetők');
    if (!forecastResponse.ok) throw new Error('Előrejelzés nem elérhető');
    
    const [current, forecast] = await Promise.all([currentResponse.json(), forecastResponse.json()]);
    return { current, forecast };
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Nincs helymeghatározás'));
        
        navigator.geolocation.getCurrentPosition(
            position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            error => {
                let msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED: msg = '❌ Helymeghatározás elutasítva'; break;
                    case error.POSITION_UNAVAILABLE: msg = '❌ Helyinformáció nem elérhető'; break;
                    case error.TIMEOUT: msg = '❌ Időtúllépés'; break;
                    default: msg = '❌ Ismeretlen hiba';
                }
                reject(new Error(msg));
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
    });
}

// === MEGJELENÍTÉS ===
async function displayCurrentWeather(data) {
    const { current } = data;
    
    currentCity.textContent = `${current.name}, ${current.sys.country}`;
    currentDate.textContent = formatDate(current.dt);
    currentTemp.textContent = `${Math.round(current.main.temp)}°`;
    weatherDescription.textContent = current.weather[0].description;
    weatherIcon.innerHTML = getWeatherIcon(current.weather[0].icon);
    
    feelsLike.textContent = `${Math.round(current.main.feels_like)}°`;
    humidity.textContent = `${current.main.humidity}%`;
    windSpeed.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
    pressure.textContent = `${current.main.pressure} hPa`;
    
    tempMin.textContent = `↓ ${Math.round(current.main.temp_min)}°`;
    tempMax.textContent = `↑ ${Math.round(current.main.temp_max)}°`;
    
    sunrise.textContent = formatTime(current.sys.sunrise);
    sunset.textContent = formatTime(current.sys.sunset);
    
    locationMethod.textContent = currentLocationMethod === 'geolocation' 
        ? '📍 GPS' 
        : '🔍 Keresés';
    
    try {
        const uvValue = await fetchUVIndex(current.coord.lat, current.coord.lon);
        uvIndex.textContent = uvValue !== null ? uvValue.toFixed(1) : '--';
    } catch { uvIndex.textContent = '--'; }
    
    try {
        const aqi = await fetchAirQuality(current.coord.lat, current.coord.lon);
        airQuality.textContent = aqi !== null ? getAQIDescription(aqi) : '--';
    } catch { airQuality.textContent = '--'; }
    
    skeletonCard.style.display = 'none';
    currentWeatherCard.style.display = 'block';
}

function displayForecast(data) {
    const { forecast } = data;
    const dailyForecasts = forecast.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5);
    forecastContainer.innerHTML = '';
    
    dailyForecasts.forEach((day, index) => {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="forecast-date">${formatDate(day.dt, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div class="forecast-icon">${getWeatherIcon(day.weather[0].icon)}</div>
            <div class="forecast-temp">${Math.round(day.main.temp)}°</div>
            <div class="forecast-description">${day.weather[0].description}</div>
        `;
        forecastContainer.appendChild(card);
    });
    forecastSection.style.display = 'block';
}

function displayHourlyForecast(data) {
    const { forecast } = data;
    const hourlyForecasts = forecast.list.slice(0, 12);
    hourlyContainer.innerHTML = '';
    
    hourlyForecasts.forEach(hour => {
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="hourly-time">${formatTime(hour.dt)}</div>
            <div class="hourly-icon">${getWeatherIcon(hour.weather[0].icon)}</div>
            <div class="hourly-temp">${Math.round(hour.main.temp)}°</div>
        `;
        hourlyContainer.appendChild(card);
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
            labels,
            datasets: [{
                label: 'Hőmérséklet',
                data: temperatures,
                borderColor: '#38bdf8',
                backgroundColor: (context) => {
                    const { ctx, chartArea } = context.chart;
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
                pointRadius: 4,
                pointHoverRadius: 6,
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
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: { size: 12 },
                    bodyFont: { size: 14, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
}

async function displayRadar(data) {
    const { current } = data;
    
    radarSection.style.display = 'block';
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!weatherMap) {
        await initMap();
    }
    
    setTimeout(() => {
        if (weatherMap) {
            weatherMap.invalidateSize();
            focusMapOnCity(current.coord.lat, current.coord.lon, current.name, Math.round(current.main.temp));
        }
    }, 300);
}

// === ELŐZMÉNYEK ===
function saveToHistory(city) {
    let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    if (history.length > 6) history.pop();
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
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = city;
        item.addEventListener('click', () => {
            vibrate(20);
            cityInput.value = city;
            getWeatherData(city);
        });
        historyContainer.appendChild(item);
    });
}

// === UI ===
function showLoading() {
    skeletonCard.style.display = 'block';
    currentWeatherCard.style.display = 'none';
    forecastSection.style.display = 'none';
    hourlySection.style.display = 'none';
    radarSection.style.display = 'none';
}

function hideLoading() {
    skeletonCard.style.display = 'none';
}

// === FŐ VEZÉRLÉS ===
async function getWeatherData(city) {
    try {
        showLoading();
        currentLocationMethod = 'manual';
        const data = await fetchWeatherData(city);
        currentWeatherData = data;
        
        await displayCurrentWeather(data);
        displayForecast(data);
        displayHourlyForecast(data);
        await displayRadar(data);
        saveToHistory(city);
        hideLoading();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error('Hiba:', error);
    }
}

async function getWeatherByLocation() {
    try {
        geoBtn.classList.add('loading');
        geoBtn.disabled = true;
        showLoading();
        currentLocationMethod = 'geolocation';
        
        const coords = await getCurrentLocation();
        const data = await fetchWeatherByCoords(coords.lat, coords.lon);
        currentWeatherData = data;
        
        await displayCurrentWeather(data);
        displayForecast(data);
        displayHourlyForecast(data);
        await displayRadar(data);
        hideLoading();
        showToast('📍 Helymeghatározás sikeres', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error', 4000);
        console.error('Geolokáció hiba:', error);
    } finally {
        geoBtn.classList.remove('loading');
        geoBtn.disabled = false;
    }
}

// === HEADER ELREJTÉS GÖRGETÉSKOR ===
let lastScrollY = window.scrollY;
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                appHeader.classList.add('hidden');
            } else {
                appHeader.classList.remove('hidden');
            }
            lastScrollY = currentScrollY;
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });

// === ESEMÉNYKEZELŐK ===
searchBtn.addEventListener('click', () => {
    vibrate(20);
    const city = cityInput.value.trim();
    if (city) getWeatherData(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        cityInput.blur();
        const city = cityInput.value.trim();
        if (city) getWeatherData(city);
    }
});

geoBtn.addEventListener('click', () => {
    vibrate(20);
    getWeatherByLocation();
});

// Radar gombok
document.querySelectorAll('.radar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        vibrate(15);
        document.querySelectorAll('.radar-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setRadarLayer(btn.dataset.layer);
    });
});

// Ablak átméretezés
window.addEventListener('resize', () => {
    if (weatherMap) {
        setTimeout(() => weatherMap.invalidateSize(), 200);
    }
});

// === INDÍTÁS ===
function initApp() {
    displayHistory();
    
    const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    if (history.length > 0) {
        getWeatherData(history[0]);
    } else {
        getWeatherData('Budapest');
    }
    
    window.addEventListener('online', () => showToast('🌐 Újra online', 'success', 2000));
    window.addEventListener('offline', () => showToast('📵 Offline mód', 'info', 2000));
}

document.addEventListener('DOMContentLoaded', initApp);