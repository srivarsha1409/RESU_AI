import { Link } from 'react-router-dom';

export default function Features() {
  const features = [
    { title: 'Resume Keyword Extraction', icon: '📄', desc: 'Automatically extracts impactful keywords from your resume to match industry roles and enhance ATS ranking.' },
    { title: 'GitHub Repository Analysis', icon: '💻', desc: 'Analyzes your GitHub profile to count repositories, highlight active contributions, and summarize your coding activity.' },
    { title: 'LeetCode Insights', icon: '🧩', desc: 'Fetches details like the number of problems solved, difficulty levels, and recent activity trends.' },
    { title: 'Smart Keyword Generator', icon: '⚡', desc: 'Generates tailored, high-ranking keywords for your target job role using intelligent language models.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-pink-200 selection:text-pink-900 flex flex-col items-center py-20 px-6 relative overflow-hidden">

      {/* Background Gradients */}
      <div className="absolute top-10 left-10 w-[600px] h-[600px] bg-pink-100/60 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>

      <div className="relative z-10 max-w-6xl w-full">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-slate-800">
            Application <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">Features</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">Discover the powerful AI-driven tools that will transform your resume into a recruiter magnet.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-pink-100 p-8 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 group hover:-translate-y-2 cursor-pointer"
            >
              <div className="flex items-start gap-6">
                <div className="text-5xl bg-pink-50 w-20 h-20 flex items-center justify-center rounded-2xl group-hover:bg-pink-500 group-hover:text-white transition-all duration-500 ease-out shadow-sm group-hover:rotate-[360deg] shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-slate-800 group-hover:text-pink-600 transition-colors">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-lg group-hover:text-slate-600 transition-colors">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="px-8 py-3 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 transition-all font-bold shadow-sm"
          >
            ⬅ Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
