import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString({ message: 'Comment content must be a string' })
  @IsNotEmpty({ message: 'Comment content cannot be empty' })
  @MinLength(1, {
    message: 'Comment content must be at least 1 character long',
  })
  @MaxLength(1000, { message: 'Comment content cannot exceed 1000 characters' })
  content: string;
}
