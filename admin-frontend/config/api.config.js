"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_CONFIG = void 0;
var isDevelopment = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
var BASE_URL = isDevelopment
    ? 'http://localhost:5002'
    : 'https://vtu-application.onrender.com';
exports.API_CONFIG = {
    BASE_URL: BASE_URL,
    ADMIN_AUTH: "".concat(BASE_URL, "/api/admin/auth"),
    ADMIN: "".concat(BASE_URL, "/api/admin"),
    ADMIN_MANAGEMENT: "".concat(BASE_URL, "/api/admin/management"),
    ADMIN_PROFILE: "".concat(BASE_URL, "/api/admin/profile"), // Add this
};
