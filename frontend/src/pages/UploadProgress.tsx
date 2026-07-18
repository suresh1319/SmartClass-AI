import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Database, AlertCircle, RefreshCw } from 'lucide-react';
import { generateEmbeddings } from '../services/api';

const UploadProgress: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { rollNumber: string } | null;

  useEffect(() => {
    if (!state) {
      navigate('/register');
    }
  }, [state, navigate]);

  const [status, setStatus] = useState<string>('Uploading images & preparing alignment...');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const startEmbeddingGeneration = async (rollNo: string) => {
    setLoading(true);
    setError(null);
    setStatus('Detecting faces & performing alignment (cropping to 112x112)...');
    
    // Simulate initial steps for visual excellence
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    try {
      setStatus('Generating high-precision face embeddings using deep neural networks...');
      const response = await generateEmbeddings(rollNo);
      
      // Artificial delay to let the user admire the gorgeous scanning animation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      navigate('/success', {
        state: {
          rollNumber: response.rollNumber,
          acceptedImages: response.acceptedImages,
          rejectedImages: response.rejectedImages,
          totalEmbeddings: response.totalEmbeddings,
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Embedding generation failed. Make sure your dataset contains valid face captures.";
      setError(msg);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state?.rollNumber) {
      startEmbeddingGeneration(state.rollNumber);
    }
  }, [state]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex flex-col justify-between py-12 px-4 sm:px-6">
      {/* Background decorations */}
      <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-md w-full mx-auto glass-card rounded-3xl p-8 z-10 my-auto text-center flex flex-col items-center justify-center">
        {loading ? (
          <div className="space-y-8 py-6 w-full">
            {/* Spinning/pulsing graphic */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              {/* Outer glowing ring */}
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-brand-500/30 animate-spin" />
              {/* Inner glowing pulse */}
              <div className="absolute inset-2 rounded-full border-4 border-indigo-500/60 animate-pulse-slow" />
              {/* Core icon */}
              <Database className="w-8 h-8 text-brand-400 z-10" />
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <span>AI Embedding Generation</span>
              </h2>
              <div className="min-h-[40px] px-2">
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  {status}
                </p>
              </div>
            </div>

            {/* Simulated progress tracker */}
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Processing dataset...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-6 w-full">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Enrollment Suspended</h2>
              <p className="text-sm text-gray-400 leading-relaxed px-2">
                {error}
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => startEmbeddingGeneration(state.rollNumber)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Generating</span>
              </button>
              
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3.5 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
              >
                Back to Registration
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-md mx-auto text-center text-xs text-gray-600 mt-8 z-10">
        <p>Facial datasets are compiled according to SmartClass AI Major Project specifications.</p>
      </footer>
    </div>
  );
};

export default UploadProgress;
