import request from './lib/request';
import { StatusCodes } from 'http-status-codes';
import { usersRoutes, articlesRoutes } from './endpoints';

describe('Custom features (e2e)', () => {
  const headers = { Accept: 'application/json' };

  describe('Pagination (Users)', () => {
    it('should return paginated users', async () => {
      await request
        .post(usersRoutes.create)
        .send({ login: 'u1', password: '123' });
      await request
        .post(usersRoutes.create)
        .send({ login: 'u2', password: '123' });

      const response = await request
        .get(`${usersRoutes.getAll}?page=1&limit=1`)
        .set(headers);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('Sorting (Users)', () => {
    it('should sort users by login desc', async () => {
      await request
        .post(usersRoutes.create)
        .send({ login: 'aaa', password: '123' });
      await request
        .post(usersRoutes.create)
        .send({ login: 'zz', password: '123' });

      const response = await request
        .get(`${usersRoutes.getAll}?sortBy=login&order=desc&page=1&limit=10`)
        .set(headers);

      expect(response.status).toBe(StatusCodes.OK);

      const logins = response.body.data.map((u) => u.login);

      expect(logins).toContain('zz');
      expect(logins.indexOf('zz')).toBeLessThan(logins.indexOf('aaa'));
    });
  });

  describe('Filtering (Articles)', () => {
    it('should filter articles by status and tag', async () => {
      await request.post(articlesRoutes.create).send({
        title: 'a1',
        content: 'content',
        status: 'draft',
        authorId: null,
        categoryId: null,
        tags: ['node'],
      });

      await request.post(articlesRoutes.create).send({
        title: 'a2',
        content: 'content',
        status: 'published',
        authorId: null,
        categoryId: null,
        tags: ['notjs'],
      });

      const response = await request
        .get(`${articlesRoutes.getAll}?status=draft&tag=node`)
        .set(headers);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toBeInstanceOf(Array);

      expect(response.body.every((a) => a.status === 'draft')).toBe(true);
      expect(response.body.every((a) => a.tags.includes('node'))).toBe(true);
    });
  });
});
