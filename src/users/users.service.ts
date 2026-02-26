import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.user.create({ data: createUserDto });
    return user;
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      data: updateUserDto,
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string) {
    const user = await this.prisma.user.delete({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return 'user deleted successfully';
  }
}
