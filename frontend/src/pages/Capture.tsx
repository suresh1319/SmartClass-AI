import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ShieldAlert, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { validateFrame } from '../services/api';

interface Pose {
  id: string;
  label: string;
  instruction: string;
  requiredCount: number;
}

const POSES: Pose[] = [
  { id: 'straight', label: 'Look Straight', instruction: 'Look directly into the camera with a neutral face.', requiredCount: 20 },
  { id: 'left', label: 'Turn Left', instruction: 'Slowly turn your head to your left side.', requiredCount: 15 },
  { id: 'right', label: 'Turn Right', instruction: 'Slowly turn your head to your right side.', requiredCount: 15 },
  { id: 'up', label: 'Look Up', instruction: 'Tilt your chin up slightly.', requiredCount: 15 },
  { id: 'down', label: 'Look Down', instruction: 'Tilt your chin down slightly.', requiredCount: 15 },
  { id: 'smile', label: 'Smile', instruction: 'Look straight and give a clear smile.', requiredCount: 10 },
  { id: 'neutral', label: 'Neutral Expression', instruction: 'Relax your face and look straight.', requiredCount: 10 },
];

const Capture: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state as { rollNumber: string; fullName: string } | null;

  // Safeguard if user accesses page directly without registration
  useEffect(() => {
    if (!student) {
      navigate('/register');
    }
  }, [student, navigate]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [capturedCounts, setCapturedCounts] = useState<Record<string, number>>({
    straight: 0, left: 0, right: 0, up: 0, down: 0, smile: 0, neutral: 0
  });
  
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<string>('Initializing camera...');
  const [isFaceValid, setIsFaceValid] = useState(true);
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const currentPose = POSES[currentPoseIndex];
  
  // Total progress calculations
  const totalRequired = POSES.reduce((acc, p) => acc + p.requiredCount, 0);
  const totalCaptured = Object.values(capturedCounts).reduce((acc, count) => acc + count, 0);
  const totalPercent = Math.round((totalCaptured / totalRequired) * 100);

  // Initialize camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        activeStream = userStream;
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
        setFeedback('Camera loaded. Click "Start Capture" to begin.');
      } catch (err) {
        setFeedback('Error: Webcam access denied. Please allow camera permissions.');
        setIsFaceValid(false);
      }
    };

    if (student) {
      startCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [student]);

  // Frame processing loop
  useEffect(() => {
    if (!isCapturing || !stream || !videoRef.current || !canvasRef.current || !student) return;

    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout>;

    const processFrame = async () => {
      if (!isMounted || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Draw video frame to hidden canvas
        canvas.width = 640;
        canvas.height = 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        setIsValidating(true);
        try {
          const res = await validateFrame(student.rollNumber, currentPose.id, dataUrl);
          if (!isMounted) return;

          if (res.valid) {
            setIsFaceValid(true);
            setFeedback('Valid frame detected. Keep pose...');
            
            // Trigger capture flash effect
            setFlash(true);
            setTimeout(() => setFlash(false), 150);

            // Increment count for current pose
            setCapturedCounts(prev => {
              const updatedCount = prev[currentPose.id] + 1;
              
              // If current pose is done, transition to next
              if (updatedCount >= currentPose.requiredCount) {
                if (currentPoseIndex < POSES.length - 1) {
                  // Move to next pose with a brief pause
                  setTimeout(() => {
                    if (isMounted) {
                      setCurrentPoseIndex(prevIdx => prevIdx + 1);
                      setFeedback(`Transitioning. ${POSES[currentPoseIndex + 1].instruction}`);
                    }
                  }, 800);
                } else {
                  // All poses done!
                  setTimeout(() => {
                    if (isMounted) {
                      setIsCapturing(false);
                      navigate('/upload-progress', { state: { rollNumber: student.rollNumber } });
                    }
                  }, 800);
                }
              }

              return {
                ...prev,
                [currentPose.id]: Math.min(updatedCount, currentPose.requiredCount)
              };
            });
          } else {
            setIsFaceValid(false);
            setFeedback(res.reason || 'Invalid frame quality');
          }
        } catch (err) {
          console.error("Frame validation failed", err);
        } finally {
          if (isMounted) {
            setIsValidating(false);
          }
        }
      }

      // Schedule next frame in 180ms
      if (isMounted && isCapturing) {
        timerId = setTimeout(processFrame, 180);
      }
    };

    // Kick off loop
    timerId = setTimeout(processFrame, 500);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isCapturing, currentPoseIndex, currentPose, stream, student, navigate]);

  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Decorative Blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <button
          onClick={() => {
            if (window.confirm("Registration will be cancelled. Are you sure?")) {
              navigate('/register');
            }
          }}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Capture</span>
        </button>
        <div className="text-right">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Student</span>
          <span className="text-sm font-bold text-white">{student.fullName} ({student.rollNumber})</span>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 flex-grow items-center justify-center my-6">
        
        {/* Left Side: Instructions and Poses Checklist */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col justify-between h-[500px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h3 className="font-bold text-white text-lg">Guided Poses</h3>
            </div>
            
            <div className="space-y-3.5">
              {POSES.map((pose, idx) => {
                const count = capturedCounts[pose.id];
                const isCompleted = count >= pose.requiredCount;
                const isActive = idx === currentPoseIndex;

                return (
                  <div
                    key={pose.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-brand-500/10 border border-brand-500/30'
                        : isCompleted
                        ? 'bg-white/5 border border-white/5 opacity-60'
                        : 'border border-transparent opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : isActive
                          ? 'bg-brand-500 text-white'
                          : 'bg-white/5 text-gray-400'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {pose.label}
                      </span>
                    </div>
                    <div className="text-xs font-semibold font-mono text-gray-400">
                      {count} / {pose.requiredCount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-400 mb-2">
              <span>Overall Completion</span>
              <span className="font-mono">{totalCaptured} / {totalRequired} images</span>
            </div>
            <div className="w-full bg-[#121316] rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${totalPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center/Right: Video Stream view and controls */}
        <div className="lg:col-span-2 flex flex-col items-center justify-between glass-card rounded-2xl p-6 h-[500px]">
          {/* Instructions Box */}
          <div className="w-full text-center py-2 px-4 rounded-xl bg-white/5 border border-white/5 mb-4">
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest block mb-1">Current Pose Instruction</span>
            <span className="text-white font-bold">{currentPose.label}</span>
            <p className="text-xs text-gray-400 mt-0.5">{currentPose.instruction}</p>
          </div>

          {/* Camera Ring & Viewport */}
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:y-[320px] rounded-full flex items-center justify-center overflow-hidden">
            {/* Camera Glowing Ring */}
            <div className={`absolute inset-0 rounded-full border-[6px] transition-all duration-500 pointer-events-none z-10 ${
              !isCapturing
                ? 'border-gray-800 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                : isFaceValid
                ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.3)]'
                : 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
            }`} />

            {/* Video preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {/* Flash Overlay */}
            <div className={`absolute inset-0 bg-white transition-opacity z-20 pointer-events-none ${
              flash ? 'opacity-70' : 'opacity-0'
            }`} />

            {/* Validation Overlay */}
            {isValidating && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1.5 z-20">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                <span className="text-[10px] font-semibold text-gray-300">Validating...</span>
              </div>
            )}
          </div>

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Bottom Feedback Alert & Controller */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-4 mt-4">
            <div className={`flex-grow p-3 rounded-xl text-sm border flex items-center gap-2.5 w-full ${
              !isCapturing
                ? 'bg-white/5 border-white/5 text-gray-300'
                : isFaceValid
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {isCapturing && (
                isFaceValid ? (
                  <Check className="w-5 h-5 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                )
              )}
              <span className="font-medium truncate">{feedback}</span>
            </div>

            <button
              onClick={() => setIsCapturing(!isCapturing)}
              disabled={!stream}
              className={`w-full sm:w-[160px] py-3.5 px-6 rounded-xl font-bold transition-all shrink-0 ${
                isCapturing
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-500/20 hover:scale-[1.02]'
              }`}
            >
              {isCapturing ? 'Pause Capture' : 'Start Capture'}
            </button>
          </div>
        </div>

      </div>

      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-gray-600 mt-4 z-10">
        <p>Tip: Stay in a well-lit area. Slowly change facial angles according to instructions.</p>
      </footer>
    </div>
  );
};

export default Capture;
