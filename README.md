---

# 🏥 MedSync Platform

Welcome to the **MedSync Platform**, an advanced, full-stack medical synchronization and management system. Designed with modern web technologies, MedSync aims to streamline healthcare operations, facilitate data synchronization, and provide rich, interactive analytics for medical professionals and administrators.

This project was developed as part of a comprehensive academic thesis (as detailed in the included `memoire.pdf` and `cahierdecharge.pdf`), bridging the gap between healthcare needs and cutting-edge software engineering.

---

## 📖 Table of Contents

1. [Project Overview](https://www.google.com/search?q=%23-project-overview)
2. [Key Features](https://www.google.com/search?q=%23-key-features)
3. [Architecture & Tech Stack](https://www.google.com/search?q=%23-architecture--tech-stack)
4. [Project Structure](https://www.google.com/search?q=%23-project-structure)
5. [Prerequisites](https://www.google.com/search?q=%23-prerequisites)
6. [Installation & Setup](https://www.google.com/search?q=%23-installation--setup)
* [Backend Setup](https://www.google.com/search?q=%231-backend-setup)
* [Frontend Setup](https://www.google.com/search?q=%232-frontend-setup)


7. [Running the Application](https://www.google.com/search?q=%23-running-the-application)
8. [Data Visualization & UI](https://www.google.com/search?q=%23-data-visualization--ui)
9. [Academic Documentation](https://www.google.com/search?q=%23-academic-documentation)
10. [Future Enhancements](https://www.google.com/search?q=%23-future-enhancements)
11. [Contributing](https://www.google.com/search?q=%23-contributing)
12. [License](https://www.google.com/search?q=%23-license)

---

## 🚀 Project Overview

The **MedSync Platform** is built to solve the complex challenges of medical data management. By providing a centralized, synchronized hub, it allows healthcare providers to securely store, retrieve, and analyze medical records, appointments, and system metrics.

The application utilizes a decoupled architecture—separating the RESTful Node.js/Express backend from the highly responsive React frontend. This ensures scalability, ease of maintenance, and lightning-fast performance powered by Vite.

---

## ✨ Key Features

* **Centralized Dashboard:** A comprehensive view of critical healthcare metrics and synchronization statuses.
* **Interactive Analytics:** Rich, real-time data visualization using **Recharts** (Pie charts, bar charts, etc.) to monitor patient demographics, appointment statistics, and system health.
* **Smooth Animations:** Integrated with **Framer Motion** to provide a fluid, modern, and highly intuitive User Experience (UX).
* **Robust REST API:** A secure and optimized backend powered by **Express.js** to handle data transactions seamlessly.
* **Lightweight Database:** Uses **SQLite** (via `better-sqlite3`) for zero-configuration, high-performance, and persistent local data storage.
* **Cross-Origin Resource Sharing (CORS):** Fully configured to securely connect the frontend and backend servers.
* **Request Logging:** Utilizes **Morgan** for detailed HTTP request logging, aiding in development and debugging.

---

## 🛠 Architecture & Tech Stack

### Frontend (Client-Side)

* **Framework:** [React.js](https://www.google.com/search?q=https://reactjs.org/)
* **Build Tool:** [Vite](https://www.google.com/search?q=https://vitejs.dev/) (For ultra-fast Hot Module Replacement and optimized builds)
* **Animations:** [Framer Motion](https://www.google.com/search?q=https://www.framer.com/motion/) (For complex layout animations and transitions)
* **Data Visualization:** [Recharts](https://www.google.com/search?q=https://recharts.org/) (Declarative charting library built on React components)
* **Styling:** Standard CSS (`App.css`, `index.css`) with flexible, responsive design principles.

### Backend (Server-Side)

* **Runtime:** [Node.js](https://www.google.com/search?q=https://nodejs.org/)
* **Framework:** [Express.js](https://www.google.com/search?q=https://expressjs.com/) (Routing and middleware management)
* **Database:** [SQLite](https://www.google.com/search?q=https://www.sqlite.org/) (Serverless SQL database engine)
* **DB Driver:** `sqlite3` / `better-sqlite3`
* **Middlewares:** `cors` (Security), `body-parser` (Payload extraction), `morgan` (Logging).

---

## 📂 Project Structure

The repository is neatly organized into a mono-repo structure, containing both the frontend and backend, alongside crucial project documentation.

```text
MedSync-Platforme/
│
├── backend/                   # Node.js & Express API Server
│   ├── src/
│   │   ├── server.js          # Entry point for the Express server
│   │   └── db.js              # SQLite database configuration and connection
│   ├── medsync.sqlite         # Local SQLite database file
│   ├── package.json           # Backend dependencies and scripts
│   └── node_modules/          # Backend dependencies
│
├── frontend/                  # Vite + React Client Application
│   ├── public/                # Static assets (Favicons, SVG icons)
│   ├── src/
│   │   ├── assets/            # Images and SVGs (hero.png, react.svg, etc.)
│   │   ├── App.jsx            # Main React application component (contains Recharts & Framer Motion logic)
│   │   ├── main.jsx           # React DOM rendering entry point
│   │   ├── App.css            # Application-specific styling
│   │   └── index.css          # Global styling resets
│   ├── index.html             # HTML template
│   ├── vite.config.js         # Vite configuration file
│   ├── eslint.config.js       # Linter configuration
│   └── package.json           # Frontend dependencies and scripts
│
├── cahierdecharge.pdf         # Project specifications and requirements document
├── memoire.pdf                # Master's/Graduation Thesis detailing the project
└── prompt.txt                 # AI/Context prompt definitions

```

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your local machine:

* **Node.js:** (v16.0.0 or higher recommended) - [Download Here](https://www.google.com/search?q=https://nodejs.org/)
* **npm:** (Node Package Manager, comes with Node.js)
* **Git:** For version control.
* **SQLite Viewer (Optional):** A tool like [DB Browser for SQLite](https://www.google.com/search?q=https://sqlitebrowser.org/) to inspect the `medsync.sqlite` file manually.

---

## 💻 Installation & Setup

Because this project consists of two separate environments (Frontend and Backend), you will need to open **two terminal windows or tabs**.

### 1. Backend Setup

Open your first terminal and navigate to the backend directory:

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/amnamine/medsync-platforme.git
cd MedSync-Platforme

# Navigate to the backend directory
cd backend

# Install all backend dependencies (Express, SQLite, CORS, etc.)
npm install

```

### 2. Frontend Setup

Open your second terminal and navigate to the frontend directory:

```bash
# From the root of the project, navigate to the frontend directory
cd frontend

# Install all frontend dependencies (React, Vite, Framer Motion, Recharts)
npm install

```

---

## 🚀 Running the Application

Once both environments have their dependencies installed, you can start the development servers.

### Start the Backend Server

In your backend terminal:

```bash
node src/server.js
# Or if you have a dev script configured in package.json:
# npm run dev

```

*The server will typically start on `http://localhost:5000` or the port defined in your environment/server file.*

### Start the Frontend Server

In your frontend terminal:

```bash
npm run dev

```

*Vite will start the development server quickly. Open your browser and navigate to the URL provided in the terminal (usually `http://localhost:5173`).*

---

## 📊 Data Visualization & UI

The frontend of **MedSync** goes beyond standard tables. The `App.jsx` file implements sophisticated UI elements:

* **Framer Motion (`<motion.div>`)**: Used to create smooth entrance animations, hovering effects, and seamless transitions between different views of the medical data dashboard.
* **Recharts (`<PieChart>`, `<Pie>`, `<Cell>`, `<Tooltip>`)**: Implemented to give administrators a bird's-eye view of statistics. The charts are fully responsive via `<ResponsiveContainer>` and adapt to different screen sizes.

---

## 📚 Academic Documentation

This project is the technical culmination of an academic study. For a deep understanding of the theoretical background, architectural decisions, and functional requirements, please refer to the attached PDFs in the root directory:

1. **`cahierdecharge.pdf` (Requirements Specification):** Contains the exhaustive list of functional and non-functional requirements, use cases, and initial system modeling.
2. **`memoire.pdf` (Thesis Document):**
Details the problem statement within the medical synchronization space, the state of the art, the technical choices made (React + Node + SQLite), and the final evaluation of the platform.

---

## 🔮 Future Enhancements

While the current platform serves as a robust foundation, potential future roadmaps include:

* **Authentication & Authorization:** Implementing JWT (JSON Web Tokens) for role-based access control (Doctors, Admins, Patients).
* **Cloud Database Migration:** Migrating from SQLite to PostgreSQL or PostgreSQL for horizontal scalability.
* **WebSocket Integration:** Utilizing Socket.io for real-time live synchronization of medical records across multiple connected clients without refreshing.
* **Dockerization:** Adding `Dockerfile` and `docker-compose.yml` to containerize the frontend and backend for one-click deployments.

---

## 🤝 Contributing

Contributions, issues, and feature requests are highly welcome!
If you would like to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is created by **Amnamine**. All rights reserved. Please refer to the repository owner or the `memoire.pdf` thesis constraints regarding the redistribution, commercial use, or modification of this academic project.

---

*Designed and built for the future of synchronized medical platforms.*
