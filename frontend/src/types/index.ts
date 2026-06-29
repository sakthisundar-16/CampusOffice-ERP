export interface User {
  id: number
  email: string
  full_name: string
  role: 'student' | 'staff' | 'admin'
  student_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  phone?: string
  address?: string
  photo?: string
  department_id?: number
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface DashboardData {
  student: {
    id: number
    roll_number: string
    current_semester: number
    current_semester_name?: string
    gpa: string
    full_name?: string
  }
  payments: number
  results: number
  bonafides: number
  document_requests: number
  notifications: number
  latest_payment_status?: string
  latest_receipt?: string
  latest_completed_payment?: {
    id: number
    request_id: string
    receipt_number: string
    amount_paid: number
    payment_date: string
    verified_at: string
  }
  fee_summary?: {
    total_fee: number
    total_paid: number
    total_pending: number
    payment_percentage: number
    current_semester_fee: number
    latest_receipt?: string
  }
  activity_history?: Array<{
    id: number
    activity_type: string
    entity_type?: string
    entity_id?: number
    description: string
    old_value?: string
    new_value?: string
    reference_number?: string
    created_at: string
  }>
  unified_requests?: Array<{
    id: number
    request_number: string
    request_type: string
    status: string
    submitted_at: string
  }>
  upcoming_due_dates?: Array<{
    fee_name: string
    amount: number
    due_date: string
    semester_name: string
    academic_year: string
  }>
  recent_activities?: Array<{
    type: string
    event: string
    timestamp: string
    details: string
    status: string
  }>
  latest_notifications?: Array<{
    id: number
    title: string
    message: string
    category?: string
    is_read: boolean
    created_at: string
  }>
  recent_document_requests?: Array<{
    id: number
    request_number: string
    document_type: string
    status: string
    certificate_number?: string
    created_at: string
  }>
  latest_results?: Array<{
    id: number
    semester: string
    gpa: number
    percentage?: number
    grade?: string
    pass_fail?: string
    published_at: string
  }>
}

export interface PaymentRequest {
  id: number
  request_id: string
  user_id: number
  fee_structure_id?: number
  semester_id?: number
  semester_name?: string
  academic_year?: string
  amount_paid: number
  payment_date?: string
  payment_proof?: string
  transaction_id: string
  bank_name?: string
  upi_reference?: string
  status: string
  verified_by?: number
  verified_at?: string
  remarks?: string
  receipt_number?: string
  receipt_path?: string
  is_resubmitted?: boolean
  original_request_id?: number
  created_at: string
  updated_at: string
  student_name?: string
  roll_number?: string
  department?: string
  department_code?: string
  verifier_name?: string
}

export interface Result {
  id: number
  user_id: number
  semester: string
  gpa: number
  total_marks?: number
  percentage?: number
  grade?: string
  pass_fail?: string
  details?: string
  published_at: string
  created_at: string
  updated_at: string
}

export interface BonafideRequest {
  id: number
  user_id: number
  purpose?: string
  reason?: string
  required_date?: string
  additional_notes?: string
  status: string
  approved_by?: number
  remarks?: string
  certificate_path?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  recipient_type: string
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

export interface Semester {
  id: number
  name: string
  academic_year: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface FeeStructure {
  id: number
  semester_id: number
  fee_name: string
  amount: number
  due_date: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: number
  user_id: number
  roll_number: string
  admission_date: string
  current_semester?: number
  department_id: number
  gpa?: string
  created_at: string
  updated_at: string
}

export interface Staff {
  id: number
  user_id: number
  staff_id: string
  hire_date: string
  department_id: number
  created_at: string
  updated_at: string
}

export interface WorkQueueStats {
  pending_payments: number
  pending_bonafides: number
  pending_results: number
  pending_documents: number
  pending_profile_corrections: number
  completed_today: number
  rejected_today: number
  completed_today_payments: number
  rejected_today_payments: number
  completed_today_documents: number
  rejected_today_documents: number
  total_bonafides: number
  recent_activities?: Array<{
    type: string
    event: string
    timestamp: string
    details: string
    status: string
  }>
  today_notifications?: Array<{
    id: number
    title: string
    message: string
    category?: string
    is_read: boolean
    created_at: string
  }>
  unified_stats?: {
    pending_payments: number
    pending_documents: number
    pending_results: number
    processing: number
    completed_today: number
    rejected_today: number
  }
}

export interface StaffDocumentType {
  id: number
  code: string
  name: string
  description?: string
  is_active: boolean
  requires_approval?: boolean
  validity_days?: number | null
  certificate_prefix: string
  certificate_title: string
  allowed_purposes: string[]
  template_fields?: Record<string, any> | string
  created_at: string
  updated_at: string
}

export interface DocumentRequest {
  id: number
  request_number: string
  user_id: number
  document_type_id: number
  document_type?: {
    id: number
    code: string
    name: string
    description?: string
    certificate_prefix: string
    certificate_title: string
    is_active: boolean
    requires_approval?: boolean
  }
  purpose?: string
  reason?: string
  required_date?: string
  additional_notes?: string
  attachment_path?: string
  status: string
  reviewed_by?: number
  reviewed_at?: string
  review_remarks?: string
  certificate_path?: string
  certificate_number?: string
  verification_code?: string
  issued_at?: string
  issued_by?: number
  downloaded_at?: string
  is_archived: boolean
  created_at: string
  updated_at: string
  requester_name?: string
  requester_email?: string
  roll_number?: string
  department?: string
  department_code?: string
  semester?: number
  reviewer_name?: string
  issuer_name?: string
  history?: Array<{
    event: string
    timestamp?: string
    notes?: string
    reviewed_by?: string
    issued_by?: string
  }>
}

export interface DocumentRequestFormData {
  document_type_id: number
  purpose: string
  reason: string
  required_date: string
  additional_notes: string
  attachment?: string
}

export interface DocumentWorkQueueStats {
  pending_document_requests: number
  approved_document_requests: number
  returned_document_requests: number
  rejected_document_requests: number
  total_document_requests: number
  archived_requests: number
  pending_payments: number
  pending_results: number
  completed_today: number
  rejected_today: number
}

export interface CertificateVerificationResult {
  certificate_number: string
  verification_code: string
  status: string
  is_valid: boolean
  verification_status: string
  message: string
  issued_at?: string
  student_name: string
  roll_number: string
  document_type: string
  certificate_title: string
  issued_by?: number
}
