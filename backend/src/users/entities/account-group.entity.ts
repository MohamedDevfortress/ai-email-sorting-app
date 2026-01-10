import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToMany } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class AccountGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => User, (user) => user.accountGroups)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;
}
