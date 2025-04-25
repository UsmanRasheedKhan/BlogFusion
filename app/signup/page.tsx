"use client"; // Mark this component as a Client Component

import { useState, useEffect } from "react";
// import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import Head from "next/head";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { FaRegEnvelope } from "react-icons/fa";
import { MdLockOutline } from "react-icons/md";
import { auth } from '../firebase/firebaseConfig';
import { googleAuthProvider } from '../firebase/firebaseConfig';




const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      setSuccessMessage("");
      return;
    }

    const validDomains = ["gmail.com", "yahoo.com", "hotmail.com"];
    const emailDomain = email.split("@")[1];

    if (!validDomains.includes(emailDomain)) {
      setError("Please use a valid email domain (e.g., gmail.com, yahoo.com, hotmail.com).");
      setSuccessMessage("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update user profile with displayName
      await updateProfile(userCredential.user, { displayName: name });

      // Send email verification
      await sendEmailVerification(auth.currentUser!);
      setIsOtpSent(true);

      setSuccessMessage("User registered successfully! Please check your email for verification.");
      setError("");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please log in.");
      } else {
        setError(err.message);
      }
      setSuccessMessage("");
      console.error(err);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (user.emailVerified) {
          setEmailVerified(true);
        } else {
          setEmailVerified(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginRedirect = () => {
    router.push("/login");
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen py-2"
      style={{
        backgroundImage: "url(bg.jpg)", // Add the image path here
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Head>
        <title>Create Your Account</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <div className="bg-black text-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-5">
            <h2 className="text-3xl font-bold mb-2">Welcome!</h2>
            <div className="border-2 w-10 border-white inline-block mb-2"></div>
            <p className="mb-4">Create your account by filling out the details below.</p>

            {error && (
              <p className="text-red-500">
                {error} <a href="/login" className="text-blue-500">log in</a>
              </p>
            )}
            {successMessage && <p className="text-green-500">{successMessage}</p>}
            {isOtpSent && <p className="text-green-500">OTP sent to your email for verification.</p>}
            {emailVerified && (
              <div className="text-green-500">
                <p>Your email has been verified!</p>
                <button
                  onClick={handleLoginRedirect}
                  className="mt-4 border-2 border-white text-white rounded-full px-12 py-2 inline-block font-semibold hover:bg-white hover:text-black"
                >
                  Go to Login
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col items-center">
              <div className="bg-gray-100 w-64 p-2 flex items-center mb-3 rounded">
                <FaRegEnvelope className="text-black m-2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="bg-gray-100 outline-none text-sm flex-1 text-black"
                  required
                />
              </div>

              <div className="bg-gray-100 w-64 p-2 flex items-center mb-3 rounded">
                <FaRegEnvelope className="text-black m-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="bg-gray-100 outline-none text-sm flex-1 text-black"
                  required
                />
              </div>

              <div className="bg-gray-100 w-64 p-2 flex items-center mb-3 rounded">
                <MdLockOutline className="text-black m-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-gray-100 outline-none text-sm flex-1 text-black"
                  required
                />
              </div>

              <div className="bg-gray-100 w-64 p-2 flex items-center mb-3 rounded">
                <MdLockOutline className="text-black m-2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="bg-gray-100 outline-none text-sm flex-1 text-black"
                  required
                />
              </div>

              <button
                type="submit"
                className="border-2 border-white text-white rounded-full px-12 py-2 inline-block font-semibold hover:bg-white hover:text-black"
              >
                
                Sign Up
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;