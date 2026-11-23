"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
function validateRequest(schemas) {
    return async (req, res, next) => {
        const errors = [];
        if (schemas.body) {
            const parsed = schemas.body.safeParse(req.body);
            if (!parsed.success) {
                for (const issue of parsed.error.issues) {
                    errors.push({
                        location: 'body',
                        field: issue.path.join('.'),
                        message: issue.message,
                    });
                }
            }
            else {
                req.body = parsed.data; // Strips unknown properties to prevent mass assignment
            }
        }
        if (schemas.query) {
            const parsed = schemas.query.safeParse(req.query);
            if (!parsed.success) {
                for (const issue of parsed.error.issues) {
                    errors.push({
                        location: 'query',
                        field: issue.path.join('.'),
                        message: issue.message,
                    });
                }
            }
            else {
                req.query = parsed.data;
            }
        }
        if (schemas.params) {
            const parsed = schemas.params.safeParse(req.params);
            if (!parsed.success) {
                for (const issue of parsed.error.issues) {
                    errors.push({
                        location: 'params',
                        field: issue.path.join('.'),
                        message: issue.message,
                    });
                }
            }
            else {
                req.params = parsed.data;
            }
        }
        if (errors.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'The submitted request payload failed validation criteria.',
                    details: errors,
                },
            });
        }
        next();
    };
}
