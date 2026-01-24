import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemType } from '../schemas/item.schema';

export class CreateItemDto {
  @ApiProperty({ description: 'Item name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ItemType, description: 'Item type (file or folder)' })
  @IsEnum(ItemType)
  @IsNotEmpty()
  type: ItemType;

  @ApiProperty({ description: 'Parent folder ID', required: false })
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @IsNumber()
  @IsOptional()
  size?: number;

  @ApiProperty({ description: 'MIME type', required: false })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ description: 'Storage key in R2', required: false })
  @IsString()
  @IsOptional()
  storageKey?: string;
}
