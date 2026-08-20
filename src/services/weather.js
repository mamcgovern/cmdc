const DEFAULT_LOCATION = {
  name: "Ames, IA",
  latitude: 42.0347,
  longitude: -93.62,
};

export const getWeather = async () => {
  const params = new URLSearchParams({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "1",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  if (!response.ok) {
    throw new Error("Unable to load weather.");
  }

  const data = await response.json();

  return {
    location: DEFAULT_LOCATION.name,

    temperature:
      data.current?.temperature_2m ?? null,

    feelsLike:
      data.current?.apparent_temperature ?? null,

    weatherCode:
      data.current?.weather_code ?? null,

    wind:
      data.current?.wind_speed_10m ?? null,

    high:
      data.daily?.temperature_2m_max?.[0] ?? null,

    low:
      data.daily?.temperature_2m_min?.[0] ?? null,

    precipitation:
      data.daily?.precipitation_probability_max?.[0] ??
      null,
  };
};

export const getWeatherLabel = (code) => {
  const labels = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Foggy",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Rain showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorms",
    96: "Thunderstorms",
    99: "Severe thunderstorms",
  };

  return labels[code] || "Current conditions";
};

export const getWeatherIcon = (code) => {
  if (code === 0) {
    return "☀";
  }

  if ([1, 2].includes(code)) {
    return "⛅";
  }

  if (code === 3) {
    return "☁";
  }

  if ([45, 48].includes(code)) {
    return "☁";
  }

  if (
    [
      51,
      53,
      55,
      56,
      57,
      61,
      63,
      65,
      66,
      67,
      80,
      81,
      82,
    ].includes(code)
  ) {
    return "☂";
  }

  if (
    [
      71,
      73,
      75,
      77,
      85,
      86,
    ].includes(code)
  ) {
    return "❄";
  }

  if (
    [95, 96, 99].includes(code)
  ) {
    return "⚡";
  }

  return "○";
};