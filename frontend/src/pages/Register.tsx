import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { registerStudent } from '../services/api';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    email: '',
    department: 'Engineering',
    branch: '',
    year: 1,
    section: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value, 10) : value,
    }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return "Full Name is required";
    if (!formData.rollNumber.trim()) return "Roll Number is required";
    if (!/^[A-Za-z0-9\-]{3,20}$/.test(formData.rollNumber.trim())) {
      return "Roll Number must be alphanumeric and between 3-20 characters long";
    }
    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return "Please enter a valid email address";
    }
    if (!formData.branch.trim()) return "Branch is required";
    if (!formData.section.trim()) return "Section is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await registerStudent({
        ...formData,
        rollNumber: formData.rollNumber.trim().toUpperCase(),
        section: formData.section.trim().toUpperCase(),
      });
      // Redirect to capture page with student details
      navigate('/capture', {
        state: {
          rollNumber: response.student.rollNumber,
          fullName: response.student.fullName,
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "An error occurred during registration. Please check if Roll Number already exists.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d0f] relative overflow-hidden flex flex-col justify-between py-12 px-4 sm:px-6">
      {/* Glow effects */}
      <div className="absolute top-[-10%] right-[10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Back button */}
      <div className="max-w-xl w-full mx-auto z-10 mb-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Registration Card */}
      <div className="max-w-xl w-full mx-auto glass-card rounded-3xl p-8 z-10 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Student Registration</h2>
            <p className="text-sm text-gray-400">Create biometric attendance profile</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          {/* Roll Number & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rollNumber" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Roll Number / Student ID
              </label>
              <input
                type="text"
                id="rollNumber"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                placeholder="e.g. 21CS004"
                className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. john@college.edu"
                className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Department & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="department" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors appearance-none"
              >
                <option value="Engineering">Engineering</option>
                <option value="Science">Science</option>
                <option value="Management">Management</option>
                <option value="Humanities">Humanities</option>
              </select>
            </div>
            <div>
              <label htmlFor="branch" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Branch / Specialization
              </label>
              <input
                type="text"
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
                className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Year & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="year" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Academic Year
              </label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors appearance-none"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
                <option value={5}>5th Year</option>
              </select>
            </div>
            <div>
              <label htmlFor="section" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Section
              </label>
              <input
                type="text"
                id="section"
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="e.g. A"
                className="w-full bg-[#121316] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-6 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all duration-300 disabled:opacity-50 hover:scale-[1.01]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registering Student...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Register and Proceed</span>
              </>
            )}
          </button>
        </form>
      </div>

      <footer className="w-full max-w-xl mx-auto text-center text-xs text-gray-600 mt-8 z-10">
        <p>Ensure all information is accurate. This details will link to facial embeddings database.</p>
      </footer>
    </div>
  );
};

export default Register;
