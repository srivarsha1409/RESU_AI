import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async (credentialResponse) => {
    setLoading(true);
    
    try {
      // Decode the JWT token to get email (basic validation)
      const tokenPayload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const email = tokenPayload.email;
      
      // Frontend domain validation - only allow @bitsathy.ac.in
      if (!email || !email.endsWith("@bitsathy.ac.in")) {
        alert("👉 Only @bitsathy.ac.in email accounts are allowed to sign in.");
        setLoading(false);
        return;
      }
      
      // Send Google token to backend for verification
      const res = await fetch("http://localhost:8000/auth/google_signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Google Sign-In failed ❌");
        setLoading(false);
        return;
      }

      alert(`✅ ${data.message}`);

      const token = data.access_token;
      if (!token) {
        alert("No access token received ❌");
        setLoading(false);
        return;
      }

      // persist token for subsequent protected requests
      localStorage.setItem("access_token", token);

      // Verify token and redirect to user dashboard
      const verify = await fetch("http://localhost:8000/auth/verify_token", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!verify.ok) {
        alert("Token verification failed ❌");
        setLoading(false);
        return;
      }

      // Google Sign-In is only for users, redirect to user dashboard
      navigate("/user");
    } catch (err) {
      console.error(err);
      alert("Error connecting to server ⚠️");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Login request
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // ✅ important for HttpOnly cookies
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Login failed ❌");
        setLoading(false);
        return;
      }

      alert(`✅ ${data.message}`);

      const token = data.access_token;
      if (!token) {
        alert("No access token received ❌");
        setLoading(false);
        return;
      }

      // persist token for subsequent protected requests
      localStorage.setItem("access_token", token);

      // Step 2: Verify token using Authorization header
      const verify = await fetch("http://localhost:8000/auth/verify_token", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!verify.ok) {
        alert("Token verification failed ❌");
        setLoading(false);
        return;
      }

      const verifyData = await verify.json();
      const role = verifyData.data?.role || "user";

      // Step 3: Redirect based on secure verified role
      if (role === "admin") navigate("/admin");
      else if (role === "trainer") navigate("/trainer");
      else navigate("/user");
    } catch (err) {
      console.error(err);
      alert("Error connecting to server ⚠️");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900 flex items-center justify-center p-6 relative overflow-hidden">

        {/* Background Shapes */}
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-purple-100/50 rounded-full blur-[100px] mix-blend-multiply"></div>

        <div className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-xl">
          <h2 className="text-3xl font-extrabold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Welcome Back
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2 ml-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Sign In"}
            </button>
          </form>

          {/* Google Sign-In Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/70 backdrop-blur-xl text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSignIn}
              onError={() => {
                alert("Google Sign-In failed ❌");
                setLoading(false);
              }}
              useOneTap
              theme="filled_blue"
              text="signin_with"
              shape="pill"
              size="large"
              disabled={loading}
            />
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-semibold"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
