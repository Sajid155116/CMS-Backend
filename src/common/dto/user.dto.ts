export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'editor' | 'viewer';
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: 'admin' | 'editor' | 'viewer';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
