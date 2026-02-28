import { Reflector } from '@nestjs/core';
import { Roles } from '../enums/role.enum';

export const Role = Reflector.createDecorator<Roles[]>();
