import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import Modal from "react-modal";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

const API_KEY = "YOUR_OPENTRIPMAP_API_KEY";
const WEATHER_API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
const ROUTING_API_KEY = "YOUR_OPENROUTESERVICE_API_KEY";
const BASE_URL = "https://api.opentripmap.com/0.1/en/places/city";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const ROUTING_URL =
  "https://api.openrouteservice.org/v2/directions/foot-walking";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search";

const TravelApp = () => {
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("1");
  const [vibe, setVibe] = useState("Sightseeing");
  const [budget, setBudget] = useState("Mid-range");
  const [intensity, setIntensity] = useState("Chill");
  const [hotel, setHotel] = useState("");
  const [hotelCoords, setHotelCoords] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [tipsModalOpen, setTipsModalOpen] = useState(false);
  const [route, setRoute] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const getWeather = async (city) => {
    try {
      const response = await fetch(
        `${WEATHER_URL}?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = await response.json();
      setWeather({
        temp: data.main.temp,
        condition: data.weather[0].main,
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
      });
    } catch (error) {
      console.error("Error fetching weather:", error);
    }
  };

  const geocodeHotel = async () => {
    if (!hotel) return null;
    try {
      const response = await fetch(
        `${GEOCODE_URL}?q=${encodeURIComponent(
          hotel + " " + destination
        )}&format=json&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        return { lat: parseFloat(lat), lon: parseFloat(lon) };
      }
    } catch (error) {
      console.error("Error geocoding hotel:", error);
    }
    return null;
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getPlaces = async (city, category) => {
    try {
      const response = await fetch(
        `${BASE_URL}?name=${city}&kinds=${category}&apikey=${API_KEY}`
      );
      const data = await response.json();
      let allPlaces = data.features
        ? data.features.map((place) => ({
            name: place.properties.name,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }))
        : [];

      if (intensity === "Chill" && hotelCoords) {
        allPlaces.sort((a, b) => {
          const distA = getDistance(
            hotelCoords.lat,
            hotelCoords.lon,
            a.lat,
            a.lon
          );
          const distB = getDistance(
            hotelCoords.lat,
            hotelCoords.lon,
            b.lat,
            b.lon
          );
          return distA - distB;
        });
        return allPlaces.slice(0, 3);
      }
      if (intensity === "Half and Half") return allPlaces.slice(0, 6);
      return allPlaces.slice(0, 10);
    } catch (error) {
      console.error("Error fetching places:", error);
      return [];
    }
  };

  const generateItinerary = async () => {
    if (!destination) {
      alert("Please enter a destination.");
      return;
    }

    const category = vibe === "Foodie" ? "restaurants" : "tourist_attractions";
    const hotelLocation = await geocodeHotel();
    setHotelCoords(hotelLocation);
    await getWeather(destination);
    const places = await getPlaces(destination, category);
    setItinerary({ city: destination, places, hotel, vibe, intensity });
  };

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        🗺️ Quick Travel Itinerary
      </h1>

      <label>Destination City:</label>
      <input
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="e.g. Rome"
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      />

      <label>Hotel (Optional):</label>
      <input
        value={hotel}
        onChange={(e) => setHotel(e.target.value)}
        placeholder="Hotel name or address"
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      />

      <label>Duration (1–4 days):</label>
      <select
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      >
        {[1, 2, 3, 4].map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>

      <label>Vibe:</label>
      <select
        value={vibe}
        onChange={(e) => setVibe(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      >
        <option>Sightseeing</option>
        <option>Foodie</option>
        <option>Party</option>
        <option>Wellness</option>
      </select>

      <label>Itinerary Intensity:</label>
      <select
        value={intensity}
        onChange={(e) => setIntensity(e.target.value)}
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      >
        <option>Chill</option>
        <option>Half and Half</option>
        <option>Action Packed</option>
      </select>

      <button
        onClick={generateItinerary}
        style={{
          backgroundColor: "#34a853",
          color: "white",
          border: "none",
          padding: "0.75rem 1.5rem",
          borderRadius: "999px",
          cursor: "pointer",
        }}
      >
        ✨ Generate Itinerary
      </button>

      {!itinerary && (
        <p style={{ marginTop: "1rem", color: "#777" }}>
          Fill in the info above and hit generate to build your itinerary.
        </p>
      )}
    </div>
  );
};

export default TravelApp;
