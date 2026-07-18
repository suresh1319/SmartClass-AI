import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, UserPlus, Shield, Database, Award, ArrowRight, BarChart3, User } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex flex-col justify-between">
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SmartClass <span className="text-gradient font-black">AI</span></h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">Classroom Attendance System</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 items-center">
          <Link to="/student/login" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors py-2 px-3 flex items-center gap-1.5 font-medium">
            <User className="w-4 h-4" />
            Student Portal
          </Link>
          <Link to="/dashboard" className="text-sm text-brand-400 hover:text-brand-300 transition-colors py-2 px-3 flex items-center gap-1.5 font-medium">
            <BarChart3 className="w-4 h-4" />
            Admin Dashboard
          </Link>
          <a href="#features" className="text-sm text-gray-500 hover:text-white transition-colors py-2 px-3 hidden md:block">Features</a>
        </div>
      </header>

      {/* Hero section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col md:flex-row items-center gap-12 z-10 flex-grow justify-center">
        <div className="flex-1 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>Prototype Phase v1.0</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
            High-Quality <span className="text-gradient">Face Dataset</span> Registration Portal
          </h2>
          <p className="text-gray-400 text-lg max-w-xl">
            Register and create your biometric profile for SmartClass AI. Guided multi-pose webcam capture ensures high-precision model training for automated, contactless classroom attendance.
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            <Link
              to="/register"
              className="group px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all duration-300 hover:scale-[1.02]"
            >
              <UserPlus className="w-5 h-5" />
              <span>Begin Registration</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/student/login"
              className="group px-6 py-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/25 text-indigo-400 font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]"
            >
              <User className="w-5 h-5 text-indigo-400" />
              <span>Student Portal</span>
            </Link>
            <Link
              to="/dashboard"
              className="group px-6 py-3.5 rounded-xl bg-dark-900/60 border border-white/5 hover:border-brand-500/20 text-gray-300 hover:text-white font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]"
            >
              <BarChart3 className="w-5 h-5 text-brand-400" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Guided Webcam Capture</h3>
            <p className="text-sm text-gray-400">
              Auto-capture 100 images with live guidance for 7 facial angles and expressions to train deep models.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Quality Validation</h3>
            <p className="text-sm text-gray-400">
              Real-time analysis filters out blurry, dark, multi-face, or misaligned frames instantly.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Secure Local Storage</h3>
            <p className="text-sm text-gray-400">
              Images organized by Roll Number locally on disk, with structured records stored in MongoDB.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">InsightFace Embedding</h3>
            <p className="text-sm text-gray-400">
              Deep representation vectors generated using ArcFace/MobileFaceNet for future facial comparison.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 text-center text-sm text-gray-500 z-10">
        <p>© 2026 SmartClass AI - College Major Attendance Project. Powered by Computer Vision & MongoDB.</p>
      </footer>
    </div>
  );
};

export default Home;
