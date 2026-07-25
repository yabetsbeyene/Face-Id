export interface Person {
  id: string;
  person_code: string;
  full_name: string;
  role?: string | null;
  notes?: string | null;
  alert_email?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface QualityScores {
  blur_variance?: number;
  blur_variance_enhanced?: number;
  [key: string]: number | undefined;
}

export interface RecognitionResult {
  face_detected?: boolean;
  quality_ok?: boolean;
  quality_issues?: string[];
  quality_scores?: QualityScores;
  enhanced?: boolean;
  matched?: boolean;
  similarity?: number;
  person?: Person | null;
  message?: string;
  error?: string | null;
  idleMessage?: string;
  bbox?: [number, number, number, number];
  email_alert_status?: 'sent' | 'failed' | 'not_configured' | 'no_recipient' | 'cooldown';
  email_alert_recipient?: string | null;
}

export interface DashboardAlert {
  id: string;
  person: Person;
  similarity: number;
  emailStatus?: RecognitionResult['email_alert_status'];
  emailRecipient?: string | null;
  detectedAt: string;
  acknowledged: boolean;
}

export interface EnrollmentResult {
  person: Person;
  detection_confidence: number;
}

export interface EnrollmentInput {
  photoBlob: Blob;
  personCode: string;
  fullName: string;
  role?: string;
  notes?: string;
  alertEmail?: string;
}

export type PersonUpdate = Partial<
  Pick<Person, 'person_code' | 'full_name' | 'role' | 'notes' | 'alert_email'>
>;
