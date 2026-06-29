import api from './api'

export interface DocumentRequestFormData {
  document_type_id: number
  purpose: string
  reason: string
  required_date: string
  additional_notes: string
  attachment?: string
}

export interface DocumentType {
  id: number
  code: string
  name: string
  description?: string
  is_active: boolean
  requires_approval: boolean
  validity_days?: number
  certificate_prefix: string
  certificate_title: string
  allowed_purposes: string[]
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

export const documentRequestApi = {
  getDocumentTypes: async (): Promise<{ document_types: DocumentType[] }> => {
    const response = await api.get('/api/v1/student/documents/types')
    return response.data
  },

  createRequest: async (data: {
    document_type_id: number
    purpose: string
    reason: string
    required_date: string
    additional_notes?: string
  }): Promise<DocumentRequest> => {
    const response = await api.post('/api/v1/student/documents/request', data)
    return response.data
  },

  getStudentRequests: async (status?: string): Promise<{ requests: DocumentRequest[] }> => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.append('status', status)
    const response = await api.get(`/api/v1/student/documents/requests?${params.toString()}`)
    return response.data
  },

  getRequestDetail: async (requestId: number): Promise<DocumentRequest> => {
    const response = await api.get(`/api/v1/student/documents/requests/${requestId}/detail`)
    return response.data
  },

  downloadCertificate: async (requestId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/student/documents/download/${requestId}`, {
      responseType: 'blob',
    })
    return response.data
  },

  getDocumentHistory: async (): Promise<{ history: DocumentRequest[] }> => {
    const response = await api.get('/api/v1/student/documents/history')
    return response.data
  },
}

export const staffDocumentApi = {
  getWorkQueue: async (): Promise<any> => {
    const response = await api.get('/api/v1/staff/documents/work-queue')
    return response.data
  },

  getAllRequests: async (params?: {
    status?: string
    document_type_id?: number
    department_id?: number
    search?: string
    skip?: number
    limit?: number
  }): Promise<{ requests: DocumentRequest[]; total: number }> => {
    const queryParams = new URLSearchParams()
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status)
    if (params?.document_type_id) queryParams.append('document_type_id', params.document_type_id.toString())
    if (params?.department_id) queryParams.append('department_id', params.department_id.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.skip) queryParams.append('skip', params.skip.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    const response = await api.get(`/api/v1/staff/documents/requests?${queryParams.toString()}`)
    return response.data
  },

  getDocumentTypes: async (): Promise<{ document_types: DocumentType[] }> => {
    const response = await api.get('/api/v1/staff/documents/request-types')
    return response.data
  },

  reviewRequest: async (
    requestId: number,
    data: { status: string; remarks: string }
  ): Promise<DocumentRequest> => {
    const response = await api.put(`/api/v1/staff/documents/requests/${requestId}/review`, data)
    return response.data
  },

  issueDocument: async (requestId: number): Promise<DocumentRequest> => {
    const response = await api.post(`/api/v1/staff/documents/requests/${requestId}/issue`)
    return response.data
  },

  previewDocument: async (requestId: number): Promise<Blob> => {
    const response = await api.get(`/api/v1/staff/documents/requests/${requestId}/preview`, {
      responseType: 'blob',
    })
    return response.data
  },
}

export const adminDocumentApi = {
  getDocumentTypes: async (skip = 0, limit = 100): Promise<{ document_types: DocumentType[] }> => {
    const response = await api.get(`/api/v1/admin/document-types/?skip=${skip}&limit=${limit}`)
    return response.data
  },

  getDocumentType: async (typeId: number): Promise<DocumentType> => {
    const response = await api.get(`/api/v1/admin/document-types/${typeId}`)
    return response.data
  },

  createDocumentType: async (data: any): Promise<any> => {
    const payload: any = { ...data }
    if (Array.isArray(data.allowed_purposes)) {
      payload.allowed_purposes = JSON.stringify(data.allowed_purposes)
    }
    if (data.template_fields && typeof data.template_fields === 'object') {
      payload.template_fields = JSON.stringify(data.template_fields)
    }
    const response = await api.post('/api/v1/admin/document-types/', payload)
    return response.data
  },

  updateDocumentType: async (
    typeId: number,
    data: Partial<Omit<DocumentType, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<DocumentType> => {
    const response = await api.put(`/api/v1/admin/document-types/${typeId}`, data)
    return response.data
  },

  deleteDocumentType: async (typeId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/v1/admin/document-types/${typeId}`)
    return response.data
  },

  activateDocumentType: async (typeId: number): Promise<{ message: string }> => {
    const response = await api.put(`/api/v1/admin/document-types/${typeId}/activate`)
    return response.data
  },
}

export const verifyApi = {
  verifyCertificate: async (certificateNumber: string): Promise<any> => {
    const response = await api.get(`/api/v1/verify/${encodeURIComponent(certificateNumber)}`)
    return response.data
  },
}
