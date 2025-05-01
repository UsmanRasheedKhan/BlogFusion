// FormPage.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { FaUserCircle } from "react-icons/fa";
import { generateBlog } from '../api/lib/api';
import { auth } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import Swal from 'sweetalert2';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface FormData {
  topic: string;
  country: string;
  audience: string;
  keywords: string;
  urls: string;
}

const FormPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    topic: '',
    country: '',
    audience: '',
    keywords: '',
    urls: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [urls, setUrls] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [imageLink, setImageLink] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [category, setCategory] = useState<string>("");
  const [userPlan, setUserPlan] = useState<string>('basic');
  const [planExpiry, setPlanExpiry] = useState<any>(null);
  const router = useRouter();

  const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'India', 'China', 'Japan', 'Pakistan'];
  const categories = ["General", "Technology", "Health", "Lifestyle", "Business", "Travel", "Food"];
  const progressSteps = [
    { percent: 10, text: 'Getting details...' },
    { percent: 40, text: 'Analyzing input...' },
    { percent: 70, text: 'Generating blog...' },
    { percent: 100, text: 'Finalizing blog...' }
  ];

  useEffect(() => {
    const storedUrls = JSON.parse(sessionStorage.getItem('urlsArray') || '[]');
    setUrls(storedUrls);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchPlan = async () => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserPlan(data.plan || 'basic');
          setPlanExpiry(data.planExpiry || null);
        }
      };
      fetchPlan();
    }
  }, [user]);

  const isValidImageUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setProgress(0);
    setProgressText(progressSteps[0].text);

    // PLAN CHECK
    const now = new Date();
    let expired = false;
    if (userPlan !== 'basic' && planExpiry) {
      expired = new Date(planExpiry) < now;
    }
    if (userPlan === 'basic' || expired) {
      setLoading(false);
      await Swal.fire({
        title: expired ? 'Plan Expired' : 'Upgrade Required',
        text: expired
          ? 'Your subscription has expired. Please upgrade to continue using AI blog generation.'
          : 'AI blog generation is only available for Medium and Premium plans. Please upgrade your plan.',
        icon: 'warning',
        confirmButtonText: 'Upgrade Now',
        confirmButtonColor: '#22c55e',
      });
      return;
    }

    if (!imageLink) {
      setError("Please provide an image link before generating the blog.");
      setLoading(false);
      return;
    }
    if (!isValidImageUrl(imageLink)) {
      setError("Please provide a valid image URL (must start with http/https)");
      setLoading(false);
      return;
    }

    let step = 0;
    const progressInterval = setInterval(() => {
      step++;
      if (step < progressSteps.length) {
        setProgress(progressSteps[step].percent);
        setProgressText(progressSteps[step].text);
      }
    }, 1200);

    try {
      const finalImageUrl = imageLink;
      setImageLink(imageLink);

      await new Promise(res => setTimeout(res, 2400));

      setProgress(progressSteps[2].percent);
      setProgressText(progressSteps[2].text);
      const response = await generateBlog({
        ...formData,
        title: formData.topic
      });

      setProgress(progressSteps[3].percent);
      setProgressText(progressSteps[3].text);
      await new Promise(res => setTimeout(res, 1200));

      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
      const urlsArray = formData.urls.split(',').map(u => u.trim()).filter(Boolean);
      console.log('Generated keywords:', keywordsArray);
      console.log('Generated urls:', urlsArray);
      sessionStorage.setItem('keywordsArray', JSON.stringify(keywordsArray));
      sessionStorage.setItem('urlsArray', JSON.stringify(urlsArray));
      sessionStorage.setItem('generatedBlog', response.blog);
      sessionStorage.setItem('blogImage', finalImageUrl);
      sessionStorage.setItem('category', category);

      if (user) {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/firebaseConfig');
        await setDoc(doc(db, "userKeywords", user.uid), {
          keywords: keywordsArray,
          urls: urlsArray,
          updatedAt: new Date()
        });
      }

      clearInterval(progressInterval);
      setLoading(false);
      router.push('/blogeditor');
    } catch (err: any) {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
      setProgressText('');
      const errorMessage = err.message.includes('timeout')
        ? 'Generation is taking longer than expected. Please try again.'
        : err.message;
      setError(errorMessage);
    }
  };

  const isFormValid = () => {
    return (
      formData.topic &&
      formData.country &&
      formData.audience &&
      formData.urls &&
      imageLink &&
      category
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 w-64">
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center space-x-3 mb-8">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
              Blog Fusion
            </span>
          </div>
          <nav className="flex-1">
            <div className="space-y-4">
              <Link href="/" className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </Link>
              <Link href="/profile" className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Profile</span>
              </Link>
              <Link href="/blogs" className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5-2.5 0 00-2.5-2.5H15" />
                </svg>
                <span>My Blogs</span>
              </Link>
            </div>
          </nav>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 transition-all duration-300 ml-64">
        {/* Progress Bar at the top */}
        {loading && (
          <div className="fixed top-0 left-0 w-full z-50">
            <div className="w-full bg-gray-200 h-2">
              <div className="bg-green-500 h-2 transition-all duration-700" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="text-center text-gray-700 font-medium text-base py-2 bg-white/80 backdrop-blur-sm shadow">
              {progressText}
            </div>
          </div>
        )}
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium">Automated Blog Writer</span>
          </div>
          {/* User Info on the right */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white">
              <FaUserCircle className="w-6 h-6" />
            </div>
            <span className="text-gray-700 font-medium">{user?.displayName || 'User'}</span>
          </div>
        </div>
        {/* Form Content - full width */}
        <div className="px-8 py-12 w-full max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 w-full">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Generate a Blog</h1>
            <form onSubmit={handleSubmit} className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                    placeholder="Enter blog topic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                  >
                    <option value="">Select country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
                  <input
                    type="text"
                    value={formData.audience}
                    onChange={e => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                    placeholder="Intended audience"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keywords (comma separated)</label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                    placeholder="e.g. AI, blogging, SEO"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">URLs (comma separated)</label>
                  <input
                    type="text"
                    value={formData.urls}
                    onChange={e => setFormData({ ...formData, urls: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                    placeholder="e.g. https://example.com, https://another.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blog Image Link <span className="text-red-500">*</span></label>
                  <input
                    type="url"
                    value={imageLink}
                    onChange={e => setImageLink(e.target.value)}
                    placeholder="Paste any direct image URL (must start with http/https)"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    required
                  />
                  {imageLink && (
                    <div className="mt-2">
                      <img
                        src={imageLink}
                        alt="Preview"
                        className="h-32 rounded-lg object-cover border"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {error && (
                <p className="text-red-500 mt-4">{error}</p>
              )}
              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                  disabled={!isFormValid() || loading}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Generate Blog</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPage;
