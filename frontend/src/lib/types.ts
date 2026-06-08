import type {
  CustomerStatus,
  CustomerSummary,
  EmailIntroResponse,
  MatchResult,
  Note,
  Profile,
  User,
} from '@shared/types';

export type {
  CustomerStatus,
  CustomerSummary,
  MatchResult,
  EmailIntroResponse,
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
