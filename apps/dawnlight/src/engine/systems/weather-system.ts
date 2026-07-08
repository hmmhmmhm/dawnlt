import type { Weather } from '../../types/game-state'

export interface WeatherState {
  weather: Weather
  weatherTime: number
}

export function updateWeather(currentWeather: Weather, currentTime: number, deltaTime: number): WeatherState {
  let weatherTime = currentTime - deltaTime * 1.2
  let weather = currentWeather

  if (weatherTime <= 0) {
    // Change weather
    const rand = Math.random()
    if (rand < 0.7) {
      weather = 'clear'
    } else if (rand < 0.85) {
      weather = 'rain'
    } else {
      weather = 'snow'
    }
    // Duration: 400-800 game minutes (approx 1/3 to 2/3 day)
    weatherTime = 400 + Math.random() * 400
  }

  return { weather, weatherTime }
}

export function getWeatherName(weather: Weather): string {
  switch (weather) {
    case 'clear':
      return 'Clear'
    case 'rain':
      return 'Rain'
    case 'snow':
      return 'Snow'
    default:
      return weather
  }
}
