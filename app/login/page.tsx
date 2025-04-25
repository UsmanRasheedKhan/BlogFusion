"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
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
      setEmail(resetEmail); // Pre-fill the email field with the reset email
    } catch (err) {
      setResetMessage("Failed to send reset email. Please try again.");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 min-h-screen bg-black-100 relative ">
      {/* BlogFusion Heading */}
      <div className="absolute left-4 rounded-2xl">
        <Link href="/">
          <h1 className="text-2xl font-bold text-white cursor-pointer">
            BlogFusion
          </h1>
        </Link>
      </div>
      {/* Left Section */}
      <div className="flex flex-col justify-center items-center p-8  bg-slate-600 text-white">
        <div className="w-full max-w-sm p-6 bg-zinc-900 shadow-lg rounded-md rounded-2xl">
          <h2 className="text-2xl font-bold text-center">Welcome Back</h2>
          <p className="mt-2 text-sm text-center text-gray-400">
            Log in to access your account
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4" autoComplete="off">
            {error && (
              <p className="text-center text-red-500 text-sm">{error}</p>
            )}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@website.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
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
              className="w-full py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Login
            </button>
          </form>
          <div className="my-4 text-center text-sm text-gray-400">OR</div>
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            <FaGoogle className="mr-2" />
            Login with Google
          </button>
          <p className="mt-4 text-sm text-center text-gray-400">
            Dont have an account?{" "}
            <a href="/signup" className="text-blue-400 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your registered email to reset your password.
            </p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-2 text-sm text-gray-900 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
              placeholder="Enter your email"
              required
            />
            <button
              onClick={handlePasswordReset}
              className="w-full py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Send Reset Email
            </button>
            <button
              onClick={() => setShowReset(false)}
              className="mt-2 w-full py-2 text-sm font-semibold text-blue-600 bg-gray-100 rounded hover:bg-gray-200"
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

      {/* Right Section */}
      <div
        className="hidden lg:block bg-cover bg-center"
        style={{
          backgroundImage: 'url(bg2.jpg)', // Replace with the actual path to your background image
        }}
      ></div>
    </div>
  );
};

export default Login;