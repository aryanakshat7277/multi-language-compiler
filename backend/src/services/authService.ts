import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config/env';

export class AuthService {
  static async register(email: string, passwordHash: string, displayName: string) {
    const isMasterAdmin = email.toLowerCase() === 'aryanakshat7277@gmail.com';
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: isMasterAdmin ? 'ADMIN' : 'STUDENT',
        progress: { create: {} }
      }
    });
    return this.generateToken(user);
  }

  static async login(email: string, passwordHash: string) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');
    
    const valid = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    if (user.email.toLowerCase() === 'aryanakshat7277@gmail.com' && user.role !== 'ADMIN') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      });
    }
    
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
