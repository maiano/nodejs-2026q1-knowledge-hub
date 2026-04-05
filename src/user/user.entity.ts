import { UserRole } from '../common/enums/user-role.enum';

export class User {
  id: string;
  login: string;
  password: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}
