import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository, userRepository } from '@/modules/auth/user.repository';
import {
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UserResponse,
  VerifyOTPInput,
} from '@/modules/auth/auth.schema';
import { AppError } from '@/utils/error.response';
import { User } from '@/modules/auth/models/user.model';
import { generateOTP, sendOTPEmail } from '@/utils/email';
import { RoleCode } from '@/constants/rbac';


export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = userRepository;
  }

  
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { name, email, password, phone } = input;

    
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(400, 'Email đã được sử dụng');
    }

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    const newUser = await this.userRepo.create({
      name,
      email,
      password: hashedPassword,
      phone,
    });
    const userWithDefaultRole = await this.userRepo.assignRole(newUser.idUser, RoleCode.USER);
    const responseUser = userWithDefaultRole || newUser;

    
    const tokens = this.generateTokens(responseUser.idUser);

    return {
      user: this.toUserResponse(responseUser),
      ...tokens,
    };
  }

  
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    
    const user = await this.userRepo.findByEmailWithRolesAndPermissions(email);
    if (!user) {
      throw new AppError(401, 'Email hoặc mật khẩu không chính xác');
    }

    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Email hoặc mật khẩu không chính xác');
    }

    
    const responseUser = await this.ensureDefaultUserRole(user);
    const tokens = this.generateTokens(responseUser.idUser);

    return {
      user: this.toUserResponse(responseUser),
      ...tokens,
    };
  }

  
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
      }

      const decoded = jwt.verify(refreshToken, secret) as { userId: string };
      
      
      const user = await this.userRepo.findById(decoded.userId);
      if (!user) {
        throw new AppError(401, 'User không tồn tại');
      }

      
      return this.generateTokens(user.idUser);
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AppError(401, 'Refresh token không hợp lệ hoặc đã hết hạn');
      }
      throw error;
    }
  }

  
  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.userRepo.findByIdWithRolesAndPermissions(userId);
    if (!user) {
      throw new AppError(404, 'User không tồn tại');
    }
    const responseUser = await this.ensureDefaultUserRole(user);
    return this.toUserResponse(responseUser);
  }

  async logout(userId: string): Promise<void> {
    // Có thể thêm logic để invalidate token ở đây
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const { email } = input;
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'Email không tồn tại trong hệ thống');
    }

    
    const otp = generateOTP();
    
    
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    
    await this.userRepo.update(user.idUser, {
      resetOTP: otp,
      resetOTPExpires: otpExpires,
    });

    
    await sendOTPEmail(email, otp);
  }

  
  async verifyOTP(input: VerifyOTPInput): Promise<{ valid: boolean }> {
    const { email, otp } = input;

    
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'Email không tồn tại trong hệ thống');
    }

    
    if (!user.resetOTP || !user.resetOTPExpires) {
      throw new AppError(400, 'Bạn chưa yêu cầu đặt lại mật khẩu');
    }

    
    if (new Date() > user.resetOTPExpires) {
      throw new AppError(400, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    
    if (user.resetOTP !== otp) {
      throw new AppError(400, 'Mã OTP không chính xác');
    }

    return { valid: true };
  }

  
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const { email, otp, newPassword } = input;

    
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError(404, 'Email không tồn tại trong hệ thống');
    }

    
    if (!user.resetOTP || !user.resetOTPExpires) {
      throw new AppError(400, 'Bạn chưa yêu cầu đặt lại mật khẩu');
    }

    
    if (new Date() > user.resetOTPExpires) {
      throw new AppError(400, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    
    if (user.resetOTP !== otp) {
      throw new AppError(400, 'Mã OTP không chính xác');
    }

    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    
    await this.userRepo.update(user.idUser, {
      password: hashedPassword,
      resetOTP: undefined,
      resetOTPExpires: undefined,
    });
  }

  
  private generateTokens(userId: string): { accessToken: string; refreshToken: string } {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not defined in environment');
    }

    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const accessToken = jwt.sign(
      { userId },
      accessSecret,
      { expiresIn: accessExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId },
      refreshSecret,
      { expiresIn: refreshExpiresIn } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  
  private async ensureDefaultUserRole(user: User): Promise<User> {
    if (user.roles?.length) return user;
    return (await this.userRepo.assignRole(user.idUser, RoleCode.USER)) || user;
  }

  private toUserResponse(user: User): UserResponse {
    const roles = user.roles?.map(role => role.code) || [];
    const permissions = [
      ...new Set(
        user.roles?.flatMap(role => role.permissions?.map(permission => permission.code) || []) || []
      ),
    ];

    return {
      idUser: user.idUser,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      createdAt: user.createdAt,
      roles,
      permissions,
    };
  }
}


export const authService = new AuthService();
