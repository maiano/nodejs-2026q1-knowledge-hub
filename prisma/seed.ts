import 'dotenv/config';
import { PrismaClient, ArticleStatus, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const categorySeeds = [
  {
    name: 'Technology',
    description: 'Backend, infrastructure, and platform engineering topics.',
  },
  {
    name: 'Science',
    description: 'Applied science articles and research summaries.',
  },
  {
    name: 'Business',
    description: 'Product, operations, and business process content.',
  },
] as const;

const tagSeeds = [
  'nodejs',
  'typescript',
  'nestjs',
  'docker',
  'prisma',
] as const;

const articleSeeds = [
  {
    title: 'NestJS in Production',
    content:
      'Practical notes on structuring NestJS modules, validation, and deployment.',
    status: ArticleStatus.PUBLISHED,
    authorLogin: 'editor',
    categoryName: 'Technology',
    tagNames: ['nestjs', 'typescript', 'nodejs'],
  },
  {
    title: 'Prisma Migration Workflow',
    content:
      'How to apply safe schema changes with migrate deploy in containerized environments.',
    status: ArticleStatus.DRAFT,
    authorLogin: 'admin',
    categoryName: 'Technology',
    tagNames: ['prisma', 'docker'],
  },
  {
    title: 'Evidence-Based Product Decisions',
    content:
      'A short guide to combining operational data with stakeholder feedback.',
    status: ArticleStatus.PUBLISHED,
    authorLogin: 'admin',
    categoryName: 'Business',
    tagNames: ['typescript'],
  },
  {
    title: 'Data Pipelines for Research Teams',
    content:
      'Organizing ingestion, validation, and reporting for repeatable scientific workflows.',
    status: ArticleStatus.ARCHIVED,
    authorLogin: 'editor',
    categoryName: 'Science',
    tagNames: ['docker', 'prisma'],
  },
  {
    title: 'Container Healthchecks That Matter',
    content:
      'What to verify at startup and runtime to make Docker orchestration more reliable.',
    status: ArticleStatus.DRAFT,
    authorLogin: 'editor',
    categoryName: 'Technology',
    tagNames: ['docker', 'nestjs', 'nodejs'],
  },
] as const;

const commentSeeds = [
  {
    articleTitle: 'NestJS in Production',
    authorLogin: 'admin',
    content: 'Solid baseline article for backend onboarding.',
  },
  {
    articleTitle: 'Prisma Migration Workflow',
    authorLogin: 'editor',
    content: 'The migration deploy note is especially useful for CI/CD.',
  },
  {
    articleTitle: 'Container Healthchecks That Matter',
    authorLogin: 'admin',
    content:
      'Healthchecks should stay tied to actual readiness, not just open ports.',
  },
] as const;

async function seedUsers() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const editorPassword = await bcrypt.hash('editor123', 10);

  const [admin, editor] = await Promise.all([
    prisma.user.upsert({
      where: { login: 'admin' },
      update: {
        password: adminPassword,
        role: UserRole.ADMIN,
      },
      create: {
        login: 'admin',
        password: adminPassword,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { login: 'editor' },
      update: {
        password: editorPassword,
        role: UserRole.EDITOR,
      },
      create: {
        login: 'editor',
        password: editorPassword,
        role: UserRole.EDITOR,
      },
    }),
  ]);

  return { admin, editor };
}

async function seedCategories() {
  const categories = [];

  for (const category of categorySeeds) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name },
    });

    if (existing) {
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          description: category.description,
        },
      });
      categories.push(updated);
      continue;
    }

    const created = await prisma.category.create({
      data: category,
    });
    categories.push(created);
  }

  return new Map(categories.map((category) => [category.name, category]));
}

async function seedTags() {
  const tags = await Promise.all(
    tagSeeds.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  return new Map(tags.map((tag) => [tag.name, tag]));
}

async function seedArticles(
  userIdsByLogin: Map<string, string>,
  categoryIdsByName: Map<string, string>,
) {
  const articles = [];

  for (const article of articleSeeds) {
    const existing = await prisma.article.findFirst({
      where: { title: article.title },
    });

    const data = {
      title: article.title,
      content: article.content,
      status: article.status,
      authorId: userIdsByLogin.get(article.authorLogin) ?? null,
      categoryId: categoryIdsByName.get(article.categoryName) ?? null,
      tags: {
        ...(existing ? { set: [] } : {}),
        connect: article.tagNames.map((name) => ({ name })),
      },
    };

    if (existing) {
      const updated = await prisma.article.update({
        where: { id: existing.id },
        data,
      });
      articles.push(updated);
      continue;
    }

    const created = await prisma.article.create({
      data,
    });
    articles.push(created);
  }

  return new Map(articles.map((article) => [article.title, article]));
}

async function seedComments(
  articleIdsByTitle: Map<string, string>,
  userIdsByLogin: Map<string, string>,
) {
  for (const comment of commentSeeds) {
    const articleId = articleIdsByTitle.get(comment.articleTitle);

    if (!articleId) {
      continue;
    }

    const existing = await prisma.comment.findFirst({
      where: {
        articleId,
        content: comment.content,
      },
    });

    if (existing) {
      continue;
    }

    await prisma.comment.create({
      data: {
        content: comment.content,
        articleId,
        authorId: userIdsByLogin.get(comment.authorLogin) ?? null,
      },
    });
  }
}

async function main() {
  const { admin, editor } = await seedUsers();
  const categoriesByName = await seedCategories();
  await seedTags();

  const userIdsByLogin = new Map<string, string>([
    ['admin', admin.id],
    ['editor', editor.id],
  ]);

  const categoryIdsByName = new Map<string, string>(
    [...categoriesByName.entries()].map(([name, category]) => [
      name,
      category.id,
    ]),
  );

  const articlesByTitle = await seedArticles(userIdsByLogin, categoryIdsByName);
  const articleIdsByTitle = new Map<string, string>(
    [...articlesByTitle.entries()].map(([title, article]) => [
      title,
      article.id,
    ]),
  );

  await seedComments(articleIdsByTitle, userIdsByLogin);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
