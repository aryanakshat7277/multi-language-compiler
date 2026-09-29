import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * Global rate limiter across all incoming HTTP traffic
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 60 * 1000,
  max: config.rateLimitMax || 500,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Compilation rate limiter (CPU intensive) — 30 runs per minute per IP
 */
export const compilationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Execution rate limit exceeded. Please wait before submitting more code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * AI rate limiter — 30 requests per minute per IP (conserves Gemini quota)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI analysis rate limit exceeded. Please wait a moment before requesting another review.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter — 15 login/register attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
