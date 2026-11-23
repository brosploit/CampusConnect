"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const securityHeaders_1 = require("./middleware/securityHeaders");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_controller_1 = require("./modules/auth/auth.controller");
const zones_controller_1 = require("./modules/zones/zones.controller");
const readings_controller_1 = require("./modules/readings/readings.controller");
const monitoring_controller_1 = require("./modules/monitoring/monitoring.controller");
const issues_controller_1 = require("./modules/issues/issues.controller");
const admin_controller_1 = require("./modules/admin/admin.controller");
function createApp() {
    const app = (0, express_1.default)();
    // 1. Trust Proxy Configuration (for correct client IP extraction behind reverse proxy)
    app.set('trust proxy', 1);
    // 2. Correlation ID & Security Headers
    app.use(errorHandler_1.correlationIdMiddleware);
    app.use(securityHeaders_1.securityHeaders);
    app.use(securityHeaders_1.corsMiddleware);
    // 3. Body parsers with strict size limits
    app.use((0, cookie_parser_1.default)(env_1.env.COOKIE_SECRET));
    app.use(express_1.default.json({ limit: '100kb' }));
    app.use(express_1.default.urlencoded({ extended: false, limit: '100kb' }));
    // 4. Global Anti-CSRF protection for cookie-authenticated browser sessions
    app.use(securityHeaders_1.csrfProtection);
    // 5. General rate limiting for all endpoints
    const generalLimiter = rateLimiter_1.RateLimiter.create({
        max: env_1.env.RATE_LIMIT_GENERAL_MAX,
        windowMs: env_1.env.RATE_LIMIT_GENERAL_WINDOW_MS,
        keyPrefix: 'gen',
    });
    app.use(generalLimiter);
    // 6. Public Health Check (no internal server/DB schema details exposed)
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'campus-connect-api',
            timestamp: new Date().toISOString(),
        });
    });
    // 7. API Version 1 Routes
    const v1 = express_1.default.Router();
    v1.use('/auth', auth_controller_1.authRouter);
    v1.use('/campuses', zones_controller_1.campusesRouter);
    v1.use('/zones', zones_controller_1.zonesRouter);
    v1.use('/readings', readings_controller_1.readingsRouter);
    v1.use('/monitoring', monitoring_controller_1.monitoringRouter);
    v1.use('/issues', issues_controller_1.issuesRouter);
    v1.use('/admin', issues_controller_1.adminIssuesRouter);
    v1.use('/admin', admin_controller_1.adminRouter);
    app.use(env_1.env.API_PREFIX, v1);
    // 8. 404 Handler for undefined routes
    app.use((req, res) => {
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: 'The requested API route does not exist.',
                requestId: req.headers['x-request-id'],
            },
        });
    });
    // 9. Central Error Handling Middleware
    app.use(errorHandler_1.errorHandler);
    return app;
}
