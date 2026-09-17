import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

// Global baseline rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 60 * 1000,
  max: config.rateLimitMax || 300,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict code execution rate limiter (prevents process exhaustion)
export const executionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 executions per minute per IP
  message: { error: 'Execution rate limit exceeded (maximum 30 runs per minute). Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter (protects login/register against brute-force)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Code intelligence rate limiter (AST, similarity, metrics)
export const analysisRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Analysis rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});
