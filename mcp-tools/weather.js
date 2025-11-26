const https = require('https');

// Fix German umlauts that might be corrupted
function fixUmlauts(str) {
  return str
    .replace(/[?�]/g, match => {
      // Common corrupted umlaut patterns
      return match;
    })
    // Handle common corrupted patterns
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/Ü/g, 'Ue')
    .replace(/Ö/g, 'Oe')
    .replace(/Ä/g, 'Ae')
    .replace(/ß/g, 'ss')
    // Also try to detect broken encoding
    .replace(/\?/g, '');
}

// Convert umlauts to searchable format
function normalizeCity(city) {
  // First try the original
  let normalized = city.trim();
  
  // Replace German umlauts with alternatives for search
  const umlautMap = {
    'ü': 'u', 'Ü': 'U',
    'ö': 'o', 'Ö': 'O', 
    'ä': 'a', 'Ä': 'A',
    'ß': 'ss'
  };
  
  for (const [umlaut, replacement] of Object.entries(umlautMap)) {
    normalized = normalized.replace(new RegExp(umlaut, 'g'), replacement);
  }
  
  // Remove any remaining special/corrupted characters
  normalized = normalized.replace(/[^a-zA-Z0-9\s-]/g, '');
  
  return normalized;
}

// Read input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(input);
    // Support multiple parameter names
    let city = data.city || data.location || data.input || 'Berlin';
    
    console.error('Weather tool called with city:', city);
    
    // Try original city name first
    let geoData = await searchCity(city);
    
    // If not found, try normalized version
    if (!geoData.results || geoData.results.length === 0) {
      const normalizedCity = normalizeCity(city);
      console.error('Trying normalized city:', normalizedCity);
      geoData = await searchCity(normalizedCity);
    }
    
    if (!geoData.results || geoData.results.length === 0) {
      console.log(JSON.stringify({ 
        error: `City "${city}" not found`,
        suggestion: 'Try using the English name or check spelling'
      }));
      return;
    }
    
    await getWeather(geoData.results[0]);
    
  } catch (error) {
    console.log(JSON.stringify({ error: error.message }));
  }
});

async function searchCity(cityName) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`;
  return await fetchJson(geoUrl);
}

async function getWeather(location) {
  const { latitude, longitude, name, country, admin1 } = location;
  
  // Get weather data
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&timezone=auto`;
  
  const weatherData = await fetchJson(weatherUrl);
  const current = weatherData.current;
  
  const weatherCodes = {
    0: 'Clear sky ☀️',
    1: 'Mainly clear 🌤️',
    2: 'Partly cloudy ⛅',
    3: 'Overcast ☁️',
    45: 'Foggy 🌫️',
    48: 'Depositing rime fog 🌫️',
    51: 'Light drizzle 🌧️',
    53: 'Moderate drizzle 🌧️',
    55: 'Dense drizzle 🌧️',
    61: 'Slight rain 🌧️',
    63: 'Moderate rain 🌧️',
    65: 'Heavy rain 🌧️',
    71: 'Slight snow ❄️',
    73: 'Moderate snow ❄️',
    75: 'Heavy snow ❄️',
    80: 'Slight rain showers 🌦️',
    81: 'Moderate rain showers 🌦️',
    82: 'Violent rain showers ⛈️',
    95: 'Thunderstorm ⛈️',
    96: 'Thunderstorm with slight hail ⛈️',
    99: 'Thunderstorm with heavy hail ⛈️'
  };
  
  const region = admin1 ? `, ${admin1}` : '';
  
  const result = {
    location: `${name}${region}, ${country}`,
    temperature: `${current.temperature_2m}°C`,
    feels_like: `${current.apparent_temperature}°C`,
    humidity: `${current.relative_humidity_2m}%`,
    wind_speed: `${current.wind_speed_10m} km/h`,
    precipitation: `${current.precipitation} mm`,
    condition: weatherCodes[current.weather_code] || 'Unknown',
    coordinates: { latitude, longitude }
  };
  
  console.log(JSON.stringify(result));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}
