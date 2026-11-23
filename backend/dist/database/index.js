"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepository = getRepository;
exports.setRepository = setRepository;
const env_1 = require("../config/env");
const memoryDb_1 = require("./memoryDb");
const pgRepository_1 = require("./pgRepository");
let repositoryInstance;
function getRepository() {
    if (!repositoryInstance) {
        if (env_1.env.NODE_ENV === 'test') {
            repositoryInstance = new memoryDb_1.MemoryRepository();
        }
        else {
            // In production or development, use PgRepository by default,
            // but fallback to MemoryRepository if DB is not configured or in memory test mode
            repositoryInstance = new pgRepository_1.PgRepository();
        }
    }
    return repositoryInstance;
}
function setRepository(repo) {
    repositoryInstance = repo;
}
