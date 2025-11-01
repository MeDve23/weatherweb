const API_KEY = 'b0a8907870c84d43cd9995146a01778e';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';


const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const themeToggle = document.getElementById('themeToggle');
const currentWeatherCard = document.getElementById('currentWeatherCard');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingText = document.getElementById('loadingText');
const forecastSection = document.getElementById('forecastSection');
const hourlySection = document.getElementById('hourlySection');
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


function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = themeToggle.querySelector('.theme-icon');
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
}


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


function getWeatherIcon(iconCode, isDay = true) {
    const iconMap = {
        '01d': 'sunny',
        '01n': 'clear-night',
        '02d': 'partly-cloudy',
        '02n': 'partly-cloudy-night',
        '03d': 'cloudy',
        '03n': 'cloudy',
        '04d': 'overcast',
        '04n': 'overcast',
        '09d': 'rain',
        '09n': 'rain',
        '10d': 'rain-day',
        '10n': 'rain-night',
        '11d': 'thunderstorm',
        '11n': 'thunderstorm',
        '13d': 'snow',
        '13n': 'snow',
        '50d': 'mist',
        '50n': 'mist'
    };
    
    const iconName = iconMap[iconCode] || 'cloudy';
    return createWeatherIcon(iconName);
}

function createWeatherIcon(iconName) {
    const icons = {
        'sunny': `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" fill="#FFD700"/>
                <g stroke="#FFD700" stroke-width="2" stroke-linecap="round">
                    <line x1="12" y1="3" x2="12" y2="1"/>
                    <line x1="12" y1="23" x2="12" y2="21"/>
                    <line x1="3" y1="12" x2="1" y2="12"/>
                    <line x1="23" y1="12" x2="21" y2="12"/>
                    <line x1="5.64" y1="5.64" x2="4.22" y2="4.22"/>
                    <line x1="19.78" y1="19.78" x2="18.36" y2="18.36"/>
                    <line x1="5.64" y1="18.36" x2="4.22" y2="19.78"/>
                    <line x1="19.78" y1="4.22" x2="18.36" y2="5.64"/>
                </g>
            </svg>
        `,
        'clear-night': `
            <svg viewBox="0 0 24 24">
                <path d="M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9S16.97,3,12,3z M12,19c-3.86,0-7-3.14-7-7s3.14-7,7-7s7,3.14,7,7 S15.86,19,12,19z" fill="#6B7280"/>
                <path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7z M12,15c-1.65,0-3-1.35-3-3s1.35-3,3-3s3,1.35,3,3 S13.65,15,12,15z" fill="#6B7280"/>
            </svg>
        `,
        'partly-cloudy': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#93C5FD"/>
                <circle cx="12" cy="12" r="5" fill="#FFD700"/>
            </svg>
        `,
        'partly-cloudy-night': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#93C5FD"/>
                <path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7z M12,15c-1.65,0-3-1.35-3-3s1.35-3,3-3s3,1.35,3,3 S13.65,15,12,15z" fill="#6B7280"/>
            </svg>
        `,
        'cloudy': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#93C5FD"/>
            </svg>
        `,
        'overcast': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#64748B"/>
            </svg>
        `,
        'rain': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#93C5FD"/>
                <g fill="#3B82F6">
                    <line x1="8" y1="18" x2="8" y2="22" stroke-width="2"/>
                    <line x1="12" y1="18" x2="12" y2="22" stroke-width="2"/>
                    <line x1="16" y1="18" x2="16" y2="22" stroke-width="2"/>
                </g>
            </svg>
        `,
        'rain-day': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#93C5FD"/>
                <circle cx="12" cy="12" r="5" fill="#FFD700"/>
                <g fill="#3B82F6">
                    <line x1="8" y1="18" x2="8" y2="22" stroke-width="2"/>
                    <line x1="12" y1="18" x2="12" y2="22" stroke-width="2"/>
                    <line x1="16" y1="18" x2="16" y2="22" stroke-width="2"/>
                </g>
            </svg>
        `,
        'rain-night': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#93C5FD"/>
                <path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7z M12,15c-1.65,0-3-1.35-3-3s1.35-3,3-3s3,1.35,3,3 S13.65,15,12,15z" fill="#6B7280"/>
                <g fill="#3B82F6">
                    <line x1="8" y1="18" x2="8" y2="22" stroke-width="2"/>
                    <line x1="12" y1="18" x2="12" y2="22" stroke-width="2"/>
                    <line x1="16" y1="18" x2="16" y2="22" stroke-width="2"/>
                </g>
            </svg>
        `,
        'thunderstorm': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#64748B"/>
                <polygon points="11,16 9,20 13,20 11,24 15,18 12,18" fill="#FFD700"/>
            </svg>
        `,
        'snow': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#E2E8F0"/>
                <g fill="#93C5FD">
                    <circle cx="8" cy="18" r="1"/>
                    <circle cx="12" cy="18" r="1"/>
                    <circle cx="16" cy="18" r="1"/>
                    <circle cx="10" cy="20" r="1"/>
                    <circle cx="14" cy="20" r="1"/>
                </g>
            </svg>
        `,
        'mist': `
            <svg viewBox="0 0 24 24">
                <path d="M19.35,10.04C18.67,6.59,15.64,4,12,4C9.11,4,6.6,5.64,5.35,8.04C2.34,8.36,0,10.91,0,14c0,3.31,2.69,6,6,6h13 c2.76,0,5-2.24,5-5C24,12.36,21.95,10.22,19.35,10.04z" fill="#E2E8F0" opacity="0.5"/>
                <line x1="4" y1="12" x2="20" y2="12" stroke="#64748B" stroke-width="2"/>
                <line x1="2" y1="16" x2="18" y2="16" stroke="#64748B" stroke-width="2"/>
                <line x1="6" y1="20" x2="22" y2="20" stroke="#64748B" stroke-width="2"/>
            </svg>
        `
    };
    
    return icons[iconName] || icons['cloudy'];
}


async function fetchWeatherData(city) {
    try {
        showLoading();
        
        const currentResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=hu`
        );
        
        if (!currentResponse.ok) {
            throw new Error('Város nem található');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=hu`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Előrejelzési adatok nem elérhetők');
        }
        
        const forecastData = await forecastResponse.json();
        
        return { current: currentData, forecast: forecastData };
    } catch (error) {
        console.error('Hiba az adatok lekérése során:', error);
        throw error;
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading();
        loadingText.textContent = 'Időjárási adatok betöltése...';
        
        const currentResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=hu`
        );
        
        if (!currentResponse.ok) {
            throw new Error('Helyadatok nem elérhetők');
        }
        
        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=hu`
        );
        
        if (!forecastResponse.ok) {
            throw new Error('Előrejelzési adatok nem elérhetők');
        }
        
        const forecastData = await forecastResponse.json();
        
        return { current: currentData, forecast: forecastData };
    } catch (error) {
        console.error('Hiba az adatok lekérése során:', error);
        throw error;
    }
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('A böngésző nem támogatja a helymeghatározást'));
            return;
        }
        
        loadingText.textContent = 'Helymeghatározás...';
        
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                resolve({ lat: latitude, lon: longitude });
            },
            error => {
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'A helymeghatározás elutasítva. Kérjük, engedélyezze a helymeghatározást a böngésző beállításaiban.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Helyinformáció nem elérhető.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'A helymeghatározás túllépte az időkeretet.';
                        break;
                    default:
                        errorMessage = 'Ismeretlen hiba a helymeghatározás során.';
                        break;
                }
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

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
    
    const dailyForecasts = forecast.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
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
    
    if (weatherChart) {
        weatherChart.destroy();
    }
    
    const labels = hourlyData.map(hour => formatTime(hour.dt));
    const temperatures = hourlyData.map(hour => Math.round(hour.main.temp));
    
    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hőmérséklet (°C)',
                data: temperatures,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function saveToHistory(city) {
    let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    
    history = history.filter(item => 
        item.toLowerCase() !== city.toLowerCase()
    );
    
    history.unshift(city);
    
    if (history.length > 5) {
        history.pop();
    }
    
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

function showLoading() {
    loadingIndicator.style.display = 'flex';
    currentWeatherCard.style.display = 'none';
    forecastSection.style.display = 'none';
    hourlySection.style.display = 'none';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    loadingIndicator.innerHTML = `
        <div style="text-align: center; color: var(--danger-color);">
            <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Hiba</p>
            <p>${message}</p>
            <button id="retryButton" style="margin-top: 1rem; padding: 0.5rem 1rem; background-color: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                Újrapróbálás
            </button>
        </div>
    `;
    
    document.getElementById('retryButton').addEventListener('click', initApp);
}

async function getWeatherData(city) {
    try {
        currentLocationMethod = 'manual';
        const data = await fetchWeatherData(city);
        currentWeatherData = data;
        
        displayCurrentWeather(data);
        displayForecast(data);
        displayHourlyForecast(data);
        saveToHistory(city);
    } catch (error) {
        showError(error.message);
        console.error('Hiba:', error);
    }
}

async function getWeatherByLocation() {
    try {
        currentLocationMethod = 'geolocation';
        const coords = await getCurrentLocation();
        const data = await fetchWeatherByCoords(coords.lat, coords.lon);
        currentWeatherData = data;
        
        displayCurrentWeather(data);
        displayForecast(data);
        displayHourlyForecast(data);
        saveToHistory(data.current.name);
    } catch (error) {
        console.error('Hiba a helymeghatározás során:', error);
        showError(`${error.message} Alapértelmezett város betöltése...`);
        setTimeout(() => {
            getWeatherData('Budapest');
        }, 2000);
    }
}

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

themeToggle.addEventListener('click', toggleTheme);

function initApp() {
    initTheme();
    displayHistory();
    
    getWeatherByLocation();
}

document.addEventListener('DOMContentLoaded', initApp);