import type {
  ApiErrorBody,
  CustomerStatus,
  CustomerSummary,
  EmailIntroResponse,
  MatchResult,
  Note,
  Profile,
  SessionUser,
} from './types';

const API_BASE = '/api';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      errorBody = null;
    }
    throw new Error(errorBody?.message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return apiFetch<{ user: SessionUser; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  logout() {
    return apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
  },

  me() {
    return apiFetch<{ user: SessionUser }>('/auth/me');
  },

  customers() {
    return apiFetch<{ customers: CustomerSummary[] }>('/customers');
  },

  customer(id: string) {
    return apiFetch<{ customer: Profile }>(`/customers/${id}`);
  },

  updateStatus(id: string, status: CustomerStatus) {
    return apiFetch<{ customer: Profile }>(`/customers/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  matches(id: string, limit = 10) {
    return apiFetch<{ matches: MatchResult[]; fromCache: boolean }>(
      `/customers/${id}/matches?limit=${limit}`
    );
  },

  sendMatch(customerId: string, candidateId: string) {
    return apiFetch<{ message: string; matchId: string }>(`/customers/${customerId}/send-match`, {
      method: 'POST',
      body: { candidateId },
    });
  },

  emailIntro(customerId: string, candidateId: string) {
    return apiFetch<EmailIntroResponse>(
      `/customers/${customerId}/matches/${candidateId}/email-intro`,
      { method: 'POST' }
    );
  },

  notes(customerId: string) {
    return apiFetch<{ notes: Note[] }>(`/customers/${customerId}/notes`);
  },

  addNote(customerId: string, body: string) {
    return apiFetch<{ note: Note }>(`/customers/${customerId}/notes`, {
      method: 'POST',
      body: { body },
    });
  },
};
