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

  async findAll(userId: string) {
      return this.emailRepository.find({ where: { user: { id: userId } } });
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
