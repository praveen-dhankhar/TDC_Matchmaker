// ============================================================
// TDC Matchmaker — Shared Type Definitions
// Used by both frontend and backend for type safety
// ============================================================

// ---- Enums & Literals ----

export type Gender = 'Male' | 'Female';

export type MaritalStatus = 'Never Married' | 'Divorced' | 'Widowed' | 'Separated';

export type CustomerStatus = 'New Lead' | 'In Progress' | 'Matched' | 'On Hold' | 'Closed';

export type YesNoMaybe = 'Yes' | 'No' | 'Maybe';

export type Diet = 'Vegetarian' | 'Non-Vegetarian' | 'Eggetarian' | 'Vegan';

export type Frequency = 'Never' | 'Occasionally' | 'Regularly';

export type FamilyType = 'Joint' | 'Nuclear';

export type MatchLabel =
  | 'High Potential'
  | 'Good Match'
  | 'Worth Exploring'
  | 'Low Compatibility';

// ---- Core Entities ----

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string; // ISO 8601
  country: string;
  city: string;
  height: number; // cm
  bodyType: string;
  email: string; // encrypted at rest
  phoneNumber: string; // encrypted at rest
  undergraduateCollege: string;
  degree: string;
  postgraduateDegree?: string;
  income: string; // range bracket e.g. "10-15 LPA"
  currentCompany: string;
  designation: string;
  profession: string;
  maritalStatus: MaritalStatus;
  languagesKnown: string[];
  siblings: number;
  caste: string;
  subCaste?: string;
  religion: string;
  motherTongue: string;
  familyType: FamilyType;
  fatherOccupation: string;
  motherOccupation: string;
  wantKids: YesNoMaybe;
  openToRelocate: YesNoMaybe;
  openToPets: YesNoMaybe;
  diet: Diet;
  drinking: Frequency;
  smoking: Frequency;
  bio: string;
  hobbies: string[];
  profilePhotoUrl: string;
  verifiedAt: string; // ISO 8601
  preferredAgeRange: { min: number; max: number };
  preferredCities: string[];
  preferredReligion: string[];
  dealbreakers: string[];
  physicalDisability?: string;
  // Matchmaker-assigned fields
  assignedMatchmakerId: string;
  status: CustomerStatus;
}

export interface MatchResult {
  candidateId: string;
  candidate: Profile;
  ruleScore: number; // 0–100
  aiScore: number; // 0–100
  finalScore: number; // weighted combination
  label: MatchLabel;
  explanation: string; // AI-generated
  sentAt?: string; // ISO 8601, null if not sent
}

export interface Note {
  id: string;
  customerId: string;
  matchmakerId: string;
  matchmakerName: string;
  body: string;
  createdAt: string; // ISO 8601
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  assignedCustomerIds: string[];
}

// ---- API Request/Response Types ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface CustomersListResponse {
  customers: CustomerSummary[];
}

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  age: number;
  city: string;
  maritalStatus: MaritalStatus;
  status: CustomerStatus;
  profilePhotoUrl: string;
}

export interface CustomerDetailResponse {
  customer: Profile;
}

export interface MatchesResponse {
  matches: MatchResult[];
  fromCache: boolean;
}

export interface SendMatchRequest {
  candidateId: string;
}

export interface SendMatchResponse {
  message: string;
  matchId: string;
}

export interface CreateNoteRequest {
  body: string;
}

export interface NotesResponse {
  notes: Note[];
}

export interface UpdateStatusRequest {
  status: CustomerStatus;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}
