import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Users,
  UserCheck,
  UserX,
  BarChart3,
  ScanFace,
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Search,
  HandMetal,
  Loader2,
  Video,
  VideoOff,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  markAttendanceByFace,
  getTodayAttendance,
  getAttendanceStats,
  getAllStudents,
  markAttendanceManual,
  clearTodayAttendance,
  type AttendanceRecord,
  type AttendanceStats,
  type Student,
} from '../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
type Tab = 'scanner' | 'records' | 'manual';

interface ScanResult {
  id: number;
  success: boolean;
  name: string;
  rollNumber: string;
  confidence: number;
  message: string;
  alreadyMarked: boolean;
  ts: number;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                         */
/* ------------------------------------------------------------------ */
const Dashboard: React.FC = () => {
  /* ---------- state ---------- */
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  
  // Passcode Lock States (Restricting admin scanner route)
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const appendDigit = (digit: string) => {
    setPinError(false);
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin === '1234') {
        setUnlocked(true);
      } else if (newPin.length === 4) {
        setPinError(true);
        setTimeout(() => setPin(''), 600);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  // Stats
  const [stats, setStats] = useState<AttendanceStats>({
    totalEnrolled: 0,
    presentToday: 0,
    absentToday: 0,
    attendancePercent: 0,
  });

  // Attendance records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Scanner
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [currentScan, setCurrentScan] = useState<string>('Idle');
  const [scanBusy, setScanBusy] = useState(false);

  // Manual
  const [students, setStudents] = useState<Student[]>([]);
  const [manualSearch, setManualSearch] = useState('');
  const [manualLoading, setManualLoading] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanIdRef = useRef(0);
  const scanBusyRef = useRef(false);

  /* ---------- data fetching ---------- */
  const refreshStats = useCallback(async () => {
    console.log('[Dashboard] Fetching stats...');
    try {
      const s = await getAttendanceStats();
      console.log('[Dashboard] Stats received:', s);
      setStats(s);
    } catch (err) {
      console.error('[Dashboard] Error fetching stats:', err);
    }
  }, []);

  const refreshRecords = useCallback(async () => {
    console.log('[Dashboard] Fetching records...');
    try {
      const r = await getTodayAttendance();
      console.log('[Dashboard] Records received:', r);
      setRecords(r.records);
    } catch (err) {
      console.error('[Dashboard] Error fetching records:', err);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    console.log('[Dashboard] Fetching students...');
    try {
      const r = await getAllStudents();
      console.log('[Dashboard] Students received count:', r.students.length);
      setStudents(r.students);
    } catch (err) {
      console.error('[Dashboard] Error fetching students:', err);
    }
  }, []);

  const handleRefresh = async () => {
    console.log('[Dashboard] Refresh clicked. Starting Promise.all...');
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshStats(),
        refreshRecords(),
        refreshStudents()
      ]);
      console.log('[Dashboard] Refresh complete.');
    } catch (err) {
      console.error('[Dashboard] Promise.all failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearAttendance = async () => {
    if (!window.confirm("Are you sure you want to clear/reset all of today's attendance records?")) {
      return;
    }
    console.log('[Dashboard] Clearing today\'s attendance...');
    setIsRefreshing(true);
    try {
      const res = await clearTodayAttendance();
      console.log('[Dashboard] Clear result:', res);
      setScanResults([]); // Clear the scan list on screen
      setCurrentScan('Attendance reset!');
      await Promise.all([
        refreshStats(),
        refreshRecords(),
        refreshStudents()
      ]);
    } catch (err) {
      console.error('[Dashboard] Error clearing attendance:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshStats();
    refreshRecords();
    refreshStudents();
    const iv = setInterval(() => {
      refreshStats();
      refreshRecords();
    }, 8000);
    return () => clearInterval(iv);
  }, [refreshStats, refreshRecords, refreshStudents]);

  /* ---------- camera ---------- */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setCameraReady(true);
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  /* ---------- scanning loop ---------- */
  const doSingleScan = useCallback(async () => {
    if (scanBusyRef.current) return;
    const frame = captureFrame();
    if (!frame) return;

    scanBusyRef.current = true;
    setScanBusy(true);
    setCurrentScan('Analyzing...');

    try {
      const res = await markAttendanceByFace(frame);

      if (res.results && res.results.length > 0) {
        const newResults: ScanResult[] = [];
        const recognizedNames: string[] = [];
        const alreadyMarkedNames: string[] = [];

        for (const item of res.results) {
          scanIdRef.current += 1;
          const isSuccess = !!(item.success && item.student);
          
          const result: ScanResult = {
            id: scanIdRef.current,
            success: isSuccess,
            name: item.student ? item.student.fullName : '',
            rollNumber: item.student ? item.student.rollNumber : '',
            confidence: item.confidence,
            message: item.reason,
            alreadyMarked: item.alreadyMarked,
            ts: Date.now(),
          };
          newResults.push(result);

          if (isSuccess) {
            if (item.alreadyMarked) {
              alreadyMarkedNames.push(item.student!.fullName);
            } else {
              recognizedNames.push(item.student!.fullName);
            }
          }
        }

        // Add to state
        setScanResults((prev) => [...newResults, ...prev].slice(0, 20));

        // Create summary string
        let summary = '';
        if (recognizedNames.length > 0) {
          summary += `✓ Marked: ${recognizedNames.join(', ')} `;
        }
        if (alreadyMarkedNames.length > 0) {
          summary += `(Already marked: ${alreadyMarkedNames.join(', ')}) `;
        }
        if (summary === '') {
          const unknownCount = res.results.filter((r) => !r.success).length;
          summary = `${unknownCount} unknown face${unknownCount > 1 ? 's' : ''} detected`;
        }
        setCurrentScan(summary.trim());

        refreshStats();
        refreshRecords();
      } else {
        // Fallback for single face response format
        scanIdRef.current += 1;

        if (res.success && res.student) {
          const result: ScanResult = {
            id: scanIdRef.current,
            success: true,
            name: res.student.fullName,
            rollNumber: res.student.rollNumber,
            confidence: res.confidence,
            message: res.reason,
            alreadyMarked: res.alreadyMarked,
            ts: Date.now(),
          };
          setScanResults((prev) => [result, ...prev].slice(0, 20));
          setCurrentScan(
            res.alreadyMarked
              ? `${res.student.fullName} already marked ✓`
              : `✓ ${res.student.fullName} marked present!`
          );
          refreshStats();
          refreshRecords();
        } else {
          const result: ScanResult = {
            id: scanIdRef.current,
            success: false,
            name: '',
            rollNumber: '',
            confidence: res.confidence,
            message: res.reason,
            alreadyMarked: false,
            ts: Date.now(),
          };
          setScanResults((prev) => [result, ...prev].slice(0, 20));
          setCurrentScan(res.reason);
        }
      }
    } catch (err) {
      setCurrentScan('Server error');
    } finally {
      scanBusyRef.current = false;
      setScanBusy(false);
    }
  }, [captureFrame, refreshStats, refreshRecords]);

  const startScanning = useCallback(() => {
    setScanning(true);
    // Scan immediately, then every 2.5s
    doSingleScan();
    scanIntervalRef.current = setInterval(() => {
      doSingleScan();
    }, 2500);
  }, [doSingleScan]);

  const stopScanning = useCallback(() => {
    setScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCurrentScan('Idle');
  }, []);

  // Start camera when scanner tab is active
  useEffect(() => {
    if (activeTab === 'scanner') {
      startCamera();
    } else {
      stopScanning();
      stopCamera();
    }
    return () => {
      stopScanning();
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera, stopScanning]);

  /* ---------- manual mark ---------- */
  const handleManualMark = async (rollNumber: string) => {
    setManualLoading(rollNumber);
    try {
      await markAttendanceManual(rollNumber);
      refreshStats();
      refreshRecords();
    } catch {
      /* ignore */
    } finally {
      setManualLoading(null);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(manualSearch.toLowerCase())
  );

  /* ---------- helpers ---------- */
  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex items-center justify-center p-6">
        {/* Decorative blurs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-500/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-sm glass-card rounded-3xl p-8 shadow-2xl relative flex flex-col items-center text-center gap-6">
          <div className="w-full flex items-center justify-start">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 border border-white/10">
            <ScanFace className={`w-7 h-7 ${pinError ? 'text-rose-400 animate-bounce' : 'text-white'}`} />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Kiosk Lock Terminal</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
              Scanning & administrative access restricted. Enter Classroom PIN to unlock.
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-4 my-1">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full border transition-all duration-200 ${
                  pinError 
                    ? 'border-rose-500/40 bg-rose-500 animate-pulse' 
                    : idx < pin.length
                      ? 'bg-brand-500 border-brand-400 shadow-md shadow-brand-500/40 scale-110'
                      : 'border-white/10 bg-white/5'
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          <div className="h-4 text-[11px] font-semibold tracking-wide">
            {pinError ? (
              <span className="text-rose-400">Incorrect Passcode. Try again.</span>
            ) : (
              <span className="text-gray-600 font-medium">Hint: Default PIN is 1234</span>
            )}
          </div>

          {/* Touch keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => appendDigit(digit)}
                className="h-12 rounded-xl bg-dark-900/60 hover:bg-dark-850 border border-white/5 text-lg font-bold text-white transition-all active:scale-95 cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => { setPin(''); setPinError(false); }}
              className="h-12 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-400 hover:text-white active:scale-95 cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => appendDigit('0')}
              className="h-12 rounded-xl bg-dark-900/60 hover:bg-dark-850 border border-white/5 text-lg font-bold text-white transition-all active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-12 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-400 hover:text-white active:scale-95 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-brand-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Attendance <span className="text-gradient font-black">Dashboard</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
              SmartClass AI • Live Monitoring
            </p>
          </div>
        </div>

        {/* Live clock */}
        <LiveClock />
      </header>

      {/* Stats row */}
      <section className="w-full max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 z-10 relative">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Enrolled"
          value={stats.totalEnrolled}
          color="brand"
        />
        <StatCard
          icon={<UserCheck className="w-5 h-5" />}
          label="Present Today"
          value={stats.presentToday}
          color="emerald"
        />
        <StatCard
          icon={<UserX className="w-5 h-5" />}
          label="Absent Today"
          value={stats.absentToday}
          color="rose"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Attendance %"
          value={`${stats.attendancePercent}%`}
          color="amber"
        />
      </section>

      {/* Tabs */}
      <div className="w-full max-w-7xl mx-auto px-6 z-10 relative flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-1 bg-dark-900/60 border border-white/5 rounded-xl p-1 w-fit">
          <TabButton
            active={activeTab === 'scanner'}
            onClick={() => setActiveTab('scanner')}
            icon={<ScanFace className="w-4 h-4" />}
            label="Face Scanner"
          />
          <TabButton
            active={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
            icon={<Clock className="w-4 h-4" />}
            label="Today's Records"
          />
          <TabButton
            active={activeTab === 'manual'}
            onClick={() => setActiveTab('manual')}
            icon={<HandMetal className="w-4 h-4" />}
            label="Manual Mark"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-900/60 border border-white/5 hover:border-brand-500/20 text-gray-300 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
            title="Reload metrics and attendance table"
          >
            <RefreshCw className={`w-4 h-4 text-brand-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleClearAttendance}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 transition-all text-sm font-medium disabled:opacity-50"
            title="Clear all of today's attendance records"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Today's Attendance</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main className="w-full max-w-7xl mx-auto px-6 py-6 z-10 relative">
        {/* ----- SCANNER TAB ----- */}
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Camera Feed — 3 columns */}
            <div className="lg:col-span-3 glass-card rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-brand-400" />
                  <h2 className="font-semibold text-white">Live Camera Feed</h2>
                </div>
                <div className="flex items-center gap-2">
                  {cameraReady ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Camera Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-dark-800 px-2.5 py-1 rounded-full border border-white/5">
                      <VideoOff className="w-3 h-3" />
                      Camera Off
                    </span>
                  )}
                </div>
              </div>

              {/* Video container */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scan overlay */}
                {scanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Scanning animation border */}
                    <div className="absolute inset-4 border-2 border-brand-400/40 rounded-xl animate-pulse" />
                    {/* Corner markers */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-400 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-400 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-400 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-400 rounded-br-lg" />
                    {/* Scan line */}
                    <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-scan-line" />
                  </div>
                )}

                {/* Status bar at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-300 flex items-center gap-1.5">
                    {scanBusy ? (
                      <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
                    ) : (
                      <Zap className="w-3 h-3 text-amber-400" />
                    )}
                    {currentScan}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {scanning ? 'Auto-scan every 2.5s' : 'Press Start to scan'}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                {!scanning ? (
                  <button
                    onClick={startScanning}
                    disabled={!cameraReady}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Video className="w-5 h-5" />
                    Start Scanning
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-rose-500/20"
                  >
                    <VideoOff className="w-5 h-5" />
                    Stop Scanning
                  </button>
                )}
              </div>
            </div>

            {/* Scan Results Feed — 2 columns */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-5 flex flex-col gap-3 max-h-[600px]">
              <div className="flex items-center gap-2">
                <ScanFace className="w-5 h-5 text-brand-400" />
                <h2 className="font-semibold text-white">Scan Results</h2>
                <span className="ml-auto text-xs text-gray-500">{scanResults.length} scans</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {scanResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <ScanFace className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">No scans yet</p>
                    <p className="text-xs">Start scanning to see results</p>
                  </div>
                ) : (
                  scanResults.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-xl p-3 border transition-all duration-300 ${
                        r.success
                          ? r.alreadyMarked
                            ? 'bg-amber-500/5 border-amber-500/15'
                            : 'bg-emerald-500/5 border-emerald-500/15'
                          : 'bg-dark-800/50 border-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {r.success ? (
                          r.alreadyMarked ? (
                            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          )
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          {r.success ? (
                            <>
                              <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                              <p className="text-xs text-gray-400">
                                {r.rollNumber} • {(r.confidence * 100).toFixed(1)}% match
                              </p>
                              <p
                                className={`text-xs mt-0.5 ${
                                  r.alreadyMarked ? 'text-amber-400' : 'text-emerald-400'
                                }`}
                              >
                                {r.message}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-400">{r.message}</p>
                              {r.confidence > 0 && (
                                <p className="text-xs text-gray-500">
                                  Best match: {(r.confidence * 100).toFixed(1)}%
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">
                          {new Date(r.ts).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----- RECORDS TAB ----- */}
        {activeTab === 'records' && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-400" />
                <h2 className="font-semibold text-white">Today's Attendance Records</h2>
              </div>
              <span className="text-sm text-gray-400">{records.length} records</span>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">No attendance records yet today</p>
                <p className="text-sm">Start scanning faces to mark attendance</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Student</th>
                      <th className="pb-3 pr-4">Roll No</th>
                      <th className="pb-3 pr-4">Dept / Branch</th>
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">Method</th>
                      <th className="pb-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.map((rec, idx) => (
                      <tr key={`${rec.rollNumber}-${rec.date}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4 text-gray-500">{idx + 1}</td>
                        <td className="py-3 pr-4 font-medium text-white">{rec.fullName}</td>
                        <td className="py-3 pr-4 text-gray-300 font-mono text-xs">{rec.rollNumber}</td>
                        <td className="py-3 pr-4 text-gray-400">
                          {rec.department} • {rec.branch}
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{fmtTime(rec.timestamp)}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                              rec.method === 'face'
                                ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}
                          >
                            {rec.method === 'face' ? (
                              <ScanFace className="w-3 h-3" />
                            ) : (
                              <HandMetal className="w-3 h-3" />
                            )}
                            {rec.method}
                          </span>
                        </td>
                        <td className="py-3">
                          <ConfidenceBar value={rec.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ----- MANUAL TAB ----- */}
        {activeTab === 'manual' && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HandMetal className="w-5 h-5 text-brand-400" />
                <h2 className="font-semibold text-white">Manual Attendance</h2>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-dark-900/60 border border-white/5 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500/30 focus:ring-1 focus:ring-brand-500/20 text-sm transition-colors"
              />
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No students found</p>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredStudents.map((s) => (
                  <div
                    key={s.rollNumber}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-800/40 border border-white/5 hover:border-brand-500/15 transition-all"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{s.fullName}</p>
                      <p className="text-xs text-gray-400">
                        {s.rollNumber} • {s.department} - {s.branch} • Year {s.year} Sec {s.section}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          s.status === 'enrolled'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}
                      >
                        {s.status}
                      </span>
                      <button
                        onClick={() => handleManualMark(s.rollNumber)}
                        disabled={manualLoading === s.rollNumber}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        {manualLoading === s.rollNumber ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Mark Present
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

/* ================================================================ */
/*  Sub-components                                                  */
/* ================================================================ */

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="text-right">
      <p className="text-sm font-semibold text-white tabular-nums">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-[10px] text-gray-500">
        {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'brand' | 'emerald' | 'rose' | 'amber';
}) {
  const colors = {
    brand: {
      icon: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
      glow: 'shadow-brand-500/10',
    },
    emerald: {
      icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      glow: 'shadow-emerald-500/10',
    },
    rose: {
      icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      glow: 'shadow-rose-500/10',
    },
    amber: {
      icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      glow: 'shadow-amber-500/10',
    },
  };
  const c = colors[color];

  return (
    <div className={`glass-card rounded-2xl p-5 shadow-lg ${c.glow} flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  let color = 'bg-emerald-500';
  if (pct < 60) color = 'bg-rose-500';
  else if (pct < 80) color = 'bg-amber-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
    </div>
  );
}

export default Dashboard;
