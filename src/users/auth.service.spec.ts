import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUserService: Partial<UsersService>;

  beforeEach(async () => {
    const users: User[] = [];
    fakeUserService = {
      find: (email) => {
        const filteredUser = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUser);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 9999999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUserService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const password = '12345';
    const user = await service.signup('test@test.com', password);

    expect(user.password).not.toEqual(password);
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with email that is in use', async () => {
    const email = 'test@test.com';
    const password = '12345';

    await service.signup(email, password);
    await expect(service.signup(email, password)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws if signin is called with an unused email', async () => {
    await expect(service.signIn('test@test.com', '12345')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws if an invalid password is provided', async () => {
    const email = 'test@test.com';
    const password = '123456';

    await service.signup(email, password);
    await expect(service.signIn(email, 'password')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns a user is correct password is provided', async () => {
    const email = 'test@test.com';
    const password = '12345';

    await service.signup(email, password);

    const user = await service.signIn(email, password);
    expect(user).toBeDefined();
  });
});
