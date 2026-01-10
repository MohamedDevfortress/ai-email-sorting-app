import { IsString, IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmailDto {
  @IsString()
  @IsNotEmpty()
  googleMessageId: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  sender: string;

  @IsString()
  @IsOptional()
  snippet?: string;

  @IsString()
  @IsOptional()
  summary: string;

  @Type(() => Date)
  @IsDate()
  receivedAt: Date;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
