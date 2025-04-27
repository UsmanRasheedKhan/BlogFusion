"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoIcon from '@mui/icons-material/Info';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { db, auth } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Swal from 'sweetalert2';

const humanizationSteps = [
  "Analyzing content",
  "Processing language patterns",
  "Applying human writing style",
  "Refining and finalizing"
];

const BlogEditor = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editedBlog, setEditedBlog] = useState('');
  const [suggestedContent, setSuggestedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Original, 1: Humanized
  const [copyStatus, setCopyStatus] = useState('');
  const [aiScoreOriginal, setAiScoreOriginal] = useState(null);
  const [aiScoreHumanized, setAiScoreHumanized] = useState(null);
  const [progressStep, setProgressStep] = useState(0);
  const [blogFetch, setBlogFetch] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');

  // Read from URL params or sessionStorage
  const generatedBlog = searchParams.get('generatedBlog') || '';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedKeywords = JSON.parse(sessionStorage.getItem('keywordsArray') || '[]');
    const storedUrls = JSON.parse(sessionStorage.getItem('urlsArray') || '[]');
    setKeywords(storedKeywords);
    setUrls(storedUrls);
  }, []);

  useEffect(() => {
    let blog = generatedBlog;
    if (!blog) {
      blog = sessionStorage.getItem('generatedBlog') || '';
    }
    if (blog) {
      setEditedBlog(blog);
      // Extract title from first heading or first line
      const firstLine = blog.split('\n')[0];
      const headingMatch = firstLine.match(/^#\s*(.*)/);
      setTitle(headingMatch ? headingMatch[1] : firstLine.trim());
    }
    if (blog === '') {
      setBlogFetch(true);
    }
    console.log('keywords:', keywords);
  }, [generatedBlog]);

  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgressStep(prev => {
          if (prev < humanizationSteps.length - 1) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setProgressStep(0);
    }
  }, [isLoading]);

  const handleHumanizeBlog = async () => {
    setIsLoading(true);
    setProgressStep(0);
    try {
      const startTime = Date.now();
      // Replace with your actual API endpoint for humanization
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editedBlog,
          keywords
        })
      });
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 6000) {
        await new Promise(resolve => setTimeout(resolve, 6000 - elapsedTime));
      }
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setAiScoreOriginal(data.ai_detection_original || 85);
        setAiScoreHumanized(data.ai_detection_humanized || 25);
        const formattedHumanizedContent = preserveFormatting(
          editedBlog,
          data.humanized_content || ''
        );
        setSuggestedContent(formattedHumanizedContent);
        setActiveTab(1);
        setIsHumanized(true);
      } else {
        throw new Error(data.message || 'Humanization failed');
      }
    } catch (error) {
      setCopyStatus(
        `Error: ${
          typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message?: string }).message
            : 'Failed to humanize content'
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const preserveFormatting = (original: string, humanized: string) => {
    const originalLines = original.split('\n');
    const humanizedLines = humanized.split('\n');
    let originalTitle = '';
    for (const line of originalLines) {
      if (line.trim().startsWith('#')) {
        originalTitle = line;
        break;
      }
    }
    let hasTitle = false;
    for (const line of humanizedLines) {
      if (line.trim().startsWith('#')) {
        hasTitle = true;
        break;
      }
    }
    let formattedContent = humanized;
    if (originalTitle && !hasTitle) {
      formattedContent = originalTitle + '\n\n' + formattedContent;
    }
    if (formattedContent.split('\n\n').length < original.split('\n\n').length) {
      const originalParagraphCount = original.split('\n\n').length;
      formattedContent = formattedContent.replace(/([.!?])\s+/g, '$1\n\n');
      const currentBreaks = formattedContent.split('\n\n').length;
      if (currentBreaks > originalParagraphCount * 1.5) {
        formattedContent = formattedContent.split('\n\n')
          .slice(0, originalParagraphCount + 1)
          .join('\n\n') + '\n\n' +
          formattedContent.split('\n\n').slice(originalParagraphCount + 1).join(' ');
      }
    }
    return formattedContent;
  };

  const handleUseHumanizedContent = () => {
    setEditedBlog(suggestedContent);
    setIsHumanized(true);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(currentContent);
    setCopyStatus('Content copied to clipboard!');
  };

  const formatBlogContent = (content: string) => {
    // Replace [www.example.com] with a link on the previous word
    let formatted = content.replace(/([\w.-]+) \[(https?:\/\/)?(www\.)?([\w.-]+)\.[a-z]{2,}\]/g, (match, name, proto, www, domain) => {
      const url = `https://${domain}`;
      return `***<a href=\"${url}\" target=\"_blank\" rel=\"noopener noreferrer\"><b><i>${name}</i></b></a>`;
    });
    // Existing formatting logic
    return formatted
      .replace(/^-{3,}/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/#{1,6}\s+(.*)/g, (match, p1) => {
        const level = match.split(' ')[0].length;
        return `<h${level}>${p1}</h${level}>`;
      })
      .replace(/For more information([\s\S]*?)(?=\n|$)/g, (match) => {
        return `<div class="references-section">${match.replace('---', '')}</div>`;
      })
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '')
      .join('');
  };

  const handlePublish = async () => {
    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to publish a blog');
      }

      // Show loading state
      setIsLoading(true);

      let processedContent = currentContent;

      // Embed keywords as hyperlinks
      keywords.forEach((keyword, idx) => {
        if (keyword && urls[idx]) {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          processedContent = processedContent.replace(
            regex,
            `<a href="${urls[idx]}" target="_blank" rel="noopener noreferrer">${keyword}</a>`
          );
        }
      });

      // Format the processed content as HTML
      const formattedBlogHtml = formatBlogContent(processedContent);

      // Extract title from first heading or first line
      let blogTitle = title;
      if (!blogTitle) {
        const firstLine = currentContent.split('\n')[0];
        const headingMatch = firstLine.match(/^#\s*(.*)/);
        blogTitle = headingMatch ? headingMatch[1] : firstLine.trim();
      }

      // Get cover image from sessionStorage
      const coverImage = sessionStorage.getItem('blogImage') || '';

      // Save to Firebase
      const blogData = {
        title: blogTitle,
        content: formattedBlogHtml,
        rawContent: processedContent,
        userId: user.uid,
        author: user.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        aiScore: currentScore,
        isHumanized: activeTab === 1,
        keywords: keywords,
        urls: urls,
        status: 'published',
        coverImage, // <-- Save the image URL
        type: 'manual', // <-- Add this line
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, "blogs"), blogData);

      // Store the blog ID and title for reference
      sessionStorage.setItem("publishedBlogId", docRef.id);
      sessionStorage.setItem("publishedBlog", formattedBlogHtml);
      sessionStorage.setItem("publishedBlogTitle", blogTitle);

      // Show success message
      await Swal.fire({
        title: 'Success!',
        text: 'Your blog has been published successfully',
        icon: 'success',
        confirmButtonColor: '#22c55e'
      });

      // Redirect to the published blog
      router.push("/publishblog");

    } catch (error) {
      console.error('Publish error:', error);
      
      // Show error message
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to publish blog',
        icon: 'error',
        confirmButtonColor: '#22c55e'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentContent = activeTab === 0 ? editedBlog : suggestedContent;
  const currentScore = activeTab === 0 ? aiScoreOriginal : aiScoreHumanized;

  if (blogFetch) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5">No blog content found</Typography>
        <button
          style={{
            marginTop: 16,
            padding: '8px 24px',
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontWeight: 500,
            fontSize: 16,
            cursor: 'pointer'
          }}
          onClick={() => router.push('/')}
        >
          Go Back
        </button>
      </Box>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
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
      <div className="flex-1 transition-all duration-300 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Progress Bar at the top (like autoform) */}
        {isLoading && (
          <div className="fixed top-0 left-0 w-full z-50">
            <div className="w-full bg-gray-200 h-2">
              <div className="bg-green-500 h-2 transition-all duration-700" style={{ width: `${(progressStep+1)*25}%` }}></div>
            </div>
            <div className="text-center text-gray-700 font-medium text-base py-2 bg-white/80 backdrop-blur-sm shadow">
              {humanizationSteps[progressStep]}...
            </div>
          </div>
        )}
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          {/* Blog Editor heading on the left */}
          <span className="text-2xl font-bold text-gray-700">Blog Editor</span>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white">
              <FaUserCircle className="w-6 h-6" />
            </div>
            <span className="text-gray-700 font-medium">{user?.displayName || user?.email || 'User'}</span>
          </div>
        </div>
        {/* Editor Content */}
        <div className="flex-1 flex flex-row w-full max-w-7xl mx-auto px-8 py-0 gap-8 overflow-hidden">
          {/* Editor Section */}
          <div className="flex-1 flex flex-col h-full">
            {/* Tabs for Original/Humanized */}
            <div className="pt-8 pb-2">
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                <Tab label="Original" />
                <Tab label="Humanized" disabled={!suggestedContent} />
              </Tabs>
            </div>
            {/* Editor Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <textarea
                value={activeTab === 0 ? editedBlog : suggestedContent}
                onChange={e => activeTab === 0 ? setEditedBlog(e.target.value) : setSuggestedContent(e.target.value)}
                placeholder="Start editing your generated blog here..."
                className="w-full h-full p-6 text-lg border-0 focus:ring-0 rounded-xl font-mono bg-white focus:outline-none resize-none overflow-y-auto"
                style={{ fontFamily: 'inherit', fontSize: '1.1rem', minHeight: 'calc(100vh - 360px)', maxHeight: 'calc(100vh - 360px)' }}
                disabled={isLoading}
              />
            </div>
            {/* Buttons Row */}
            <div className="flex items-center justify-between mt-6 gap-4 mb-8">
              <div className="flex gap-4">
                <button
                  onClick={handleHumanizeBlog}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center space-x-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <AutoAwesomeMotionIcon className="mr-2" />
                      <span>Humanize Blog</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopyContent}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold flex items-center space-x-2"
                >
                  <ContentCopyIcon className="mr-2" />
                  <span>Copy</span>
                </button>
              </div>
              <button
                onClick={handlePublish}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center space-x-2"
              >
                <span>Publish Blog</span>
              </button>
            </div>
            {copyStatus && (
              <div className="mt-4 text-green-600 font-medium">{copyStatus}</div>
            )}
          </div>
          {/* Blog Details Box */}
          <div className="w-full md:w-96 flex-shrink-0 flex flex-col justify-start">
            <div className="pt-8"> {/* Add top padding to match editor */}
              <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Blog Details</h3>
                <div className="mb-4">
                  <span className="block text-gray-500 text-sm mb-1">AI Detection Risk</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${currentScore && currentScore > 60 ? 'text-red-500' : currentScore && currentScore > 30 ? 'text-yellow-500' : 'text-green-600'}`}>{currentScore !== null ? `${Math.round(currentScore)}%` : '--'}</span>
                    <SmartToyIcon className="text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-400">Lower is more human-like</span>
                </div>
                <div className="mb-4">
                  <span className="block text-gray-500 text-sm mb-1">SEO Optimization</span>
                  <span className="font-semibold text-gray-700">{keywords.length} keywords integrated</span>
                </div>
                <div className="mb-4">
                  <span className="block text-gray-500 text-sm mb-1">Humanization</span>
                  <span className={`font-semibold ${isHumanized ? 'text-green-600' : 'text-gray-700'}`}>{isHumanized ? 'Humanized' : 'Original'}</span>
                </div>
                {currentScore !== null && currentScore > 60 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-2 text-yellow-700 text-sm">
                    This content may be detected as AI-generated. Consider using the humanized version.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
