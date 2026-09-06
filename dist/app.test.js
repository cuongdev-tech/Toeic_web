"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const app_1 = require("./app");
(0, node_test_1.default)('health endpoint reports the API and database status', async () => {
    const server = app_1.app.listen(0);
    try {
        const address = server.address();
        strict_1.default.ok(address && typeof address !== 'string');
        const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
        strict_1.default.equal(response.status, 200);
        const body = await response.json();
        strict_1.default.equal(body.status, 'success');
        strict_1.default.equal(body.database, 'Connected');
    }
    finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
(0, node_test_1.default)('unknown API routes return JSON 404', async () => {
    const server = app_1.app.listen(0);
    try {
        const address = server.address();
        strict_1.default.ok(address && typeof address !== 'string');
        const response = await fetch(`http://127.0.0.1:${address.port}/api/unknown`);
        strict_1.default.equal(response.status, 404);
        const body = await response.json();
        strict_1.default.equal(body.status, 'error');
    }
    finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
