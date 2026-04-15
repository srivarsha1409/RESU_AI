import { Link } from 'react-router-dom';

export default function Contact() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-200 selection:text-cyan-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-cyan-100/60 rounded-full blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-blue-100/60 rounded-full blur-[100px] mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white/40 p-10 rounded-3xl shadow-2xl hover:shadow-cyan-500/10 transition-shadow duration-300">
        <h1 className="text-4xl font-extrabold mb-8 text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">
          Get in Touch
        </h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl group-hover:animate-bounce transition-transform">📧</span> Email Support
            </h3>
            <div className="space-y-2 pl-9">
              <p className="text-lg font-medium text-slate-700 hover:text-cyan-600 transition-colors cursor-pointer select-all">yuvashrim.cs24@bitsathy.ac.in</p>
              <p className="text-lg font-medium text-slate-700 hover:text-cyan-600 transition-colors cursor-pointer select-all">srivarshap.cs24@bitsathy.ac.in</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl group-hover:rotate-12 transition-transform">📞</span> Phone Contact
            </h3>
            <p className="text-lg font-medium text-slate-700 pl-9">
              7010404284 <span className="text-slate-400 mx-2">|</span> 7548842310
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="text-slate-500 hover:text-cyan-600 transition-colors text-sm font-bold border-b-2 border-transparent hover:border-cyan-600 pb-0.5"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
