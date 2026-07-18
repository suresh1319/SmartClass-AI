import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, UserCheck, Image, ShieldAlert, ArrowRight, Home } from 'lucide-react';

interface SuccessState {
  rollNumber: string;
  acceptedImages: number;
  rejectedImages: number;
  totalEmbeddings: number;
}

const Success: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SuccessState | null;

  useEffect(() => {
    if (!state) {
      navigate('/register');
    }
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex flex-col justify-between py-12 px-4 sm:px-6">
      {/* Glow backgrounds */}
      <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-lg w-full mx-auto glass-card rounded-3xl p-8 z-10 my-auto text-center flex flex-col items-center justify-center">
        {/* Success Check Circle Icon */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-green-500/10 border border-green-500/20 animate-pulse-slow" />
          <CheckCircle2 className="w-12 h-12 text-green-400 z-10" />
        </div>

        <div className="space-y-2 mb-8">
          <h2 className="text-3xl font-extrabold text-white">Enrollment Successful</h2>
          <p className="text-sm text-gray-400">
            Student details and face embeddings are saved to the database.
          </p>
        </div>

        {/* Info Grid */}
        <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 mb-8 space-y-4 text-left">
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-gray-300">
              <UserCheck className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold">Student ID / Roll Number</span>
            </div>
            <span className="text-sm font-bold text-white font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
              {state.rollNumber}
            </span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-gray-300">
              <Image className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold">Accepted Dataset Frames</span>
            </div>
            <span className="text-sm font-bold text-green-400 font-mono">
              {state.acceptedImages}
            </span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-gray-300">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold">Rejected Frames (Quality Filtered)</span>
            </div>
            <span className="text-sm font-bold text-red-400 font-mono">
              {state.rejectedImages}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5 text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold">Generated Embeddings</span>
            </div>
            <span className="text-sm font-bold text-indigo-400 font-mono">
              {state.totalEmbeddings} vectors
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/register"
            className="py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:scale-[1.01] transition-all"
          >
            <span>Register Next Student</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link
            to="/"
            className="py-3.5 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
          >
            <Home className="w-4 h-4" />
            <span>Go to Home</span>
          </Link>
        </div>
      </main>

      <footer className="w-full max-w-lg mx-auto text-center text-xs text-gray-600 mt-8 z-10">
        <p>SmartClass AI - Secure Facial Recognition System Prototype.</p>
      </footer>
    </div>
  );
};

export default Success;
