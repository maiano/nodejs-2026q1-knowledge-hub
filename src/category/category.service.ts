import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { InMemoryStorage } from '../storage/in-memory.storage';
import { Category } from './category.entity';
import { CreateCategoryDto } from 'src/category/dto/create-category.dto';
import { UpdateCategoryDto } from 'src/category/dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly storage: InMemoryStorage) {}

  findAll() {
    return this.storage.getCategories();
  }

  findById(id: string) {
    const category = this.storage.getCategories().find((c) => c.id === id);

    if (!category) {
      throw new NotFoundException();
    }

    return category;
  }

  create(dto: CreateCategoryDto) {
    const categories = this.storage.getCategories();

    const category: Category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    };

    categories.push(category);

    return category;
  }

  update(id: string, dto: UpdateCategoryDto) {
    const category = this.storage.getCategories().find((c) => c.id === id);

    if (!category) throw new NotFoundException();

    category.name = dto.name;
    category.description = dto.description;

    return category;
  }

  delete(id: string) {
    const categories = this.storage.getCategories();

    const exists = categories.find((c) => c.id === id);

    if (!exists) {
      throw new NotFoundException();
    }

    this.handleCascadeDelete(id);

    this.storage.setCategories(categories.filter((c) => c.id !== id));
  }

  private handleCascadeDelete(categoryId: string) {
    const articles = this.storage.getArticles();

    articles.forEach((a) => {
      if (a.categoryId === categoryId) {
        a.categoryId = null;
      }
    });
  }
}
