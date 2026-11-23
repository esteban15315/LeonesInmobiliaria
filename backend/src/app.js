require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { opciones: opcionesValidacion } = require('./config/validacionPoligono');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
// Detrás de un proxy (Render, Railway…) req.ip sería el del proxy y el límite de uso afectaría a todos por igual:
// TRUST_PROXY = nº de proxies delante de la app (1 en Render y Railway).
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
// CORS_ORIGIN (opcional, separado por comas): solo esos orígenes pueden llamar a la API desde un navegador.
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) } : undefined));
// Límite de tamaño propio para la validación pública de polígonos (debe ir antes del parser global).
app.use('/api/poligonos', express.json({ limit: opcionesValidacion().maxBytes }));
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
