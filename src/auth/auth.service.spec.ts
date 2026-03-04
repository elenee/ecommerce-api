import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';


jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_value'),
  compare: jest.fn(),
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  password: 'hashed_password',
  role: 'CUSTOMER',
  firstName: 'John',
  lastName: 'Doe',
  phone: null,
  refreshToken: 'hashed_refresh_token',
  createdAt: new Date(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);


    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('mock_token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_value');
  });


  // signup
  describe('signUp', () => {
    it('should create a new user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.signUp({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toBe('user created successfully');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashed_value',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.signUp({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  //validateUser
  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser({ email: 'wrong@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  //signIn
  describe('signIn', () => {
    it('should return accessToken and refreshToken', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.signIn(mockUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should sign access token with correct payload', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.signIn(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, role: mockUser.role },
        { expiresIn: '1h' },
      );
    });

    it('should sign refresh token with 7d expiry', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.signIn(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, role: mockUser.role },
        { expiresIn: '7d' },
      );
    });
  });

  // currentUser
  describe('currentUser', () => {
    it('should return user without password and refreshToken', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.currentUser('user-123');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.currentUser('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  //accessRefreshToken
  describe('accessRefreshToken', () => {
    it('should return new accessToken when refresh token is valid', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-123', role: 'CUSTOMER' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.accessRefreshToken('valid_refresh_token');

      expect(result).toHaveProperty('accessToken');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', role: 'CUSTOMER' },
        { expiresIn: '1h' },
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-123', role: 'CUSTOMER' });
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.accessRefreshToken('valid_refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token does not match stored token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-123', role: 'CUSTOMER' });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.accessRefreshToken('invalid_refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if jwt verify throws', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.accessRefreshToken('expired_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});