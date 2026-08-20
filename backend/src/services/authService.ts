import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config/env';

export class AuthService {
  static async register(email: string, passwordHash: string, displayName: string) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        progress: { create: {} }
      }
    });
    return this.generateToken(user);
  }

  static async login(email: string, passwordHash: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');
    
    const valid = await bcrypt.compare(passwordHash, user.passwordHash); // NOTE: controller should pass unhashed or this needs adjustment. Actually, controller passes raw password to service.
    if (!valid) throw new Error('Invalid credentials');
    
    return this.generateToken(user);
  }

  static generateToken(user: { id: string; role: string; email: string }): string {
    return jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );
  }
}
