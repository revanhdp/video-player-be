import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;
  // @Length(5, 254, { message: 'Email harus antara 5 hingga 254 karakter' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
  // @Transform((value: any) => typeof value === 'string' ? value.trim().toLowerCase() : value)

  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password: string;
//   @Length(8, 100, {
//   message: 'Password minimal 8 karakter dan maksimal 100 karakter',
// })
}
