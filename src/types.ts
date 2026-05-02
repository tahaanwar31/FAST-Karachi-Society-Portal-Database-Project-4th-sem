
export type UserRole = 'ADMIN' | 'SOCIETY_HEAD' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roll_no?: string;
  phone?: string;
}

export interface Society {
  id: string;
  name: string;
  description?: string;
  category?: string;
  established_year?: number;
  contact_email?: string;
  vision?: string;
  head_id?: string;
  co_head_id?: string;
  head_name?: string;
  co_head_name?: string;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  capacity: number;
  society_id: string;
  venue_id: string;
  head_email?: string;
  status: 'PENDING' | 'PUBLISHED' | 'CANCELLED';
  created_at: string;
  society_name?: string;
  venue_name?: string;
  venue_location?: string;
  participant_count?: number;
}

export interface Registration {
  id: string;
  user_id: string;
  event_id: string;
  status: 'REGISTERED' | 'ATTENDED' | 'CANCELLED';
  registered_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  department?: string;
  access_level?: string;
  phone?: string;
  created_at?: string;
}

export interface Head {
  id: string;
  name: string;
  email: string;
  society_id?: string;
  department?: string;
  phone?: string;
  tenure_start?: string;
  created_at?: string;
}

export interface CoHead {
  id: string;
  name: string;
  email: string;
  society_id?: string;
  department?: string;
  phone?: string;
  tenure_start?: string;
  created_at?: string;
}

export interface StudentMember {
  id: string;
  name: string;
  email: string;
  society_id?: string;
  roll_no?: string;
  department?: string;
  semester?: number;
  phone?: string;
  joined_date?: string;
  created_at?: string;
}
