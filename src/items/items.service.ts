import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Item, ItemType, ItemDocument, ItemWithChildren } from './schemas/item.schema';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private itemModel: Model<ItemDocument>,
  ) {}

  async create(createItemDto: CreateItemDto, userId: string): Promise<ItemDocument> {
    // Validate parent exists if provided
    if (createItemDto.parentId) {
      const parent = await this.itemModel.findById(createItemDto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      if (parent.type !== ItemType.FOLDER) {
        throw new BadRequestException('Parent must be a folder');
      }
      if (parent.userId !== userId) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    // Build path
    let path: string;
    if (!createItemDto.parentId) {
      path = `/${createItemDto.name}`;
    } else {
      const parent = await this.itemModel.findById(createItemDto.parentId);
      path = `${parent!.path}/${createItemDto.name}`;
    }

    // Create item
    const item = new this.itemModel({
      name: createItemDto.name,
      type: createItemDto.type,
      parentId: createItemDto.parentId || null,
      userId,
      size: createItemDto.size,
      mimeType: createItemDto.mimeType,
      storageKey: createItemDto.storageKey,
      path,
    });

    try {
      return await item.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Item with this name already exists in this location');
      }
      throw error;
    }
  }

  async findAll(query: QueryItemsDto, userId: string): Promise<ItemDocument[]> {
    const filter: any = { userId };

    // Filter by parent
    if (query.parentId !== undefined) {
      filter.parentId = query.parentId === '' ? null : query.parentId;
    }

    // Filter by type
    if (query.type) {
      filter.type = query.type;
    }

    // Search filter
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const items = await this.itemModel.find(filter).exec();

    // Sort: folders first, then by name
    return items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === ItemType.FOLDER ? -1 : 1;
    });
  }

  async findOne(id: string, userId: string): Promise<ItemDocument> {
    const item = await this.itemModel.findById(id).exec();
    if (!item || item.userId !== userId) {
      throw new NotFoundException('Item not found');
    }
    return item;
  }

  async findWithChildren(id: string, userId: string): Promise<ItemWithChildren> {
    const item = await this.findOne(id, userId);
    
    if (item.type === ItemType.FILE) {
      return item as ItemWithChildren;
    }

    const children = await this.itemModel
      .find({ parentId: id, userId })
      .exec();

    const sortedChildren = children.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === ItemType.FOLDER ? -1 : 1;
    });

    return { ...item.toObject(), children: sortedChildren } as ItemWithChildren;
  }

  async getTree(userId: string): Promise<ItemWithChildren[]> {
    // Get root items (parentId is null)
    const rootItems = await this.itemModel
      .find({ parentId: null, userId })
      .exec();

    // Recursively build tree
    const buildTree = async (parentId: string): Promise<ItemWithChildren[]> => {
      const items = await this.itemModel
        .find({ parentId, userId })
        .exec();

      const sortedItems = items.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === ItemType.FOLDER ? -1 : 1;
      });

      const itemsWithChildren: ItemWithChildren[] = [];
      for (const item of sortedItems) {
        const itemObj = item.toObject() as ItemWithChildren;
        if (item.type === ItemType.FOLDER) {
          itemObj.children = await buildTree(item._id.toString());
        }
        itemsWithChildren.push(itemObj);
      }

      return itemsWithChildren;
    };

    const sortedRootItems = rootItems.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === ItemType.FOLDER ? -1 : 1;
    });

    const tree: ItemWithChildren[] = [];
    for (const item of sortedRootItems) {
      const itemObj = item.toObject() as ItemWithChildren;
      if (item.type === ItemType.FOLDER) {
        itemObj.children = await buildTree(item._id.toString());
      }
      tree.push(itemObj);
    }

    return tree;
  }

  async update(
    id: string,
    updateItemDto: UpdateItemDto,
    userId: string,
  ): Promise<ItemDocument> {
    const item = await this.findOne(id, userId);

    // Validate new parent if provided
    if (updateItemDto.parentId !== undefined) {
      if (updateItemDto.parentId === id) {
        throw new BadRequestException('Cannot move item to itself');
      }

      if (updateItemDto.parentId) {
        const newParent = await this.itemModel.findById(updateItemDto.parentId);
        if (!newParent || newParent.userId !== userId) {
          throw new NotFoundException('Parent folder not found');
        }
        if (newParent.type !== ItemType.FOLDER) {
          throw new BadRequestException('Parent must be a folder');
        }

        // Check for circular reference
        if (item.type === ItemType.FOLDER) {
          let current: ItemDocument | null = newParent;
          while (current && current.parentId) {
            if (current.parentId === id) {
              throw new BadRequestException('Cannot create circular reference');
            }
            current = await this.itemModel.findById(current.parentId);
          }
        }
      }
    }

    // Update basic fields
    if (updateItemDto.name) {
      item.name = updateItemDto.name;
    }
    if (updateItemDto.parentId !== undefined) {
      item.parentId = updateItemDto.parentId;
    }

    // Rebuild path if name or parent changed
    if (updateItemDto.name || updateItemDto.parentId !== undefined) {
      if (!item.parentId) {
        item.path = `/${item.name}`;
      } else {
        const parent = await this.itemModel.findById(item.parentId);
        if (parent) {
          item.path = `${parent.path}/${item.name}`;
        }
      }

      // Update paths of all children if this is a folder
      if (item.type === ItemType.FOLDER) {
        await this.updateChildrenPaths(id, item.path);
      }
    }

    try {
      return await item.save();
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Item with this name already exists in this location');
      }
      throw error;
    }
  }

  private async updateChildrenPaths(parentId: string, newParentPath: string): Promise<void> {
    const children = await this.itemModel.find({ parentId }).exec();

    for (const child of children) {
      child.path = `${newParentPath}/${child.name}`;
      await child.save();

      if (child.type === ItemType.FOLDER) {
        await this.updateChildrenPaths(child._id.toString(), child.path);
      }
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.findOne(id, userId);

    // If it's a folder, recursively delete all children
    if (item.type === ItemType.FOLDER) {
      const children = await this.itemModel.find({ parentId: id }).exec();

      for (const child of children) {
        await this.remove(child._id.toString(), userId);
      }
    }

    await this.itemModel.findByIdAndDelete(id).exec();
  }

  async getBreadcrumbs(id: string, userId: string): Promise<ItemDocument[]> {
    const breadcrumbs: ItemDocument[] = [];
    let currentId: string | null = id;

    while (currentId) {
      const item = await this.findOne(currentId, userId);
      breadcrumbs.unshift(item);
      currentId = item.parentId;
    }

    return breadcrumbs;
  }

  async getStorageUsage(userId: string): Promise<{ total: number; count: number }> {
    const files = await this.itemModel
      .find({ userId, type: ItemType.FILE })
      .exec();

    return {
      total: files.reduce((sum, file) => sum + (file.size || 0), 0),
      count: files.length,
    };
  }
}
