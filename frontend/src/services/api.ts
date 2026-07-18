import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface StudentRegisterPayload {
  fullName: string;
  rollNumber: string;
  email: string;
  department: string;
  branch: string;
  year: number;
  section: string;
}

export interface Student {
  fullName: string;
  rollNumber: string;
  email: string;
  department: string;
  branch: string;
  year: number;
  section: string;
  status: string;
  imageCount: number;
  embeddingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateFrameResponse {
  valid: boolean;
  reason: string;
  faceBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
    img_w: number;
    img_h: number;
  };
  count?: number;
}

export interface GenerateEmbeddingsResponse {
  message: string;
  rollNumber: string;
  acceptedImages: number;
  rejectedImages: number;
  totalEmbeddings: number;
}

export const registerStudent = async (payload: StudentRegisterPayload) => {
  const response = await apiClient.post<{ message: string; student: Student }>('/students/register', payload);
  return response.data;
};

export const validateFrame = async (rollNumber: string, pose: string, base64Image: string) => {
  const response = await apiClient.post<ValidateFrameResponse>('/students/validate-frame', {
    rollNumber,
    pose,
    image: base64Image,
  });
  return response.data;
};

export const generateEmbeddings = async (rollNumber: string) => {
  const response = await apiClient.post<GenerateEmbeddingsResponse>('/students/generate-embeddings', {
    rollNumber,
  });
  return response.data;
};

export const getStudentDetails = async (rollNumber: string) => {
  const response = await apiClient.get<Student>(`/students/${rollNumber}`);
  return response.data;
};

export const getAllStudents = async () => {
  const response = await apiClient.get<{ students: Student[]; count: number }>('/students/');
  return response.data;
};

// ---- Attendance Types ----

export interface AttendanceRecord {
  rollNumber: string;
  fullName: string;
  department: string;
  branch: string;
  year: number;
  section: string;
  date: string;
  timestamp: string;
  method: 'face' | 'manual';
  confidence: number;
  status: string;
}

export interface AttendanceStats {
  totalEnrolled: number;
  presentToday: number;
  absentToday: number;
  attendancePercent: number;
}

export interface MarkFaceAttendanceResponse {
  success: boolean;
  alreadyMarked: boolean;
  reason: string;
  student: {
    rollNumber: string;
    fullName: string;
    department: string;
    branch: string;
    year: number;
    section: string;
  } | null;
  confidence: number;
  results?: {
    success: boolean;
    alreadyMarked: boolean;
    reason: string;
    student: {
      rollNumber: string;
      fullName: string;
      department: string;
      branch: string;
      year: number;
      section: string;
    } | null;
    confidence: number;
  }[];
}

// ---- Attendance API ----

export const markAttendanceByFace = async (base64Image: string) => {
  const response = await apiClient.post<MarkFaceAttendanceResponse>('/attendance/mark-by-face', {
    image: base64Image,
  });
  return response.data;
};

export const markAttendanceManual = async (rollNumber: string) => {
  const response = await apiClient.post('/attendance/mark-manual', { rollNumber });
  return response.data;
};

export const getTodayAttendance = async () => {
  const response = await apiClient.get<{ records: AttendanceRecord[]; count: number }>('/attendance/today');
  return response.data;
};

export const getAttendanceStats = async () => {
  const response = await apiClient.get<AttendanceStats>('/attendance/stats');
  return response.data;
};

export const getStudentAttendanceHistory = async (rollNumber: string) => {
  const response = await apiClient.get<{ student: Partial<Student>; records: AttendanceRecord[]; totalPresent: number }>(
    `/attendance/student/${rollNumber}`
  );
  return response.data;
};

export const clearTodayAttendance = async () => {
  const response = await apiClient.post<{ success: boolean; message: string; deletedCount: number }>('/attendance/clear-today');
  return response.data;
};

// ---- Student Dashboard & Login ----

export interface Assessment {
  rollNumber: string;
  title: string;
  subject: string;
  marksObtained: number;
  maxMarks: number;
  type: string;
  grade: string;
  date: string;
  feedback: string;
}

export interface StudentDashboardData {
  student: Student;
  todayStatus: {
    marked: boolean;
    timestamp: string | null;
    method: 'face' | 'manual' | null;
    confidence: number | null;
  };
  overallAttendancePercent: number;
  streak: number;
  attendanceStats: {
    presentDays: number;
    absentDays: number;
    totalDays: number;
    percentage: number;
    status: 'Good' | 'Warning' | 'Critical';
  };
  monthlyStats: {
    month: string;
    present: number;
    absent: number;
    total: number;
    percent: number;
  }[];
  dailyAttendance: {
    date: string;
    dayOfWeek: string;
    status: 'present' | 'absent' | 'weekend';
    method: 'face' | 'manual' | null;
    timestamp: string | null;
  }[];
  assessments: Assessment[];
}

export const loginStudent = async (rollNumber: string) => {
  const response = await apiClient.post<{ message: string; student: Student }>('/students/login', { rollNumber });
  return response.data;
};

export const getStudentDashboard = async (rollNumber: string) => {
  const response = await apiClient.get<StudentDashboardData>(`/students/${rollNumber}/dashboard`);
  return response.data;
};

export default apiClient;
