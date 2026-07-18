import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Video,
  VideoOff,
  Loader2,
  LogOut,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { 
  getStudentDashboard, 
  markAttendanceByFace, 
  type StudentDashboardData, 
  type Assessment 
} from '../services/api';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Authentication check
  useEffect(() => {
    const storedRoll = localStorage.getItem('studentRollNumber');
    const storedName = localStorage.getItem('studentName');
    if (!storedRoll) {
      navigate('/student/login');
    } else {
      setRollNumber(storedRoll);
      setName(storedName);
    }
  }, [navigate]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (rollNo: string, showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await getStudentDashboard(rollNo);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (rollNumber) {
      fetchDashboardData(rollNumber);
    }
  }, [rollNumber, fetchDashboardData]);

  const handleRefresh = async () => {
    if (!rollNumber) return;
    setIsRefreshing(true);
    await fetchDashboardData(rollNumber, false);
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('studentRollNumber');
    localStorage.removeItem('studentName');
    navigate('/student/login');
  };

  /* ---------- Helpers ---------- */
  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const getAttendanceStatusConfig = (status: 'present' | 'absent' | 'weekend') => {
    switch (status) {
      case 'present':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          indicator: 'bg-emerald-500 shadow-emerald-500/30',
          label: 'Present',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'absent':
        return {
          bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
          indicator: 'bg-rose-500 shadow-rose-500/30',
          label: 'Absent',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />
        };
      case 'weekend':
      default:
        return {
          bg: 'bg-dark-800/40 border-white/5 text-gray-500',
          indicator: 'bg-dark-600',
          label: 'No Class',
          icon: <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d0f] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-3" />
        <p className="text-sm text-gray-400">Loading student workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0c0d0f] flex flex-col items-center justify-center text-white p-6">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
          <h3 className="text-xl font-bold">Failed to load workspace</h3>
          <p className="text-sm text-gray-400">{error || 'Data retrieval returned empty payload.'}</p>
          <button
            onClick={() => rollNumber && fetchDashboardData(rollNumber)}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-colors"
          >
            Retry Fetch
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const { student, todayStatus, overallAttendancePercent, streak, attendanceStats, monthlyStats, dailyAttendance, assessments } = data;

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden pb-12">
      {/* Decorative blurs */}
      <div className="absolute top-[-25%] left-[-10%] w-[55%] h-[55%] bg-brand-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/8 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Student <span className="text-gradient font-black">Workspace</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
              SmartClass AI • Student Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-900/60 border border-white/5 hover:border-brand-500/20 text-gray-400 hover:text-white transition-all text-xs font-semibold disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/25 hover:border-rose-500/40 text-rose-400 transition-all text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 py-6 space-y-6 z-10 relative">
        
        {/* Profile Card Header */}
        <section className="glass-card rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-brand-500/20 border border-white/10 uppercase">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">{student.fullName}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-sm text-gray-400">
                <span className="font-mono bg-dark-900 border border-white/5 px-2 py-0.5 rounded text-brand-400 text-xs font-semibold uppercase">
                  {student.rollNumber}
                </span>
                <span>•</span>
                <span>{student.department} ({student.branch})</span>
                <span>•</span>
                <span>Year {student.year} • Sec {student.section}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{student.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Biometric Status</p>
              <p className="text-xs font-bold text-emerald-400 capitalize">{student.status}</p>
            </div>
          </div>
        </section>

        {/* Daily Scan / Check-in Status Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Check-In Card */}
          <div className={`lg:col-span-6 rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 ${
            todayStatus.marked 
              ? 'bg-emerald-500/5 border-emerald-500/25 shadow-lg shadow-emerald-500/5' 
              : 'bg-amber-500/5 border-amber-500/25 shadow-lg shadow-amber-500/5'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Daily Scanning Checklist</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  todayStatus.marked 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}>
                  {todayStatus.marked ? 'Checked-In' : 'Pending Check-In'}
                </span>
              </div>

              {todayStatus.marked ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Attendance Logged Successfully</h3>
                      <p className="text-xs text-gray-400">
                        Marked present today at <span className="text-white font-semibold">{formatTime(todayStatus.timestamp)}</span>.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 p-3 bg-dark-900/60 border border-white/5 rounded-xl flex justify-between">
                    <span>Verification Method: <strong className="capitalize text-white">{todayStatus.method}</strong></span>
                    {todayStatus.confidence && todayStatus.confidence < 1 && (
                      <span>Confidence Score: <strong className="text-emerald-400 font-semibold">{(todayStatus.confidence * 100).toFixed(1)}%</strong></span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Check-In Required Today</h3>
                      <p className="text-xs text-gray-400">
                        Please check in at the secure classroom kiosk scanning terminal to mark today's attendance.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-500 mt-4 border-t border-white/5 pt-3">
              Note: Attendance tracking closes at 12:00 PM daily. Please scan on time.
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            
            {/* Overall Card */}
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-[-30%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[30px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div>
                <p className="text-3xl font-black text-white">{overallAttendancePercent}%</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Average Attendance</p>
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border mt-2 ${
                  attendanceStats.status === 'Good' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : attendanceStats.status === 'Warning' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {attendanceStats.status === 'Good' ? 'Healthy Range' : attendanceStats.status === 'Warning' ? 'Needs Attention' : 'Attendance Critical'}
                </span>
              </div>
              
              {/* Custom SVG Circular Progress Ring */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="24" className="stroke-dark-800 fill-none" strokeWidth="4" />
                  <circle 
                    cx="28" 
                    cy="28" 
                    r="24" 
                    className={`fill-none transition-all duration-1000 ${
                      attendanceStats.status === 'Good' 
                        ? 'stroke-emerald-500' 
                        : attendanceStats.status === 'Warning' 
                          ? 'stroke-amber-500' 
                          : 'stroke-rose-500'
                    }`} 
                    strokeWidth="4" 
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - overallAttendancePercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <Percent className="w-3.5 h-3.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Streak Card */}
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-[-30%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[30px] pointer-events-none group-hover:scale-125 transition-transform" />
              <div>
                <p className="text-3xl font-black text-white">{streak} Days</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Check-in Streak</p>
                <p className="text-[9px] text-gray-400 mt-2 font-medium">
                  {streak >= 5 ? '🔥 Excellent consistency!' : streak > 0 ? '👍 Keep it up!' : '😴 Start a new streak today.'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                <Zap className="w-5 h-5 fill-orange-400" />
              </div>
            </div>

            {/* Present Days Card */}
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div>
                <p className="text-3xl font-black text-white">{attendanceStats.presentDays}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Classes Attended</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Absent Days Card */}
            <div className="glass-card rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
              <div>
                <p className="text-3xl font-black text-white">{attendanceStats.absentDays}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">Classes Missed</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

          </div>

        </section>

        {/* Calendar and Monthly History Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendar Grid (Past 30 Days) - 8 Columns */}
          <div className="lg:col-span-8 glass-card rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white text-base">Everyday Attendance Tracker</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Last 30 Calendar Days</span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-semibold mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md bg-rose-500" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md bg-dark-800 border border-white/5" />
                <span>Weekend / No Class</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md bg-amber-500 animate-pulse" />
                <span>Today's Pending Scan</span>
              </div>
            </div>

            {/* Attendance Blocks Layout */}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
              {dailyAttendance.slice().reverse().map((day) => {
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const showPending = isToday && !todayStatus.marked;
                
                let blockBg = 'bg-dark-800 border-white/5 hover:border-white/10';
                let indicator = 'bg-gray-600';
                let text = 'text-gray-400';
                
                if (showPending) {
                  blockBg = 'bg-amber-500/10 border-amber-500/35 hover:border-amber-500/50';
                  indicator = 'bg-amber-500 animate-pulse';
                  text = 'text-amber-400';
                } else if (day.status === 'present') {
                  blockBg = 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40';
                  indicator = 'bg-emerald-500';
                  text = 'text-white';
                } else if (day.status === 'absent') {
                  blockBg = 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40';
                  indicator = 'bg-rose-500';
                  text = 'text-white';
                }

                // Format date for box display
                const d = new Date(day.date);
                const dayNum = d.getDate();
                const monthName = d.toLocaleString('en-US', { month: 'short' });
                
                return (
                  <div
                    key={day.date}
                    className={`rounded-xl p-3 border text-center flex flex-col items-center justify-between h-20 transition-all ${blockBg}`}
                    title={`${day.date} (${day.dayOfWeek}) - ${showPending ? 'Pending Biometric Scan' : day.status}`}
                  >
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{monthName}</span>
                    <span className={`text-lg font-black leading-none ${text}`}>{dayNum}</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${indicator}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Breakdown Table - 4 Columns */}
          <div className="lg:col-span-4 glass-card rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <TrendingUp className="w-5 h-5 text-brand-400" />
              <h3 className="font-bold text-white text-base">Monthly Aggregates</h3>
            </div>

            <div className="space-y-4 flex-grow overflow-y-auto">
              {monthlyStats.map((mon) => (
                <div 
                  key={mon.month} 
                  className="p-4 rounded-2xl bg-dark-800/40 border border-white/5 hover:border-brand-500/10 transition-colors"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-extrabold text-white">{mon.month}</span>
                    <span className={`text-xs font-black ${
                      mon.percent >= 85 ? 'text-emerald-400' : mon.percent >= 75 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {mon.percent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-dark-900 rounded-full overflow-hidden mb-2.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        mon.percent >= 85 ? 'bg-emerald-500' : mon.percent >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${mon.percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-500 font-semibold uppercase">
                    <span>Present: <strong className="text-white">{mon.present}</strong></span>
                    <span>Absent: <strong className="text-white">{mon.absent}</strong></span>
                    <span>Class Days: <strong className="text-white">{mon.total}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Academic Assessments Section */}
        <section className="glass-card rounded-3xl p-6 lg:p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-400" />
              <h3 className="font-bold text-white text-lg">Academic Assessment Dashboard</h3>
            </div>
            <div className="text-xs text-gray-400 font-semibold bg-dark-900 border border-white/5 px-3 py-1 rounded-xl">
              Average Grade: <span className="text-brand-400 font-bold">A</span>
            </div>
          </div>

          {assessments.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-base font-semibold">No assessments evaluated yet</p>
              <p className="text-xs">Your grades and examination feedback will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessments.map((item, idx) => {
                let gradeColor = 'bg-brand-500/10 border-brand-500/20 text-brand-400';
                if (item.grade === 'O' || item.grade === 'A+') {
                  gradeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                } else if (item.grade === 'B' || item.grade === 'B+') {
                  gradeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                } else if (item.grade === 'F') {
                  gradeColor = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                }

                return (
                  <div 
                    key={`${item.title}-${idx}`} 
                    className="p-5 rounded-2xl bg-dark-800/40 border border-white/5 hover:border-brand-500/15 hover:bg-dark-800/60 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 block mb-0.5">{item.subject}</span>
                          <h4 className="text-sm font-extrabold text-white">{item.title}</h4>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gradeColor}`}>
                          Grade {item.grade}
                        </span>
                      </div>
                      
                      {/* Marks Obtained percentage */}
                      <div className="flex justify-between items-center text-xs mt-3 mb-1">
                        <span className="text-gray-400">Score Evaluated</span>
                        <span className="text-gray-200 font-semibold">
                          {item.marksObtained} / {item.maxMarks} ({((item.marksObtained / item.maxMarks) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1 bg-dark-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-500 rounded-full" 
                          style={{ width: `${(item.marksObtained / item.maxMarks) * 100}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-400 mt-4 leading-relaxed italic bg-dark-900/40 p-3 rounded-xl border border-white/[0.02]">
                        "{item.feedback}"
                      </p>
                    </div>

                    <div className="text-[10px] text-gray-500 mt-4 text-right">
                      Evaluated on: {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default StudentDashboard;
