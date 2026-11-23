"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const app = (0, app_1.createApp)();
const server = app.listen(env_1.env.PORT, () => {
    console.log(`Campus Connect Backend running on port ${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode.`);
    console.log(`Base API endpoint: http://localhost:${env_1.env.PORT}${env_1.env.API_PREFIX}`);
});
// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing HTTP server gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, closing HTTP server gracefully...');
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
});
