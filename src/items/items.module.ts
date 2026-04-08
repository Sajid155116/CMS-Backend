import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { StorageService } from './storage.service';
import { SummarizationService } from './summarization.service';
import { Item, ItemSchema } from './schemas/item.schema';
import { UsersModule } from '../users/users.module';
import { SummarizeModule } from '../summarize/summarize.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }]),
    UsersModule,
    SummarizeModule,
  ],
  controllers: [ItemsController],
  providers: [ItemsService, StorageService, SummarizationService],
  exports: [ItemsService],
})
export class ItemsModule {}
