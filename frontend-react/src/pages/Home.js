import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-blue-200 selection:text-blue-900">
      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-20 px-6 py-4 flex justify-between items-center backdrop-blur-xl bg-white/70 border-b border-blue-100 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2 group cursor-pointer">
          <span className="text-3xl transition-transform duration-500 group-hover:rotate-[360deg] drop-shadow-md">⚡</span>
          <span className="text-xl md:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            RESUME INSIGHT AI
          </span>
        </div>
        <nav className="hidden md:flex gap-8">
          {['About', 'Features', 'Contact'].map((item) => (
            <Link
              key={item}
              to={`/${item.toLowerCase()}`}
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors relative group py-2"
            >
              {item}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none animate-pulse mix-blend-multiply"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none animate-pulse mix-blend-multiply"></div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-white/60 text-blue-700 text-sm font-bold mb-6 shadow-sm hover:scale-105 transition-transform cursor-default">
            <span className="animate-bounce">🚀</span> AI-Powered Career Growth
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-slate-900 drop-shadow-sm">
            Analyze Your Resume with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
              Intelligent Insights
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Automatically extract top-performing keywords, analyze GitHub & LeetCode activity, and make your resume stand out to recruiters effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mt-10">
            <Link
              to="/login"
              className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-bold text-lg shadow-xl shadow-blue-500/20 transform hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Now <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Link>
            <Link
              to="/features"
              className="px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-700 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
            >
              Explore Features
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-24 grid grid-cols-3 gap-8 md:gap-24 text-center">
          {[
            { label: 'Resumes Analyzed', val: '10k+' },
            { label: 'Success Rate', val: '95%' },
            { label: 'AI Availability', val: '24/7' }
          ].map((stat, idx) => (
            <div key={idx} className="group cursor-default">
              <p className="text-3xl md:text-4xl font-black text-slate-800 group-hover:text-blue-600 transition-colors duration-300">{stat.val}</p>
              <p className="text-sm md:text-base font-semibold text-slate-500 uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


