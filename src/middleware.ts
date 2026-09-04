import { defineMiddleware } from 'astro:middleware';
import pc from 'picocolors';

// Override the global console.warn once on the server
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args) => {
  originalWarn(pc.yellow('[Warning]'), ...args);
};
console.error = (...args) => {
  originalError(pc.red('[Error]'), ...args);
};

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
