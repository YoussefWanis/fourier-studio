# 🎛️ Fourier Studio

> **Signal Processing Mixer** > A sophisticated web application for visualizing and mixing image signals in the Frequency Domain using React and Python.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-Fast-purple?logo=vite)
![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)
![Python](https://img.shields.io/badge/Python-FFT-yellow?logo=python)

---

### 📸 Screenshot
<img width="1919" height="984" alt="image" src="https://github.com/user-attachments/assets/9fc4fcd5-7db0-46bd-b304-a8adb912d55a" />


---

## 🚀 Features

### 👁️ Visualization & Interface
* **Multi-View Interface:** Support for 4 simultaneous image inputs with independent viewports.
* **Easy Uploads:** Upload images via the dedicated **Upload Button** or by double-clicking the viewport.
* **Dual-Domain Viewing:** Toggle between **Spatial domain** (Original/Grayscale) and **Frequency domain** (Magnitude/Phase/Real/Imaginary).
* **Interactive Spectrograms:** Drag-and-drop region selection directly on the frequency visualization.

### 🎚️ Advanced Mixing Engine
* **Two Mixing Modes:** Mix via **Magnitude/Phase** or **Real/Imaginary** components.
* **Real-Time Controls:** 8 distinct sliders for precise weight adjustment of each component.
* **Reconstruction:** Real-time Inverse Fourier Transform (IFFT) to see the mixed result immediately.

### 🎯 Frequency Filtering
* **Region Mode:** Customizable High-Pass / Low-Pass filters with adjustable Width, Height, and Position.
* **Linked Positioning:** Synchronize the filter region position across all 4 images with the **Link (🔗)** button.
* **Whole Image Mode:** Instantly switch to processing the entire frequency spectrum.

### ⚡ Performance
* **Python Backend:** Uses `NumPy` and `OpenCV` for accurate mathematical processing (FFT/IFFT).
* **React Frontend:** Component-based architecture with debounce logic for smooth interaction.
* **Live Status:** Visual indicators for backend connectivity and processing states.

---

## 🛠️ Tech Stack

### Frontend
* **React 18** (Vite)
* **Tailwind CSS** (Styling)
* **Lucide React** (Icons)

### Backend
* **Python 3.x**
* **Flask** (API Server)
* **NumPy** (FFT/IFFT Math)
* **OpenCV** (Image Processing)

---

## 📦 Installation & Setup

### 1. Backend Setup
The backend handles all signal processing.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  (Optional) Create a virtual environment:
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # Mac/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install flask flask-cors numpy opencv-python
    ```
4.  Start the server:
    ```bash
    python app.py
    ```
    *The server will start on `http://127.0.0.1:5000`*

### 2. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install Node dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser to the URL shown (usually `http://localhost:5173`).

---

## 📖 Usage Guide

1.  **Upload Images:** * Click the **Upload Icon** or double-click inside a viewport to select an image.
2.  **Visualization:**
    * Use the dropdown in the top-right of each card to switch views (e.g., *FT Magnitude*, *FT Phase*).
3.  **Mixing Signals:**
    * Go to the **Manual Mixer** panel (center).
    * Select mode: **Mag/Phase** or **Real/Imag**.
    * Adjust sliders. The app creates a weighted average of these components.
4.  **Region Filtering:**
    * Select **Region Mode**.
    * Adjust Width/Height sliders.
    * Select **Inner** (Pass) or **Outer** (Reject).
    * **Drag the box** on any "Frequency" view to move the filter.
5.  **Output:**
    * Select Output Port 1 or 2 on the right to view the reconstructed result.

---

## 📂 Project Structure

```text
fourier-studio/
├── backend/
│   ├── app.py                # Flask server & Route handling
│   ├── image_model.py        # FFT/IFFT logic class
│   └── uploads/              # Temp storage
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg       # Cyan Faders Icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageViewport.jsx   # Individual Image Card
│   │   │   ├── MixerControls.jsx   # Sliders & Region Logic
│   │   │   └── OutputViewport.jsx  # Result Display
│   │   ├── App.jsx           # Main Layout & Logic
│   │   ├── config.js         # API URL Configuration
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Tailwind imports
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
