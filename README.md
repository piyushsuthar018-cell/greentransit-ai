# 🌿 GreenTransit AI — SDG 11 & SDG 13 Sustainable Mobility Chatbot

**GreenTransit AI** is an intelligent, full-stack urban mobility and climate assistant built to accelerate **UN SDG 11 (Sustainable Cities and Communities - Target 11.2)** and **UN SDG 13 (Climate Action - Target 13.2)**.

The system performs **real-time road routing, live Google Maps analysis, dynamic multi-modal fare calculations, and objective public transit feasibility evaluation** without pre-biased suggestions.

---

## 🚀 Key Features

- 📍 **Real-Time Geocoding & Road Distances:** Geocodes any custom origin and destination (e.g., *Gota to Science City*, *Silver Oak to Rabari Colony*, *Connaught Place to Cyber City*) and calculates real-world driving kilometers and arterial corridors.
- 🚇 **Objective Transit Feasibility (No Biased Metro Suggestions):**
  - Evaluates whether an operational Metro station is **actually close and feasible** for the specific corridor.
  - If Metro is far, it explicitly states **Metro Not Feasible** and evaluates direct **Municipal Bus (BRTS/AMTS)** or road transit.
  - If Metro is viable, it details the **Hybrid Metro + Feeder Auto** path.
- 💰 **Dynamic Real-World Transport Pricing (INR ₹):**
  - **Auto-Rickshaw (CNG / Apps):** Base + km meter fare, split dynamically by passenger count (capacity: 3 pax; multi-auto scaling for groups).
  - **Cabs (Uber Go / Ola Mini):** AC door-to-door comfort, split across up to 4 passengers.
  - **Bike Taxi (Rapido Bike / Uber Moto):** Budget ride calculated strictly for solo commuters (flagged unavailable if >1 pax).
  - **Public Transit:** Real fare per passenger.
- 🗺️ **Live Google Maps Integration:** Direct one-click link to view real-time traffic and transit directions on Google Maps.
- 🌱 **SDG Carbon Calculator & Offsets:** Quantifies emissions in kg CO2 per mode against private combustion cars.
- ⚡ **Mandatory Arena Evaluator API (`POST /chat`):** Strictly compliant with hackathon evaluation standards (sub-50ms latency, multi-key JSON response payload).

---

## 📡 Mandatory Evaluator API Contract

- **Method:** `POST`
- **Route:** `/chat`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "message": "From Silver Oak to Rabari Colony for 2 people"
  }
  ```
- **Response Format:**
  ```json
  {
    "status": "success",
    "response": "### 🚦 Route & Price Analysis...",
    "message": "### 🚦 Route & Price Analysis...",
    "reply": "### 🚦 Route & Price Analysis...",
    "carbon_saved_kg": 3.26,
    "mode_suggested": "Hybrid Metro + Feeder",
    "sdg_impact": ["SDG 11.2 (Sustainable Transit)", "SDG 13.2 (Climate Action)"],
    "route_data": {
      "origin": "Silver Oak",
      "destination": "Rabari Colony",
      "distanceKm": 19.5,
      "passengers": 2,
      "metroFeasible": true,
      "googleMapsUrl": "https://www.google.com/maps/dir/?...",
      "options": [...]
    }
  }
  ```

---

## 🛠️ Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Chatbot_project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

5. **Run the Automated Evaluator Test Suite:**
   ```bash
   npm test
   ```

---

## ☁️ Deployment on Vercel

1. Install Vercel CLI or link with GitHub:
   ```bash
   npx vercel
   ```
2. Add your `GEMINI_API_KEY` in the Vercel Dashboard under **Project Settings ➔ Environment Variables**.
3. Deploy directly via GitHub commits.

---

## 📜 License
MIT License. Built for Sustainable Mobility Hackathon.
