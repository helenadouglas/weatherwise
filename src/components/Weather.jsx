import React, { useEffect, useRef, useState } from "react";
import "./Weather.css";

import search_icon from "../assets/search.png";
import clear_icon from "../assets/clear.png";
import cloud_icon from "../assets/cloud.png";
import drizzle_icon from "../assets/drizzle.png";
import humidity_icon from "../assets/humidity.png";
import rain_icon from "../assets/rain.png";
import snow_icon from "../assets/snow.png";
import wind_icon from "../assets/wind.png";

const Weather = () => {
    const inputRef = useRef();
    const [weatherData, setWeatherData] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [units, setUnits] = useState("metric");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [recent, setRecent] = useState([]);

    const allIcons = {
        "01d": clear_icon,
        "01n": clear_icon,
        "02d": cloud_icon,
        "02n": cloud_icon,
        "03d": cloud_icon,
        "03n": cloud_icon,
        "04d": cloud_icon,
        "04n": cloud_icon,
        "09d": rain_icon,
        "09n": rain_icon,
        "10d": rain_icon,
        "10n": rain_icon,
        "13d": snow_icon,
        "13n": snow_icon,
        "50d": drizzle_icon,
        "50n": drizzle_icon,
    };

    const unitSymbol = units === "metric" ? "°C" : "°F";
    const windUnit = units === "metric" ? "m/s" : "mph";

    const saveRecent = (city) => {
        if (!city) return;
        const next = [city, ...recent.filter((c) => c.toLowerCase() !== city.toLowerCase())].slice(0, 6);
        setRecent(next);
        try {
            localStorage.setItem("recentCities", JSON.stringify(next));
        } catch {}
    };

    const mapCurrent = (data) => {
        const iconCode = data?.weather?.[0]?.icon;
        return {
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            tempMin: Math.round(data.main.temp_min),
            tempMax: Math.round(data.main.temp_max),
            description: data.weather?.[0]?.description ?? "—",
            condition: data.weather?.[0]?.main?.toLowerCase() ?? "clear",
            location: `${data.name}${data.sys?.country ? ", " + data.sys.country : ""}`,
            icon: allIcons[iconCode] || clear_icon,
            sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000) : null,
            sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000) : null,
            isNight: iconCode?.endsWith("n") ?? false,
        };
    };

    const mapForecast = (list) => {
        if (!Array.isArray(list)) return [];
        const byDay = {};
        for (const item of list) {
            const d = new Date(item.dt * 1000);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const hour = d.getHours();
            const score = Math.abs(12 - hour);
            if (!byDay[key] || score < byDay[key].score) byDay[key] = { item, score };
        }
        return Object.values(byDay)
            .map(({ item }) => item)
            .slice(0, 5)
            .map((it) => {
                const d = new Date(it.dt * 1000);
                const iconCode = it.weather?.[0]?.icon;
                return {
                    day: d.toLocaleDateString(undefined, { weekday: "short" }),
                    temp: Math.round(it.main.temp),
                    description: it.weather?.[0]?.main ?? "—",
                    icon: allIcons[iconCode] || clear_icon,
                };
            });
    };

    const buildThemeClass = (data) => {
        if (!data) return "theme-clear";
        const base = data.condition || "clear"; // clear, clouds, rain, snow, drizzle, mist, thunderstorm
        const night = data.isNight ? " night" : "";
        switch (base) {
            case "rain":
            case "drizzle":
            case "thunderstorm":
                return "theme-rain" + night;
            case "snow":
                return "theme-snow" + night;
            case "clouds":
            case "mist":
            case "fog":
                return "theme-clouds" + night;
            default:
                return "theme-clear" + night;
        }
    };

    const fetchByCity = async (city) => {
        if (!city) {
            alert("Please enter a city name!");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            const base = "https://api.openweathermap.org/data/2.5";
            const key = import.meta.env.VITE_APP_ID;
            const q = encodeURIComponent(city);
            const currentUrl = `${base}/weather?q=${q}&units=${units}&appid=${key}`;
            const forecastUrl = `${base}/forecast?q=${q}&units=${units}&appid=${key}`;

            const [curRes, foreRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
            const curData = await curRes.json();
            const foreData = await foreRes.json();

            if (!curRes.ok) throw new Error(curData?.message || "Failed to fetch current weather");
            if (!foreRes.ok) throw new Error(foreData?.message || "Failed to fetch forecast");

            setWeatherData(mapCurrent(curData));
            setForecast(mapForecast(foreData.list));
            saveRecent(city);
        } catch (e) {
            setWeatherData(null);
            setForecast([]);
            setError(e?.message || "Something went wrong while fetching weather data.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchByCoords = async (lat, lon) => {
        setIsLoading(true);
        setError("");
        try {
            const base = "https://api.openweathermap.org/data/2.5";
            const key = import.meta.env.VITE_APP_ID;
            const currentUrl = `${base}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${key}`;
            const forecastUrl = `${base}/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${key}`;

            const [curRes, foreRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
            const curData = await curRes.json();
            const foreData = await foreRes.json();

            if (!curRes.ok) throw new Error(curData?.message || "Failed to fetch current weather");
            if (!foreRes.ok) throw new Error(foreData?.message || "Failed to fetch forecast");

            setWeatherData(mapCurrent(curData));
            setForecast(mapForecast(foreData.list));
            saveRecent(curData?.name);
        } catch (e) {
            setWeatherData(null);
            setForecast([]);
            setError(e?.message || "Location lookup failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchClick = () => fetchByCity(inputRef.current?.value?.trim());
    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleSearchClick();
    };
    const toggleUnits = () => setUnits((u) => (u === "metric" ? "imperial" : "metric"));
    const useMyLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported in this browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                fetchByCoords(latitude, longitude);
            },
            (err) => setError(err?.message || "Unable to get your location."),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("recentCities") || "[]");
            if (Array.isArray(saved)) setRecent(saved);
        } catch {}
        fetchByCity("Oslo");
    }, []);

    useEffect(() => {
        if (weatherData?.location) {
            const city = weatherData.location.split(",")[0];
            fetchByCity(city);
        }
    }, [units]);

    const themeClass = buildThemeClass(weatherData);

    return (
        <div className={`weather card ${themeClass}`}>
            <div className="toolbar">
                <div className="search-bar">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search city..."
                        onKeyDown={handleKeyDown}
                        aria-label="Search city"
                    />
                    <img src={search_icon} alt="Search" onClick={handleSearchClick} />
                </div>
                <div className="toolbar-actions">
                    <button className="btn" onClick={toggleUnits}>
                        {units === "metric" ? "°C" : "°F"}
                    </button>
                    <button className="btn ghost" onClick={useMyLocation}>
                        Use my location
                    </button>
                </div>
            </div>

            {recent.length > 0 && (
                <div className="recent-chips">
                    {recent.map((city) => (
                        <button key={city} className="chip" onClick={() => fetchByCity(city)}>
                            {city}
                        </button>
                    ))}
                </div>
            )}

            {isLoading && <div className="loader" aria-live="polite" />}

            {error && !isLoading && (
                <div className="error" role="alert">
                    {error}
                </div>
            )}

            {weatherData && !isLoading && (
                <>
                    <img src={weatherData.icon} alt="Weather" className="weather-icon" />
                    <p className="temperature">{weatherData.temperature}{unitSymbol}</p>
                    <p className="location">{weatherData.location}</p>
                    <p className="description">{weatherData.description}</p>

                    <div className="mini-stats">
                        <div className="pill">Feels like: <strong>{weatherData.feelsLike}{unitSymbol}</strong></div>
                        <div className="pill">Min: <strong>{weatherData.tempMin}{unitSymbol}</strong></div>
                        <div className="pill">Max: <strong>{weatherData.tempMax}{unitSymbol}</strong></div>
                    </div>

                    <div className="weather-data">
                        <div className="col">
                            <img src={humidity_icon} alt="Humidity" />
                            <div>
                                <p>{weatherData.humidity} %</p>
                                <span>Humidity</span>
                            </div>
                        </div>
                        <div className="col">
                            <img src={wind_icon} alt="Wind" />
                            <div>
                                <p>{weatherData.windSpeed} {windUnit}</p>
                                <span>Wind</span>
                            </div>
                        </div>
                    </div>

                    {forecast.length > 0 && (
                        <div className="forecast">
                            {forecast.map((f, i) => (
                                <div key={i} className="forecast-item">
                                    <span className="day">{f.day}</span>
                                    <img src={f.icon} alt={f.description} />
                                    <span className="temp">{f.temp}{unitSymbol}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Weather;