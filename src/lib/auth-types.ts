export type UserRole = 'superadmin' | 'guru' | 'siswa';

export type GradeLevel = 4 | 5 | 6;

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  grade_level?: GradeLevel | null;
  class_name?: string | null;
  avatar_url?: string | null;
  isSuperadmin: boolean;
}

export interface SessionJWTPayload {
  sub: string; // user id
  username: string;
  name: string;
  role: UserRole;
  grade_level?: GradeLevel | null;
  class_name?: string | null;
  avatar_url?: string | null;
  isSuperadmin: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
}

export interface ActionState<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  redirectUrl?: string;
}
