import { Link } from 'react-router-dom';

export default function About() {
  const cards = [
    {
      title: 'Our Mission',
      icon: '🚀',
      text: 'We aim to simplify the hiring process by empowering job seekers to build keyword-rich resumes and providing organizations with data-driven insights for effective candidate evaluation.'
    },
    {
      title: 'AI-Powered Insight',
      icon: '🤖',
      text: 'Our system uses NLP and machine learning models to analyze job descriptions and match the most impactful keywords for each role — ensuring your resume stands out.'
    },
    {
      title: 'Multi-Role Platform',
      icon: '💼',
      text: 'Built for Admins to completely analyse the resume specially coding profiles, Trainers to filter candidates, and Users to track their resume performance — all within one unified portal.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">

      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-violet-100/50 rounded-full blur-[100px] mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 max-w-6xl w-full flex flex-col items-center">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-slate-800">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Resume Insight</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
            Our platform leverages Google Gemini & Advanced NLP to evaluate resumes and match them with industry-relevant keywords — helping candidates optimize their profiles and recruiters find the best talent efficiently.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-12">
          {cards.map((c, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 p-8 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 group cursor-default"
            >
              <div className="text-5xl mb-6 transition-transform duration-700 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110 inline-block">{c.icon}</div>
              <h2 className="text-2xl font-bold mb-4 text-slate-800 group-hover:text-blue-600 transition-colors">{c.title}</h2>
              <p className="text-slate-500 leading-relaxed text-base group-hover:text-slate-600 transition-colors">
                {c.text}
              </p>
            </div>
          ))}
        </div>

        <footer className="text-center mt-8">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all text-lg px-6 py-3 rounded-full hover:bg-white hover:shadow-md"
          >
            <span className="group-hover:-translate-x-1 transition-transform">⬅</span> Back to Home
          </Link>
        </footer>
      </div>
    </div>
  );
}
