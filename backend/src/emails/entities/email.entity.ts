import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity()
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  googleMessageId: string;

  @Column()
  subject: string;

  @Column({ nullable: true })
  sender: string;

  @Column('text', { nullable: true })
  snippet: string;

  @Column('text', { nullable: true })
  summary: string;

  @Column({ type: 'timestamp' })
  receivedAt: Date;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Category)
  category: Category;

  @Column({ nullable: true })
  categoryId: string; // Helper for relation
}
