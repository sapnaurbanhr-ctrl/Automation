import { Target } from "lucide-react";

export default function Login() {
  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center px-6"
      style={{
        backgroundImage:
          "url('https://images.pexels.com/photos/12872929/pexels-photo-12872929.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')",
      }}
      data-testid="login-page"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFB]/20 to-[#FDFCFB]/40" />

      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/70 border border-white/40 shadow-xl rounded-2xl p-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-md bg-[#2D5A27] flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-[#1C1917] text-lg tracking-tight">
            Grove CRM
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1C1917] mb-3">
          Welcome back.
        </h1>
        <p className="text-[#57534E] mb-10 leading-relaxed">
          A calmer way to manage your leads. Sign in to view your pipeline,
          dashboard and follow-ups.
        </p>

        <button
          onClick={handleGoogleLogin}
          data-testid="login-google-button"
          className="w-full bg-white text-[#1C1917] border border-[#E7E5E4] hover:bg-[#F7F5F2] hover:shadow-sm transition-all duration-200 rounded-md px-6 py-3 font-medium flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-[#57534E] mt-8 text-center tracking-wide">
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
