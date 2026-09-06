import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.user.create({ data: createUserDto });
    return user;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { addresses: true },
    });
    return users.map(({ password, refreshToken, ...rest }) => rest);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const { password, refreshToken, ...rest } = user;
    return rest;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      data: updateUserDto,
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password, refreshToken, ...rest } = user;
    return rest;
  }

  async remove(id: string) {
    const user = await this.prisma.user.delete({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return 'user deleted successfully';
  }

  async addAddress(userId: string, createAddressDto: CreateAddressDto) {
    const address = await this.prisma.address.create({
      data: {
        ...createAddressDto,
        userId,
      },
    });
    return address;
  }

  async ensureAdminExists() {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL environment variable is not set');
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable is not set');
    }

    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingAdmin) return;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await this.prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || 'Admin',
        role: 'ADMIN',
      },
    });

    console.log('Admin seeded');
  }
}
