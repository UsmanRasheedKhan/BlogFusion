"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import emailjs from "emailjs-com";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth, db, googleAuthProvider } from "../firebase/firebaseConfig";
import { motion } from 'framer-motion';
import { FaGoogle } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { getStripe } from '../lib/stripe';
import { setDoc, doc } from "firebase/firestore";

// Add this error message mapping object at the top of your file
type ErrorMessage = {
  title: string;
  text: string;
  icon: string;
  showLoginButton?: boolean;
  showPasswordTips?: boolean;
  showSignupButton?: boolean;
  showResetButton?: boolean;
  suggestion?: string;
};

const errorMessages: Record<string, ErrorMessage> = {
  'auth/email-already-in-use': {
    title: 'Email Already Registered',
    text: 'This email address is already associated with an account. Would you like to sign in instead?',
    icon: 'info',
    showLoginButton: true,
    suggestion: 'Try logging in with your existing account or use a different email address.'
  },
  'auth/weak-password': {
    title: 'Password Security Notice',
    text: 'Your password needs to be stronger to better protect your account.',
    icon: 'warning',
    showPasswordTips: true,
    suggestion: `
      Your password should include:
      • At least 8 characters
      • Upper and lowercase letters
      • Numbers and special characters (!@#$%^&*)
      • No common words or phrases
    `
  },
  'auth/invalid-email': {
    title: 'Invalid Email Format',
    text: 'The email address you entered is not properly formatted.',
    icon: 'error',
    suggestion: 'Please check for typos and ensure your email follows the format: example@domain.com'
  },
  'auth/user-not-found': {
    title: 'Account Not Found',
    text: 'We couldn\'t find an account with this email address.',
    icon: 'question',
    showSignupButton: true,
    suggestion: 'Double-check your email or create a new account to get started.'
  },
  'auth/wrong-password': {
    title: 'Incorrect Password',
    text: 'The password you entered doesn\'t match our records.',
    icon: 'error',
    showResetButton: true,
    suggestion: 'Try again or reset your password if you\'ve forgotten it.'
  },
  'auth/too-many-requests': {
    title: 'Too Many Attempts',
    text: 'Access temporarily blocked due to multiple failed login attempts.',
    icon: 'warning',
    suggestion: 'Please wait a few minutes before trying again or reset your password.'
  },
  'auth/network-request-failed': {
    title: 'Connection Error',
    text: 'Unable to connect to our servers.',
    icon: 'error',
    suggestion: 'Please check your internet connection and try again.'
  },
  'auth/popup-closed-by-user': {
    title: 'Google Sign-in Cancelled',
    text: 'The Google sign-in window was closed before completion.',
    icon: 'info',
    suggestion: 'Please try again and complete the Google sign-in process.'
  },
  'auth/expired-action-code': {
    title: 'Link Expired',
    text: 'The password reset link has expired.',
    icon: 'warning',
    showResetButton: true,
    suggestion: 'Request a new password reset link to continue.'
  },
  'auth/invalid-action-code': {
    title: 'Invalid Reset Link',
    text: 'This password reset link is no longer valid.',
    icon: 'error',
    showResetButton: true,
    suggestion: 'Please request a new password reset link.'
  }
};

// Add this error message mapping object near the top of your file
const subscriptionErrorMessages = {
  'subscription/free-limit-reached': {
    title: 'Free Plan Limit Reached',
    text: 'You have reached your monthly limit of 3 blog posts.',
    icon: 'info',
    suggestion: 'Upgrade your plan to continue publishing.',
    action: 'Upgrade Now'
  },
  'subscription/payment-failed': {
    title: 'Payment Failed',
    text: 'We could not process your payment.',
    icon: 'error',
    suggestion: 'Please check your payment details and try again.',
    action: 'Try Again'
  },
  'subscription/already-subscribed': {
    title: 'Active Subscription',
    text: 'You already have an active subscription.',
    icon: 'warning',
    suggestion: 'You can manage your subscription in your profile settings.',
    action: 'View Subscription'
  }
};

