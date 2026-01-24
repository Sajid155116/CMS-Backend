import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemType } from '../schemas/item.schema';

export class QueryItemsDto {
  @ApiProperty({ description: 'Parent folder ID (null for root)', required: false })
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @ApiProperty({ enum: ItemType, description: 'Filter by item type', required: false })
  @IsEnum(ItemType)
  @IsOptional()
  type?: ItemType;

  @ApiProperty({ description: 'Search query', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
