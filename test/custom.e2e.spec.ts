import request from './lib/request';
import { StatusCodes } from 'http-status-codes';
import { usersRoutes, articlesRoutes } from './endpoints';
import {
  getTokenAndUserId,
  shouldAuthorizationBeTested,
  removeTokenUser,
} from './utils';
import { randomBytes } from 'crypto';

describe('Custom features (e2e)', () => {
  const headers = { Accept: 'application/json' };
  let mockUserId: string | undefined;

  beforeAll(async () => {
    if (shouldAuthorizationBeTested) {
      const result = await getTokenAndUserId(request);
      headers['Authorization'] = result.token;
      mockUserId = result.mockUserId;
    }
  });

  afterAll(async () => {
    if (mockUserId) {
      await removeTokenUser(request, mockUserId, headers);
    }

    if (headers['Authorization']) {
      delete headers['Authorization'];
    }
  });

  describe('Pagination (Users)', () => {
    it('should return paginated users', async () => {
      const user1 = `u1_${randomBytes(4).toString('hex')}`;
      const user2 = `u2_${randomBytes(4).toString('hex')}`;

      await request
        .post(usersRoutes.create)
        .set(headers)
        .send({ login: user1, password: '123' });
      await request
        .post(usersRoutes.create)
        .set(headers)
        .send({ login: user2, password: '123' });

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
      const loginA = `aaa_${randomBytes(4).toString('hex')}`;
      const loginZ = `zz_${randomBytes(4).toString('hex')}`;

      await request
        .post(usersRoutes.create)
        .set(headers)
        .send({ login: loginA, password: '123' });
      await request
        .post(usersRoutes.create)
        .set(headers)
        .send({ login: loginZ, password: '123' });

      const response = await request
        .get(`${usersRoutes.getAll}?sortBy=login&order=desc&page=1&limit=1000`)
        .set(headers);

      expect(response.status).toBe(StatusCodes.OK);

      const logins = response.body.data.map((u) => u.login);
      const loginZIndex = logins.indexOf(loginZ);
      const loginAIndex = logins.indexOf(loginA);

      expect(loginZIndex).toBeGreaterThan(-1);
      expect(loginAIndex).toBeGreaterThan(-1);

      expect(loginZIndex).toBeLessThan(loginAIndex);
    });
  });

  describe('Filtering (Articles)', () => {
    it('should filter articles by status and tag', async () => {
      await request
        .post(articlesRoutes.create)
        .set(headers)
        .send({
          title: `a1_${randomBytes(4).toString('hex')}`,
          content: 'content',
          status: 'draft',
          authorId: null,
          categoryId: null,
          tags: ['node'],
        });

      await request
        .post(articlesRoutes.create)
        .set(headers)
        .send({
          title: `a2_${randomBytes(4).toString('hex')}`,
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
