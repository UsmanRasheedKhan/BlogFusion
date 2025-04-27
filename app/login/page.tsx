"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { auth, googleAuthProvider } from "../firebase/firebaseConfig";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError("");
      router.push("/text-editor");
    } catch (err) {
      setError("Invalid email or password.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      router.push("/text-editor");
    } catch (err) {
      setError("Failed to log in with Google. Please try again.");
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setResetMessage("Please enter your email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage(
        "Password reset email sent. Please check your inbox or spam folder."
      );
      setShowReset(false);
      setEmail(resetEmail);
    } catch (err) {
      setResetMessage("Failed to send reset email. Please try again.");
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError("");
    setSignupLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      if (signupName) {
        await updateProfile(userCredential.user, { displayName: signupName });
      }
      setSignupError("");
      setSignupLoading(false);
      setActiveTab('login');
      setEmail(signupEmail);
      setPassword("");
    } catch (err: any) {
      setSignupError(err.message || "Failed to sign up. Please try again.");
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500 select-none">
            Blog Fusion
          </span>
        </div>
        <div className="flex mb-6 border-b border-gray-200">
          <button
            className={`flex-1 py-2 text-lg font-semibold rounded-t-lg transition-colors ${activeTab === 'login' ? 'text-green-600 border-b-2 border-green-500 bg-green-50' : 'text-gray-500 bg-white'}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-lg font-semibold rounded-t-lg transition-colors ${activeTab === 'signup' ? 'text-green-600 border-b-2 border-green-500 bg-green-50' : 'text-gray-500 bg-white'}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            {error && <p className="text-center text-red-500 text-sm">{error}</p>}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@website.com"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                autoComplete="off"
                required
              />
              <p
                onClick={() => setShowReset(true)}
                className="mt-1 text-right text-xs text-blue-400 hover:underline cursor-pointer"
              >
                Forgot password?
              </p>
            </div>
            <button
              type="submit"
              className="w-full py-2 text-base font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
            >
              Login
            </button>
            <div className="my-2 text-center text-sm text-gray-400">OR</div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center w-full px-4 py-2 text-base font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <FaGoogle className="mr-2" /> Login with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-5" autoComplete="off">
            {signupError && <p className="text-center text-red-500 text-sm">{signupError}</p>}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                id="signup-name"
                value={signupName}
                onChange={e => setSignupName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="Your Name"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                id="signup-email"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="email@website.com"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                id="signup-password"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 text-base font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60"
              disabled={signupLoading}
            >
              {signupLoading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </form>
        )}
        <div className="mt-6 text-center text-sm text-gray-500">
          {activeTab === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button className="text-green-600 hover:underline" onClick={() => setActiveTab('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="text-green-600 hover:underline" onClick={() => setActiveTab('login')}>
                Login
              </button>
            </>
          )}
        </div>
      </div>
      {showReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xs">
            <h3 className="text-lg font-bold mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your registered email to reset your password.
            </p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-2 text-sm text-gray-900 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none mb-4"
              placeholder="Enter your email"
              required
            />
            <button
              onClick={handlePasswordReset}
              className="w-full py-2 text-sm font-semibold text-white bg-green-500 rounded hover:bg-green-600"
            >
              Send Reset Email
            </button>
            <button
              onClick={() => setShowReset(false)}
              className="mt-2 w-full py-2 text-sm font-semibold text-green-600 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            {resetMessage && (
              <p className="mt-4 text-center text-sm text-gray-600">
                {resetMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;