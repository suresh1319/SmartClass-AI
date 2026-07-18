import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Camera, 
  ChevronLeft, 
  ArrowRight, 
  User, 
  Key, 
  Search,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { loginStudent, getAllStudents, type Student } from '../services/api';

const StudentLogin: React.FC = () => {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick access helper
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await getAllStudents();
        setStudents(res.students);
      } catch (err) {
        console.error('Failed to load students list:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await loginStudent(rollNumber.trim());
      // Store student info in localStorage to persist login
      localStorage.setItem('studentRollNumber', res.student.rollNumber);
      localStorage.setItem('studentName', res.student.fullName);
      navigate('/student/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Failed to sign in. Please verify your Roll Number.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (rollNo: string) => {
    setRollNumber(rollNo);
    setError(null);
  };

  // Filter students for quick selection
  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex flex-col justify-between">
      {/* Decorative blurs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5 z-10 relative">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mr-4"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              SmartClass <span className="text-gradient font-black">AI</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
              Student Access
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-stretch gap-10 z-10 flex-grow justify-center">
        {/* Login Card */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="glass-card rounded-3xl p-8 lg:p-10 shadow-2xl relative">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                Student <span className="text-gradient">Portal</span>
              </h2>
              <p className="text-gray-400 text-sm">
                Enter your unique Roll Number to check attendance stats, view monthly reports, and verify academic assessments.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-pulse">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Roll Number / Biometric ID
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., 20CSE102"
                    value={rollNumber}
                    onChange={(e) => {
                      setRollNumber(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-dark-900/60 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/35 focus:ring-1 focus:ring-brand-500/25 text-base transition-all font-mono uppercase tracking-wide"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !rollNumber.trim()}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all duration-300 hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Quick Selection Dropdown (Tester Helper) */}
        <div className="w-full lg:w-[400px] flex flex-col justify-center">
          <div className="glass-card rounded-3xl p-6 h-[420px] flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-brand-400" />
                <h3 className="font-bold text-white text-sm">Quick Access (Registered Students)</h3>
              </div>
              <p className="text-[11px] text-gray-500">
                Select a student from the registered list below to test their student dashboard.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-dark-900/60 border border-white/5 rounded-xl text-white text-xs placeholder:text-gray-600 focus:border-brand-500/30 text-sm transition-colors"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingStudents ? (
                <div className="flex items-center justify-center h-full text-gray-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                  <span className="text-xs">Loading students...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  No students registered yet. Please register first.
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.rollNumber}
                    onClick={() => selectStudent(s.rollNumber)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all ${
                      rollNumber.trim().toUpperCase() === s.rollNumber
                        ? 'bg-brand-500/10 border-brand-500/30'
                        : 'bg-dark-800/40 border-white/5 hover:border-brand-500/15'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{s.fullName}</p>
                      <p className="text-[10px] text-gray-500">
                        {s.department} • {s.branch} • Sec {s.section}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] bg-dark-900 px-2 py-1 rounded text-brand-400 border border-white/5 font-semibold">
                      {s.rollNumber
                    }</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-5 border-t border-white/5 text-center text-xs text-gray-600 z-10">
        <p>© 2026 SmartClass AI - College Major Attendance Project. Powered by Computer Vision & MongoDB.</p>
      </footer>
    </div>
  );
};

export default StudentLogin;
