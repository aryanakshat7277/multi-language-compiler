import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * Helper to generate rate limit key prioritizing authenticated user ID over shared IP
 */
const getUserOrIpKey = (req: any): string => {
  if (req.user?.id) return `user_${req.user.id}`;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ipList = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return `ip_${ipList[0].trim()}`;
  }
  return `ip_${req.ip || req.socket?.remoteAddress || 'unknown'}`;
};

/**
 * Global rate limiter across all incoming HTTP traffic (5,000 req/min headroom)
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 60 * 1000,
  max: config.rateLimitMax || 5000,
  keyGenerator: getUserOrIpKey,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Compilation rate limiter (CPU intensive) — 45 runs per minute per user/IP
 */
export const compilationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  keyGenerator: getUserOrIpKey,
  message: { error: 'Execution rate limit exceeded. Please wait before submitting more code.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const executionRateLimiter = compilationRateLimiter;

/**
 * AI rate limiter — 30 requests per minute per user/IP
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: getUserOrIpKey,
  message: { error: 'AI analysis rate limit exceeded. Please wait a moment before requesting another review.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter — 30 login/register attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ipList = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      return ipList[0].trim();
    }
    return req.ip || 'auth_ip';
  },
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Code intelligence rate limiter (AST, similarity, metrics)
 */
export const analysisRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: getUserOrIpKey,
  message: { error: 'Analysis rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

