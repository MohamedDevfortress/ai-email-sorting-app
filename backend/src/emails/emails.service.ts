import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateEmailDto } from './dto/create-email.dto';
import { Email } from './entities/email.entity';

@Injectable()
export class EmailsService {
  constructor(
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
  ) {}

  async create(createEmailDto: CreateEmailDto, userId: string) {
    const email = this.emailRepository.create({
      ...createEmailDto,
      user: { id: userId },
    });
    return this.emailRepository.save(email);
  }

  async findAll(userId: string, categoryId?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.emailRepository
      .createQueryBuilder('email')
      .where('email.userId = :userId', { userId });

    // Filter by category if provided
    if (categoryId) {
      queryBuilder.andWhere('email.categoryId = :categoryId', { categoryId });
    }

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Get paginated results
    const emails = await queryBuilder
      .orderBy('email.receivedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: emails,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    return this.emailRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['category'],
    });
  }

  async getUserForEmail(emailId: string) {
    const email = await this.emailRepository.findOne({
      where: { id: emailId },
      relations: ['user'],
    });
    return email?.user;
  }

  async bulkDelete(emailIds: string[], userId: string) {
    return this.emailRepository.delete({
      id: In(emailIds),
      user: { id: userId },
    });
  }
}
