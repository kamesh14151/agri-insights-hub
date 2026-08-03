# Agri Insights Hub

Agri AI – Full-Stack Agricultural Intelligence Platform

Build a production-ready web app called Agri AI with a premium, minimal UI inspired by Y Combinator's website: cream/off-white background (#F5F2EB), large serif display typography, clean whitespace, and a confident editorial layout.

Core Features to Build:

AI Plant Analysis – Upload a plant image; display disease detection results and treatment recommendations in a clean card layout.

Interactive Map – Integrate Leaflet.js with OpenStreetMap tiles (free, no API key needed). Let users draw polygons over land areas using Leaflet.draw and trigger an analysis panel showing soil quality, climate, and crop potential.

Multi-language Support – Language switcher in the navbar for English, Hindi, Punjabi, Tamil, Telugu, and Marathi. All UI strings should update accordingly.

Weather Integration – Fetch and display real-time agricultural weather (temperature, humidity, rainfall, UV index) using the Open-Meteo API (free, no key needed).

Smart Chatbot – Floating chat widget powered by an AI API. Context-aware agricultural advisor. Smooth open/close animation, chat history, typing indicator.

Land Analysis Panel – After drawing a polygon on the map, show a sidebar with: soil type, recommended crops, water needs, and risk factors.

Design System:

Background: #F5F2EB (warm cream)

Accent: #2D6A2D (deep agricultural green)

Typography: Playfair Display for headings, Inter for body

Layout: Centered max-width container (1200px), generous padding, subtle card borders (1px solid #E0DDD4)

Navbar: Minimal, logo left, nav links center, language switcher + CTA right

Hero: Large serif headline (like YC's "YC turns builders into formidable founders"), subtext, two CTA buttons

Sections flow top to bottom: Hero → Features → Plant Analysis → Map → Weather → Chatbot

Mobile responsive throughout

Tech Stack:

React + Tailwind CSS

Leaflet.js + Leaflet.draw + OpenStreetMap tiles (no API key required)

Open-Meteo API for weather (no key needed)

Anthropic or OpenAI API for chatbot and plant analysis (use placeholder key, mark clearly)

Lucide React for icons

UX Requirements:

Smooth scroll between all sections

Loading skeletons for all async data (weather fetch, plant analysis, land analysis)

Toast notifications for: image upload success, analysis complete, drawing saved, language switched

All placeholder/mock content must use realistic agricultural data — real crop names, real disease names (e.g. "Powdery Mildew", "Leaf Blight"), real soil types (e.g. "Black Cotton Soil", "Red Loamy"), real weather ranges — no lorem ipsum anywhere

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5b882062-9090-46d3-9f7f-624783218095).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
