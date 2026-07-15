import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { PrismaService } from './prisma.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockPrismaService = {
    user: {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'uuid-1', ...dto.data, availableBalance: 0, reservedBalance: 0 })),
      findUnique: jest.fn().mockImplementation(({ where: { id } }) => 
        Promise.resolve({
          id,
          email: 'test@example.com',
          airtmAccount: 'airtm_123',
          availableBalance: 100.0,
          reservedBalance: 50.0,
        })
      ),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a user', async () => {
    const res = await controller.createUser({ email: 'new@example.com', airtmAccount: 'new_airtm' });
    expect(res).toBeDefined();
    expect(res.email).toBe('new@example.com');
    expect(mockPrismaService.user.create).toHaveBeenCalled();
  });

  it('should fetch balance', async () => {
    const res = await controller.getBalance('uuid-1');
    expect(res).toBeDefined();
    expect(res.userId).toBe('uuid-1');
    expect(res.availableBalance).toBe('100');
    expect(res.reservedBalance).toBe('50');
  });
});
