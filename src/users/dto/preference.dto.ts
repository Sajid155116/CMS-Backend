import { IsEnum, IsOptional, IsObject } from 'class-validator';

export class UpdatePreferenceDto {
  @IsEnum(['grid', 'list'])
  @IsOptional()
  viewMode?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
