import type {
  CustomerStatus,
  CustomerSummary,
  MatchResult,
  Note,
  Profile,
  User,
} from '@shared/types';

export type {
  CustomerStatus,
  CustomerSummary,
  MatchResult,
  Note,
  Profile,
  User,
};

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'assignedCustomerIds'>;

export type ApiErrorBody = {
  error: string;
  message: string;
  statusCode: number;
};