interface ModalProps {
  onClose: () => void;
}

const NavLink: React.FC<{ 
  href: string; 
  children: React.ReactNode; 
  isActive?: boolean;
  onClick?: () => void;
}> = ({ href, children, isActive, onClick }) => (
  <a
    href={href}
    onClick={onClick}
    className={`
      relative px-1 py-2 text-sm font-medium transition-colors
      ${isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'}
      after:content-[''] after:absolute after:left-0 after:bottom-0 
      after:h-0.5 after:w-full after:bg-green-500 
      after:scale-x-0 hover:after:scale-x-100 
      after:transition-transform after:duration-300
    `}
  >
    {children}
  </a>
);

const UserMenu: React.FC<{ 
  user: any; 
  onLogout: () => void;
  onUpgrade: () => void;
}> = ({ user, onLogout, onUpgrade }) => {
  return (
    <div className="flex items-center space-x-4">
      {/* Upgrade Button */}
      <button
        onClick={onUpgrade}
        className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors flex items-center space-x-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span>Upgrade</span>
      </button>

      {/* User Menu */}
      <div className="relative group">
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white overflow-hidden">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt="Profile"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden md:block">
            {user.displayName || 'User'}
          </span>
        </div>

        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 hidden group-hover:block border border-gray-100 transform transition-all duration-300 opacity-0 group-hover:opacity-100">
          <Link 
            href="/profile" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            My Profile
          </Link>
          <Link 
            href="/dashboard" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 border-t border-gray-100"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

const Homepage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginFormVisible, setIsLoginFormVisible] = useState(false);
  const [isSignupFormVisible, setIsSignupFormVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blogFunctionality, setBlogFunctionality] = useState<"manual" | "automated">("manual");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoggedIn(!!user);
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openSubscription') === 'true') {
      setIsSubscriptionModalOpen(true);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoginFormVisible) {
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [isLoginFormVisible]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    setIsSubmitted(true);
    e.preventDefault();

    const templateParams = {
      from_name: formData.name,
      to_name: "BlogFusion",
      message: formData.message,
      reply_to: formData.email,
    };

    emailjs
      .send(
        "service_2e35obu",
        "template_2qm2dh2",
        templateParams,
        "SvixGXc5ZGZdT5AB-"
      )
      .then(
        (response) => {
          console.log("SUCCESS!", response.status, response.text);
          setIsSubmitted(true);
        },
        (error) => {
          console.error("FAILED...", error);
        }
      );
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleLoginForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setIsLoginFormVisible(!isLoginFormVisible);
    setIsSignupFormVisible(false);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleSignupForm = () => {
    setIsSignupFormVisible(!isSignupFormVisible);
    setIsLoginFormVisible(false);
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        setIsLoginFormVisible(false);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } else {
        await Swal.fire({
          title: 'Email Not Verified',
          html: `
            <div class="space-y-4">
              <p>Please verify your email before logging in.</p>
              <div class="bg-yellow-50 p-4 rounded-lg text-yellow-700 text-sm">
                Check your inbox and spam folder for the verification email.
              </div>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Resend Verification Email',
          cancelButtonText: 'Close',
          confirmButtonColor: '#22c55e'
        }).then((result) => {
          if (result.isConfirmed) {
            sendEmailVerification(user);
            Swal.fire({
              title: 'Email Sent!',
              text: 'Verification email has been resent.',
              icon: 'success',
              confirmButtonColor: '#22c55e'
            });
          }
        });
        await auth.signOut();
      }
    } catch (error: any) {
      const errorCode = error.code as keyof typeof errorMessages;
      const errorDetails = errorMessages[errorCode] || {
        title: 'Login Error',
        text: 'An unexpected error occurred while trying to log you in.',
        icon: 'error',
        suggestion: 'Please try again or contact support if the problem persists.'
      };

      await Swal.fire({
        title: errorDetails.title,
        html: `
          <div class="space-y-4">
            <p class="text-gray-700">${errorDetails.text}</p>
            ${errorDetails.suggestion ? `
              <div class="bg-gray-50 p-4 rounded-lg text-sm">
                <p class="font-medium text-gray-700 mb-2">Helpful Tips:</p>
                <div class="text-gray-600 whitespace-pre-line">
                  ${errorDetails.suggestion}
                </div>
              </div>
            ` : ''}
            ${errorDetails.showPasswordTips ? `
              <div class="bg-yellow-50 p-4 rounded-lg text-sm">
                <p class="font-medium text-yellow-700 mb-2">Password Requirements:</p>
                <ul class="list-disc list-inside space-y-1 text-yellow-600">
                  <li>Minimum 8 characters long</li>
                  <li>At least one uppercase letter (A-Z)</li>
                  <li>At least one lowercase letter (a-z)</li>
                  <li>At least one number (0-9)</li>
                  <li>At least one special character (!@#$%^&*)</li>
                </ul>
              </div>
            ` : ''}
          </div>
        `,
        icon: errorDetails.icon as any,
        showCancelButton: Boolean(errorDetails.showLoginButton || errorDetails.showSignupButton || errorDetails.showResetButton),
        confirmButtonText: errorDetails.showLoginButton ? 'Go to Login' : 
                          errorDetails.showSignupButton ? 'Create Account' : 
                          errorDetails.showResetButton ? 'Reset Password' : 'Try Again',
        cancelButtonText: 'Close',
        confirmButtonColor: '#22c55e'
      }).then((result) => {
        if (result.isConfirmed) {
          if (errorDetails.showLoginButton) toggleLoginForm();
          if (errorDetails.showSignupButton) toggleSignupForm();
          if (errorDetails.showResetButton) handleForgotPassword(new MouseEvent('click') as any);
        }
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      await Swal.fire({
        title: 'Weak Password',
        html: `
          <div class="space-y-4">
            <p>Please use a stronger password.</p>
            <div class="bg-gray-50 p-4 rounded-lg text-sm text-left">
              <p class="font-medium mb-2">Password Requirements:</p>
              <ul class="list-disc list-inside space-y-1 text-gray-600">
                <li>At least 6 characters long</li>
                <li>Include numbers and letters</li>
                <li>Include special characters</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'warning',
        confirmButtonColor: '#22c55e'
      });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name,
        email: email,
        savedBlogs: [],
        createdAt: new Date()
      });

      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);

      await Swal.fire({
        title: 'Account Created Successfully!',
        html: `
          <div class="space-y-4">
            <p>Welcome to Blog Fusion, ${name}!</p>
            <div class="bg-green-50 p-4 rounded-lg text-green-700 text-sm">
              A verification email has been sent to your inbox. Please verify your email to continue.
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#22c55e'
      });

      toggleLoginForm();
      setIsSignupFormVisible(false);
    } catch (error: any) {
      const errorCode = error.code as keyof typeof errorMessages;
      const errorDetails = errorMessages[errorCode] || {
        title: 'Sign Up Error',
        text: 'An unexpected error occurred. Please try again.',
        icon: 'error'
      };

      await Swal.fire({
        title: errorDetails.title,
        html: `<div class="text-center">${errorDetails.text}</div>`,
        icon: errorDetails.icon as any,
        confirmButtonColor: '#22c55e'
      });
    }
  };

  const toggleSubscription = () => {
    setIsModalOpen(!isModalOpen);
  };

  const Modal: React.FC<ModalProps> = ({ onClose }) => {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded shadow-lg w-full sm:w-3/4 md:w-2/3 lg:w-1/2">
          <h2 className="text-xl font-bold text-center mb-4">Subscription Plans</h2>
          <div className="flex justify-between mb-4">
            <div className="p-4 w-1/3 text-center border-2 border-gray-300 rounded-lg mx-4">
              <h3 className="font-bold text-lg mb-2">Basic</h3>
              <p className="text-sm mb-4">Perfect for individual users.</p>
              <div className="font-semibold mb-4">$10 / month</div>
              <button className="px-6 py-2 bg-black text-white rounded hover:bg-gray-600">
                Choose Plan
              </button>
            </div>

            <div className="p-4 w-1/3 text-center border-2 border-gray-300 rounded-lg mx-4">
              <h3 className="font-bold text-lg mb-2">Medium</h3>
              <p className="text-sm mb-4">Ideal for small teams.</p>
              <div className="font-semibold mb-4">$20 / month</div>
              <button className="px-6 py-2 bg-black text-white rounded hover:bg-gray-600">
                Choose Plan
              </button>
            </div>

            <div className="p-4 w-1/3 text-center border-2 border-gray-300 rounded-lg mx-4">
              <h3 className="font-bold text-lg mb-2">Premium</h3>
              <p className="text-sm mb-4">Best for large organizations.</p>
              <div className="font-semibold mb-4">$50 / month</div>
              <button className="px-6 py-2 bg-black text-white rounded hover:bg-gray-600">
                Choose Plan
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <button
              className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 mx-auto"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleGoogleLogin = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const user = userCredential.user;

      if (user.emailVerified) {
        setIsLoginFormVisible(false);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } else {
        setError("Please verify your email before logging in.");
        await auth.signOut();
      }
    } catch (error: any) {
      setError("Google login failed. Please try again.");
    }
  };

  const toggleForm = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setIsLoginFormVisible(!isLoginFormVisible);
    setIsSignupFormVisible(!isSignupFormVisible);
  };

  const handleForgotPassword = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent. Please check your inbox.");
    } catch (error: any) {
      setError("Failed to send password reset email. Please try again.");
    }
  };

  const [faqOpenStates, setFaqOpenStates] = useState<boolean[]>([false, false, false]);

  const toggleFaq = (index: number) => {
    setFaqOpenStates((prevStates) => {
      if (prevStates[index]) {
        return prevStates.map((_, i) => i === index ? false : false);
      }
      return prevStates.map((_, i) => i === index);
    });
  };

  const handleSubscriptionSelect = async (plan: string) => {
    if (!currentUser) {
      await Swal.fire({
        title: 'Login Required',
        html: `
          <div class="space-y-4">
            <p>Please log in to subscribe to our premium features.</p>
            <div class="bg-gray-50 p-4 rounded-lg text-sm">
              <p class="font-medium text-gray-700">Why login?</p>
              <ul class="list-disc list-inside mt-2 text-gray-600">
                <li>Save your preferences</li>
                <li>Access premium features</li>
                <li>Track your subscriptions</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Login Now',
        cancelButtonText: 'Maybe Later',
        confirmButtonColor: '#22c55e',
      }).then((result) => {
        if (result.isConfirmed) {
          toggleLoginForm();
        }
      });
      return;
    }
  
    if (plan.toLowerCase() === 'basic') {
      await Swal.fire({
        title: 'Free Plan Selected',
        html: `
          <div class="space-y-4">
            <p>You can start writing blogs with our basic features.</p>
            <div class="bg-green-50 p-4 rounded-lg text-green-700">
              <p class="font-medium">Free Plan Features:</p>
              <ul class="list-disc list-inside mt-2">
                <li>3 blog posts per month</li>
                <li>Basic editor features</li>
                <li>Community support</li>
              </ul>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Start Writing',
        confirmButtonColor: '#22c55e',
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/text-editor');
        }
      });
      return;
    }
  
    try {
      await Swal.fire({
        title: 'Processing...',
        html: `
          <div class="space-y-4">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            <p>Setting up your subscription...</p>
          </div>
        `,
        allowOutsideClick: false,
        showConfirmButton: false
      });
  
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: currentUser.uid,
          userEmail: currentUser.email
        })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
  
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to load payment system');
      }
  
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
  
      if (error) {
        throw error;
      }
  
    } catch (error: any) {
      const errorCode = error.code as keyof typeof subscriptionErrorMessages;
      const errorDetails = subscriptionErrorMessages[errorCode] || {
        title: 'Subscription Error',
        text: 'We encountered an issue while processing your request.',
        icon: 'error',
        suggestion: 'Please try again or contact support if the problem persists.',
        action: 'Try Again'
      };
  
      await Swal.fire({
        title: errorDetails.title,
        html: `
          <div class="space-y-4">
            <p>${errorDetails.text}</p>
            <div class="bg-gray-50 p-4 rounded-lg text-sm">
              <p class="text-gray-700">${errorDetails.suggestion}</p>
              ${error.message ? `
                <div class="mt-2 p-2 bg-red-50 rounded text-red-600 text-xs">
                  Error details: ${error.message}
                </div>
              ` : ''}
            </div>
          </div>
        `,
        icon: errorDetails.icon as any,
        confirmButtonText: errorDetails.action,
        confirmButtonColor: '#22c55e',
        showCancelButton: true,
        cancelButtonText: 'Close'
      });
    }
  };

  const SubscriptionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-6xl mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Choose Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Basic</h3>
                  <p className="text-green-600 font-semibold mb-4">Free Plan</p>
                  <p className="text-sm text-gray-600 mb-6">For users who want full control over their blogging process.</p>
                </div>
                
                <div className="flex-grow space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manually choose topic
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manually write blog content
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish to website
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to personal blog page
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    No AI support
                  </div>
                  <div className="flex items-center text-sm font-medium mt-4">
                    Limit: 3 posts per month
                  </div>
                </div>

                <button
                  onClick={() => handleSubscriptionSelect('basic')}
                  className="w-full mt-6 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 border-2 border-green-500 rounded-xl bg-green-50 transform scale-105 relative">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 rounded-full -mt-2 -mr-2">
                Popular
              </div>
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Medium</h3>
                  <p className="text-green-600 font-semibold mb-4">$5.99/month</p>
                  <p className="text-sm text-gray-600 mb-6">For users who want AI help with content creation.</p>
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manually or AI-select topic
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI-generated blog (limited to 3 blogs/month)
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manual editing before publishing
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish to website
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to personal blog page
                  </div>
                  <div className="flex items-center text-sm font-medium mt-4">
                    Limit: 5 posts per month
                  </div>
                </div>

                <button
                  onClick={() => handleSubscriptionSelect('medium')}
                  className="w-full mt-6 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Choose Plan
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Premium</h3>
                  <p className="text-green-600 font-semibold mb-4">$14.99/month</p>
                  <p className="text-sm text-gray-600 mb-6">For users who want a hands-free blogging experience.</p>
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI selects topic
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI writes and publishes the blog automatically
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Option to edit before publishing
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish directly to personal blog page
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    View all published blogs in dashboard
                  </div>
                  <div className="flex items-center text-sm font-medium mt-4">
                    Unlimited posts
                  </div>
                </div>

                <button
                  onClick={() => handleSubscriptionSelect('premium')}
                  className="w-full mt-6 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Choose Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Enhanced Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
                BLOG FUSION
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <NavLink href="#home" isActive={true}>Home</NavLink>
              <NavLink href="#about" onClick={() => scrollToSection(aboutSectionRef)}>About</NavLink>
              <NavLink href="#services" onClick={() => scrollToSection(servicesSectionRef)}>Services</NavLink>
              <NavLink href="/blogfeed">Blog Feed</NavLink>
              <NavLink href="#contact" onClick={() => scrollToSection(contactSectionRef)}>Contact</NavLink>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <UserMenu 
                  user={currentUser} 
                  onLogout={handleLogout} 
                  onUpgrade={() => setIsSubscriptionModalOpen(true)}
                />
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleLoginForm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={toggleSignupForm}
                    className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="absolute inset-0">
          <Image
            src="/heropic.jpg"
            alt="Background"
            layout="fill"
            objectFit="cover"
            quality={100}
            priority
            className="opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80"></div>
        </div>

        <div className="relative h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Unleash Your Voice{' '}
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                Through Words
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Create, share, and inspire with your unique stories. Join our community of passionate writers.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <button
                onClick={() => scrollToSection(servicesSectionRef)}
                className="px-8 py-4 bg-green-500 text-white font-medium rounded-full hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/25"
              >
                Start Writing Now
                <motion.span 
                  className="ml-2"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.span>
              </button>
              <button
                onClick={() => scrollToSection(aboutSectionRef)}
                className="px-8 py-4 bg-white/10 text-white border-2 border-white/20 rounded-full backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
              >
                Learn More
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          </motion.div>

          <motion.div
            className="absolute bottom-8 cursor-pointer"
            onClick={() => scrollToSection(aboutSectionRef)}
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <div className="flex flex-col items-center">
              <span className="text-white/60 text-sm mb-2">Scroll to explore</span>
              <svg 
                className="w-6 h-6 text-white/60" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section 
        id="about" 
        ref={aboutSectionRef} 
        className="py-20 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <span className="inline-block px-3 py-1 text-sm font-semibold text-green-500 bg-green-50 rounded-full">
                EMPOWER YOUR VOICE
              </span>
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                Craft Your Stories with 
                <span className="text-green-500"> Precision and Style</span>
              </h2>
              <div className="w-20 h-1 bg-green-500"></div>
              <p className="text-lg text-gray-600 leading-relaxed">
                At Blog Fusion, we empower creators to share their unique perspectives. 
                Our platform combines intuitive design with powerful features, making 
                blog creation seamless and enjoyable.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { title: 'Easy Writing', value: '100%' },
                  { title: 'Publishing Speed', value: '2min' },
                  { title: 'User Satisfaction', value: '99%' },
                  { title: 'Global Reach', value: '150+' }
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
              </div>
                <Link 
                  href="#contact"
                  className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300"
                >
                  Start Writing
                </Link>
                <Link 
                  href="#services"
                  className="px-6 py-3 text-black hover:text-green-500 transition-all duration-300"
                >
                  Learn More →
                </Link>
              </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-blue-100 transform rotate-6 rounded-2xl"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/aboutrm.png"
                  alt="About Blog Fusion"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover transform hover:scale-105 transition-all duration-500"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-500 rounded-full opacity-20"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blog Posts Section (Services Section) */}
      <section id="services" ref={servicesSectionRef} className="bg-gradient-to-b from-gray-50 to-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
              BLOGGING MADE EASY
            </span>
            <h2 className="text-3xl font-bold mt-4 mb-2">
              Create, publish, and share with ease
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose your preferred way of creating content and start sharing your ideas with the world
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/man.jpg"
                  alt="Manual Blog Writing"
                  layout="fill"
                  objectFit="cover"
                  className="transform hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex flex-col h-[calc(100%-192px)]">
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold">Manual Blog Writing</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4 flex-grow">
                  Create compelling content with our intuitive editor. Perfect for crafting detailed, 
                  personalized blog posts with complete creative control.
                </p>
                <button
                  onClick={() => {
                    if (currentUser) {
                      router.push('/text-editor');
                    } else {
                      setBlogFunctionality("manual");
                      toggleLoginForm();
                    }
                  }}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center group"
                >
                  Start Writing
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/auto.jpg"
                  alt="Automation Blog Writing"
                  layout="fill"
                  objectFit="cover"
                  className="transform hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex flex-col h-[calc(100%-192px)]">
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold">Automation Blog Writing</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4 flex-grow">
                  Let AI assist you in creating SEO-optimized content. Ideal for consistent 
                  posting and data-driven blog creation.
                </p>
                <button
                  onClick={() => {
                    if (currentUser) {
                      router.push('/autoform');
                    } else {
                      setBlogFunctionality("automated");
                      toggleLoginForm();
                    }
                  }}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center group"
                >
                  Try Automation
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" ref={faqSectionRef} className="py-12 px-6">
        <h3 className="text-gray text-center text-sm font-bold mb-2">FAQ</h3>
        <h2 className="text-3xl font-bold text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              question: "What is Blog Fusion?",
              answer:
                "Blog Fusion is a platform that helps you create and publish blogs effortlessly using a user-friendly interface inspired by Medium.",
            },
            {
              question: "How can I start blogging?",
              answer:
                "Simply sign up, log in, and use our intuitive manual editor to craft and publish your blogs.",
            },
            {
              question: "Is Blog Fusion free to use?",
              answer:
                "Yes, Blog Fusion offers free access to its basic features. Premium features may require a subscription.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-gray-100 p-4 rounded shadow cursor-pointer"
              onClick={() => toggleFaq(index)}
            >
              <h4 className="text-lg font-bold flex justify-between items-center">
                {faq.question}
                <span className="text-green-500">{faqOpenStates[index] ? "-" : "+"}</span>
              </h4>
              {faqOpenStates[index] && <p className="text-gray-600 mt-2">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section ref={contactSectionRef} id="contact" className="flex flex-col md:flex-row items-center my-16 px-6 md:px-12">
        <div className="max-w-4xl mx-auto grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-black-500 text-sm font-bold mb-2">GET IN TOUCH</h3>
            <h2 className="text-3xl font-bold mb-4">
              We are here to help you blog better!
            </h2>
            {isSubmitted ? (
              <p className="text-green-600 font-bold">
                Thank you, {formData.name}! Your message has been sent.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@website.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your message"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-600"
                >
                  Submit
                </button>
              </form>
            )}
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Contact Information</h3>
            <p className="mb-4">
              <strong>Email:</strong> blogfusion2025@gmail.com
            </p>
            <p className="mb-4">
              <strong>Location:</strong> Karachi, SD, PK
            </p>
            <h4 className="text-lg font-bold mb-2">Business Hours</h4>
            <ul className="text-gray-700 space-y-2">
              <li>Monday - Friday: 9:00 AM - 10:00 PM</li>
              <li>Saturday: 9:00 AM - 6:00 PM</li>
              <li>Sunday: 9:00 AM - 12:00 PM</li>
            </ul>
          </div>
        </div>
      </section>

      {isLoginFormVisible && (
        <section id="#login" className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="relative bg-white p-8 rounded shadow-lg w-full max-w-md">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={toggleLoginForm}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Login</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="login-email"
                  name="login-email"
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
                  name="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="new-password"
                  required
                />
              </div>
            
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-600"
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
              Forgot your password?{" "}
              <button
                onClick={handleForgotPassword}
                className="text-blue-400 hover:underline"
              >
                Reset
              </button>
            </p>
            <p className="mt-4 text-sm text-center text-gray-400">
              Do not have an account?{" "}
              <button
                onClick={toggleForm}
                className="text-blue-400 hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </section>
      )}

      {isSignupFormVisible && (
        <section className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="relative bg-white p-8 rounded shadow-lg w-full max-w-md">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={toggleSignupForm}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <form className="space-y-4" onSubmit={handleSignUp} autoComplete="off">
              <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="signup-name"
                  name="signup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="signup-email"
                  name="signup-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@website.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="signup-password"
                  name="signup-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-600"
              >
                Sign Up
              </button>
            </form>
          </div>
        </section>
      )}

      <footer className="bg-gray-900 text-white py-6">
        <div className="text-center">
          <p className="text-sm">&copy; 2025 Blog Fusion. All Rights Reserved.</p>
          <div className="flex justify-center space-x-4 mt-4">
            <Link href="#" className="hover:text-gray-400">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-gray-400">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-gray-400">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>

      {isSubscriptionModalOpen && (
        <SubscriptionModal onClose={() => setIsSubscriptionModalOpen(false)} />
      )}
    </div>
  );
};

export default Homepage;