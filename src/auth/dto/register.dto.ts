import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  // Match,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;
  // @Length(5, 254, { message: 'Email harus antara 5 hingga 254 karakter' })
  // @Transform((value: any) =>
  //   typeof value === 'string' ? value.trim().toLowerCase() : value,
  // )

  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password: string;
  // @Length(8, 100, {
  //   message: 'Password minimal 8 karakter dan maksimal 100 karakter',
  // })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
  //   message:
  //     'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus',
  // })

  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  name: string;
  // @Length(2, 100, {
  //   message: 'Nama minimal 2 karakter dan maksimal 100 karakter',
  // })

  // @Transform((value: any) => (typeof value === 'string' ? value.trim() : value))

  // @IsString()
  // @IsNotEmpty({ message: 'Konfirmasi password tidak boleh kosong' })
  // @Match('password', { message: 'Konfirmasi password tidak cocok' })
  // confirmPassword: string;
}
