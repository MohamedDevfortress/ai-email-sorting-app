import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Category } from 'src/categories/entities/category.entity';
import { ConnectedAccount } from './connected-account.entity';
import { AccountGroup } from './account-group.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ nullable: true }) // Google ID
  googleId: string;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  historyId: string; // Last processed history ID from Gmail

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];

  @OneToMany(() => ConnectedAccount, (account) => account.user)
  connectedAccounts: ConnectedAccount[];

  @ManyToMany(() => AccountGroup, (group) => group.users)
  @JoinTable()
  accountGroups: AccountGroup[];
}
