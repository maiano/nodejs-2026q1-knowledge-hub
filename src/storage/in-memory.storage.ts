import { Injectable } from '@nestjs/common';
import { User } from '../user/user.entity';
import { Article } from '../article/article.entity';
import { Category } from '../category/category.entity';
import { Comment } from '../comment/comment.entity';

@Injectable()
export class InMemoryStorage {
  private users: User[] = [];
  private articles: Article[] = [];
  private categories: Category[] = [];
  private comments: Comment[] = [];

  getUsers() {
    return this.users;
  }

  setUsers(users: User[]) {
    this.users = users;
  }

  getArticles() {
    return this.articles;
  }

  setArticles(articles: Article[]) {
    this.articles = articles;
  }

  getCategories() {
    return this.categories;
  }

  setCategories(categories: Category[]) {
    this.categories = categories;
  }

  getComments() {
    return this.comments;
  }

  setComments(comments: Comment[]) {
    this.comments = comments;
  }
}
