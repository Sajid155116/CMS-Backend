import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { StorageService } from './storage.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Items')
@Controller('items')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new item (file or folder)' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  create(@Body() createItemDto: CreateItemDto, @CurrentUser() userId: string) {
    return this.itemsService.create(createItemDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all items with optional filters' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  findAll(@Query() query: QueryItemsDto, @CurrentUser() userId: string) {
    return this.itemsService.findAll(query, userId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get complete folder tree structure' })
  @ApiResponse({ status: 200, description: 'Tree structure retrieved successfully' })
  getTree(@CurrentUser() userId: string) {
    return this.itemsService.getTree(userId);
  }

  @Get('storage-usage')
  @ApiOperation({ summary: 'Get storage usage statistics' })
  @ApiResponse({ status: 200, description: 'Storage usage retrieved successfully' })
  getStorageUsage(@CurrentUser() userId: string) {
    return this.itemsService.getStorageUsage(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single item by ID' })
  @ApiResponse({ status: 200, description: 'Item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.itemsService.findOne(id, userId);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get item with its children' })
  @ApiResponse({ status: 200, description: 'Item with children retrieved successfully' })
  findWithChildren(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.itemsService.findWithChildren(id, userId);
  }

  @Get(':id/breadcrumbs')
  @ApiOperation({ summary: 'Get breadcrumb trail for an item' })
  @ApiResponse({ status: 200, description: 'Breadcrumbs retrieved successfully' })
  getBreadcrumbs(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.itemsService.getBreadcrumbs(id, userId);
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get presigned download URL for a file' })
  @ApiResponse({ status: 200, description: 'Download URL generated successfully' })
  async getDownloadUrl(@Param('id') id: string, @CurrentUser() userId: string) {
    const item = await this.itemsService.findOne(id, userId);
    
    if (!item.storageKey) {
      throw new Error('File has no storage key');
    }

    const url = await this.storageService.generateDownloadUrl(item.storageKey);
    return { url, expiresIn: 3600 };
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate presigned upload URL for direct R2 upload' })
  @ApiResponse({ status: 200, description: 'Returns presigned URL and metadata' })
  async getUploadUrl(
    @Body() body: { filename: string; contentType: string; size: number; parentId?: string },
    @CurrentUser() userId: string,
  ) {
    // Generate unique storage key
    const timestamp = Date.now();
    const storageKey = `${userId}/${timestamp}-${body.filename}`;

    // Generate presigned upload URL
    const uploadUrl = await this.storageService.generateUploadUrl(
      storageKey,
      body.contentType,
    );

    return {
      uploadUrl,
      storageKey,
      expiresIn: 3600,
    };
  }

  @Post('upload-complete')
  @ApiOperation({ summary: 'Confirm upload completion and create database record' })
  @ApiResponse({ status: 201, description: 'File record created successfully' })
  async completeUpload(
    @Body() body: {
      filename: string;
      storageKey: string;
      size: number;
      mimeType: string;
      parentId?: string;
    },
    @CurrentUser() userId: string,
  ) {
    // Verify file exists in R2
    const exists = await this.storageService.fileExists(body.storageKey);
    if (!exists) {
      throw new Error('File not found in storage');
    }

    // Create item in database
    const createDto: CreateItemDto = {
      name: body.filename,
      type: 'file' as any,
      parentId: body.parentId && body.parentId !== 'null' && body.parentId !== 'undefined' ? body.parentId : null,
      size: body.size,
      mimeType: body.mimeType,
      storageKey: body.storageKey,
    };

    const item = await this.itemsService.create(createDto, userId);
    return item;
  }

  @Post('multipart/initiate')
  @ApiOperation({ summary: 'Initiate multipart upload for large files' })
  @ApiResponse({ status: 200, description: 'Returns upload ID for multipart upload' })
  async initiateMultipartUpload(
    @Body() body: { filename: string; contentType: string; size: number; parentId?: string },
  ) {
    // TODO: Get userId from authenticated user
    const userId = 'demo-user-id';

    const timestamp = Date.now();
    const storageKey = `${userId}/${timestamp}-${body.filename}`;

    const uploadId = await this.storageService.createMultipartUpload(
      storageKey,
      body.contentType,
    );

    return {
      uploadId,
      storageKey,
    };
  }

  @Post('multipart/part-url')
  @ApiOperation({ summary: 'Get presigned URL for uploading a part' })
  @ApiResponse({ status: 200, description: 'Returns presigned URL for part upload' })
  async getMultipartPartUrl(
    @Body() body: { storageKey: string; uploadId: string; partNumber: number },
  ) {
    const url = await this.storageService.generateMultipartUploadUrl(
      body.storageKey,
      body.uploadId,
      body.partNumber,
    );

    return { url };
  }

  @Post('multipart/complete')
  @ApiOperation({ summary: 'Complete multipart upload' })
  @ApiResponse({ status: 201, description: 'Multipart upload completed and item created' })
  async completeMultipartUpload(
    @Body() body: {
      filename: string;
      storageKey: string;
      uploadId: string;
      parts: { PartNumber: number; ETag: string }[];
      size: number;
      mimeType: string;
      parentId?: string;
    },
    @CurrentUser() userId: string,
  ) {
    // Complete multipart upload in R2
    await this.storageService.completeMultipartUpload(
      body.storageKey,
      body.uploadId,
      body.parts,
    );

    // Create item in database
    const createDto: CreateItemDto = {
      name: body.filename,
      type: 'file' as any,
      parentId: body.parentId && body.parentId !== 'null' && body.parentId !== 'undefined' ? body.parentId : null,
      size: body.size,
      mimeType: body.mimeType,
      storageKey: body.storageKey,
    };

    const item = await this.itemsService.create(createDto, userId);
    return item;
  }

  @Post('multipart/abort')
  @ApiOperation({ summary: 'Abort multipart upload' })
  @ApiResponse({ status: 200, description: 'Multipart upload aborted' })
  async abortMultipartUpload(
    @Body() body: { storageKey: string; uploadId: string },
  ) {
    await this.storageService.abortMultipartUpload(
      body.storageKey,
      body.uploadId,
    );
    return { message: 'Upload cancelled' };
  }

  @Post('upload-url-presigned')
  @ApiOperation({ summary: 'Generate presigned upload URL for direct client upload' })
  @ApiResponse({ status: 200, description: 'Upload URL generated successfully' })
  async generateUploadUrl(
    @Body() body: { filename: string; contentType: string; parentId?: string },
    @CurrentUser() userId: string,
  ) {
    // Generate unique storage key
    const timestamp = Date.now();
    const storageKey = `${userId}/${timestamp}-${body.filename}`;

    const url = await this.storageService.generateUploadUrl(
      storageKey,
      body.contentType,
    );

    return {
      url,
      storageKey,
      expiresIn: 3600,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an item (rename or move)' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto, @CurrentUser() userId: string) {
    return this.itemsService.update(id, updateItemDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an item (and its children if folder)' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async remove(@Param('id') id: string, @CurrentUser() userId: string) {
    const item = await this.itemsService.findOne(id, userId);

    // Delete from storage if it's a file
    if (item.storageKey) {
      await this.storageService.deleteFile(item.storageKey);
    }

    await this.itemsService.remove(id, userId);
    return { message: 'Item deleted successfully' };
  }
}
