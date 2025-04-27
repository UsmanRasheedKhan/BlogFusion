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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageLink, setImageLink] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [category, setCategory] = useState<string>("");
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImageLink(""); // Clear direct link if file is chosen
    }
  };

  const handleImageLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageLink(e.target.value);
    if (e.target.value) setImageFile(null); // Clear file if direct link is entered
  };

  // Helper to validate image URL
  const isValidImageUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(parsed.pathname)
      );
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

    let finalImageUrl = "";

    if (!imageFile && !imageLink) {
      setError("Please upload a blog image or provide an image link before generating the blog.");
      setLoading(false);
      return;
    }
    if (imageLink && !isValidImageUrl(imageLink)) {
      setError("Please provide a valid direct image URL (must end with .jpg, .png, etc.)");
      setLoading(false);
      return;
    }

    // Progress simulation
    let step = 0;
    const progressInterval = setInterval(() => {
      step++;
      if (step < progressSteps.length) {
        setProgress(progressSteps[step].percent);
        setProgressText(progressSteps[step].text);
      }
    }, 1200);

    try {
      if (imageFile) {
        const storage = getStorage();
        const imgRef = storageRef(storage, `blog-images/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imgRef, imageFile);
        finalImageUrl = await getDownloadURL(imgRef);
        setImageUrl(finalImageUrl);
      } else if (imageLink) {
        finalImageUrl = imageLink;
        setImageUrl(imageLink);
      }

      // Wait for progress bar to reach 'Generating blog...'
      await new Promise(res => setTimeout(res, 2400));

      // Call API (simulate network delay for progress bar)
      setProgress(progressSteps[2].percent);
      setProgressText(progressSteps[2].text);
      const { image, ...rest } = formData;
      const response = await generateBlog({
        ...rest,
        title: formData.topic
      });

      // Wait for progress bar to reach 'Finalizing blog...'
      setProgress(progressSteps[3].percent);
      setProgressText(progressSteps[3].text);
      await new Promise(res => setTimeout(res, 1200));

      sessionStorage.setItem('generatedBlog', response.blog);
      sessionStorage.setItem('blogImage', finalImageUrl);
      sessionStorage.setItem('category', category);
      const urlsArray = formData.urls.split(',').map(u => u.trim()).filter(Boolean);
      sessionStorage.setItem('urlsArray', JSON.stringify(urlsArray));
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
      (imageFile || (imageLink && isValidImageUrl(imageLink))) &&
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blog Image <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all mb-2"
                    disabled={!!imageLink}
                  />
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-gray-500 text-sm">or</span>
                    <input
                      type="url"
                      value={imageLink}
                      onChange={handleImageLinkChange}
                      placeholder="Paste direct image URL (https://...)"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      disabled={!!imageFile}
                    />
                  </div>
                  {(imageFile || imageLink) && (
                    <div className="mt-2">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : imageLink}
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
