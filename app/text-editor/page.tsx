"use client";

import React, { useState, useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase/firebaseConfig";
import { customSignOut } from "../firebase/firebaseConfig";
import { useRouter } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import Swal from "sweetalert2";
import Link from "next/link";
import Image from "next/image";
import { storage } from "../firebase/firebaseConfig";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Add error boundary at the top of the file
class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const TextEditor = () => {
  const [editorHtml, setEditorHtml] = useState<string>(""); // State for Quill content
  const [title, setTitle] = useState<string>(""); // State for blog title
  const [metaDescription, setMetaDescription] = useState<string>(""); // State for meta description
  const [category, setCategory] = useState<string>(""); // State for blog category
  const [user, setUser] = useState<any>(null); // State for authenticated user
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State for sidebar visibility
  const [monthlyPostCount, setMonthlyPostCount] = useState<number>(0); // State for monthly post count
  const [imageFile, setImageFile] = useState<File | null>(null); // State for image file
  const [imageUrl, setImageUrl] = useState<string>(""); // State for uploaded image URL
  const [imageLink, setImageLink] = useState<string>(""); // State for image URL input
  const [imageError, setImageError] = useState<string>(""); // State for image error

  const editorRef = useRef<HTMLDivElement | null>(null); // Ref for the Quill editor container
  const quillRef = useRef<Quill | null>(null); // Ref to hold the Quill instance
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser({
          ...currentUser,
          displayName: currentUser.displayName || "User", // Fallback to "User"
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Redirect if not authenticated
    if (!auth.currentUser) {
      Swal.fire({
        title: 'Access Denied',
        text: 'Please login to access the editor',
        icon: 'error',
        confirmButtonColor: '#22c55e',
      }).then(() => {
        router.push('/');
      });
    }
  }, [router]);

  const categories = ["General", "Technology", "Health", "Lifestyle", "Business", "Travel", "Food"];

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      try {
        quillRef.current = new Quill(editorRef.current, {
          theme: "snow",
          modules: {
            toolbar: [
              [{ header: "1" }, { header: "2" }, { font: [] }],
              [{ list: "ordered" }, { list: "bullet" }],
              ["bold", "italic", "underline"],
              ["link", "image"],
              [{ align: [] }],
              ["clean"],
            ],
          },
          placeholder: 'Start writing your blog post...',
        });

        // Updated content change handler
        quillRef.current.on("text-change", function() {
          if (quillRef.current) {
            const content = quillRef.current.root.innerHTML;
            // Only update if there's actual content
            const textOnlyContent = quillRef.current.getText().trim();
            
            if (textOnlyContent !== '') {
              setEditorHtml(content);
            } else {
              setEditorHtml('');
            }
          }
        });

      } catch (error) {
        console.error('Error initializing Quill:', error);
        Swal.fire({
          title: 'Editor Error',
          text: 'Failed to initialize the text editor. Please refresh the page.',
          icon: 'error',
          confirmButtonColor: '#22c55e',
        });
      }
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
      }
    };
  }, []);

  // Function to check monthly post limit
  const checkMonthlyPostLimit = async (userId: string) => {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Only query by userId
      const blogsRef = collection(db, "blogs");
      const q = query(blogsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      // Filter the results in memory for the current month
      const postsThisMonth = querySnapshot.docs.filter(doc => {
        const postDate = doc.data().createdAt?.toDate();
        return postDate && postDate >= firstDayOfMonth && postDate <= lastDayOfMonth;
      });

      return postsThisMonth.length;
    } catch (error) {
      console.error('Error checking monthly post limit:', error);
      return 0;
    }
  };

  // Add proper type for validation result
  type ValidationResult = 
    | { isValid: true }
    | { isValid: false; error: { title: string; text: string; icon: 'warning' | 'error' | 'info' | 'success' }};

  // Update the validateBlogPost function to properly check Quill content
  const validateBlogPost = (): ValidationResult => {
    if (!user) {
      return {
        isValid: false,
        error: {
          title: 'Authentication Required',
          text: 'Please login to create a blog post.',
          icon: 'error'
        }
      };
    }

    if (!title.trim()) {
      return {
        isValid: false,
        error: {
          title: 'Missing Title',
          text: 'Please enter a title for your blog post.',
          icon: 'warning'
        }
      };
    }

    if (title.length < 50 || title.length > 60) {
      return {
        isValid: false,
        error: {
          title: 'Invalid Title Length',
          text: 'Your title should be between 50 and 60 characters for optimal SEO.',
          icon: 'info'
        }
      };
    }

    if (!metaDescription.trim()) {
      return {
        isValid: false,
        error: {
          title: 'Missing Meta Description',
          text: 'A meta description is required for better search engine visibility.',
          icon: 'warning'
        }
      };
    }

    if (metaDescription.length < 150 || metaDescription.length > 160) {
      return {
        isValid: false,
        error: {
          title: 'Invalid Meta Description Length',
          text: 'Meta description should be between 150 and 160 characters for best SEO practices.',
          icon: 'info'
        }
      };
    }

    if (!category) {
      return {
        isValid: false,
        error: {
          title: 'Category Required',
          text: 'Please select a category for your blog post.',
          icon: 'warning'
        }
      };
    }

    // Improved content validation
    if (!quillRef.current) {
      return {
        isValid: false,
        error: {
          title: 'Editor Error',
          text: 'The editor failed to initialize properly.',
          icon: 'error'
        }
      };
    }

    const textContent = quillRef.current.getText().trim();
    
    if (!textContent) {
      return {
        isValid: false,
        error: {
          title: 'Empty Content',
          text: 'Please add some content to your blog post before publishing.',
          icon: 'warning'
        }
      };
    }

    if (textContent.length < 100) {
      return {
        isValid: false,
        error: {
          title: 'Insufficient Content',
          text: `Your blog post needs more content (${textContent.length}/100 characters minimum).`,
          icon: 'info'
        }
      };
    }

    if (!imageFile && !imageLink) {
      return {
        isValid: false,
        error: {
          title: 'Image Required',
          text: 'Please upload an image or provide a direct image URL.',
          icon: 'warning'
        }
      };
    }

    if (imageLink && !isValidImageUrl(imageLink)) {
      return {
        isValid: false,
        error: {
          title: 'Invalid Image URL',
          text: 'Please provide a valid direct image URL (must end with .jpg, .png, etc.)',
          icon: 'warning'
        }
      };
    }

    return { isValid: true };
  };

  // Update the handleSave function
  const handleSave = async () => {
    try {
      // Check authentication
      if (!user) {
        throw new Error('You must be logged in to save a blog post.');
      }

      // Validate the blog post
      const validation = validateBlogPost();
      if (!validation.isValid && 'error' in validation) {
        await Swal.fire({
          title: validation.error.title,
          text: validation.error.text,
          icon: validation.error.icon,
          confirmButtonColor: '#22c55e',
          confirmButtonText: 'Got it!'
        });
        return;
      }

      // Show saving indicator
      Swal.fire({
        title: 'Saving your blog...',
        html: 'Please wait while we publish your content.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Get the content directly from Quill
      const content = quillRef.current?.root.innerHTML || '';

      let finalImageUrl = "";
      if (imageFile) {
        const imgRef = storageRef(storage, `blog-images/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imgRef, imageFile);
        finalImageUrl = await getDownloadURL(imgRef);
        setImageUrl(finalImageUrl);
      } else if (imageLink) {
        finalImageUrl = imageLink;
        setImageUrl(imageLink);
      }

      // Save to Firestore with all fields
      const docRef = await addDoc(collection(db, "blogs"), {
        title: title.trim(),
        metaDescription: metaDescription.trim(),
        content: content, // Save the actual HTML content
        category,
        userId: user.uid,
        author: user.displayName || user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'published',
        coverImage: finalImageUrl,
        type: 'manual', // <-- Add this line
      });

      // Show success message
      await Swal.fire({
        title: 'Published Successfully!',
        text: 'Your blog has been published successfully.',
        icon: 'success',
        confirmButtonColor: '#22c55e',
        showConfirmButton: true,
        confirmButtonText: 'Write Another Blog',
        showCancelButton: true,
        cancelButtonText: 'View My Blogs',
      }).then((result) => {
        if (result.isConfirmed) {
          // Reset form for new blog
          resetForm();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          // Redirect to blogs page
          router.push('/blogs');
        }
      });

    } catch (error) {
      console.error('Save error:', error);
      Swal.fire({
        title: 'Error Saving Blog',
        text: error instanceof Error ? error.message : 'An unexpected error occurred',
        icon: 'error',
        confirmButtonColor: '#22c55e',
      });
    }
  };

  // Update the resetForm function to only reset form fields
  const resetForm = () => {
    setTitle('');
    setMetaDescription('');
    setCategory('');
    setImageFile(null);
    setImageLink('');
    setImageUrl('');
    setImageError('');
    if (quillRef.current) {
      quillRef.current.root.innerHTML = '';
    }
    setEditorHtml('');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await customSignOut();
      localStorage.removeItem("user");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("An error occurred while logging out. Please try again.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setImageLink("");
      setImageError("");
    }
  };

  const handleImageLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageLink(e.target.value);
    if (e.target.value) setImageFile(null);
    setImageError("");
  };

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Enhanced Sidebar with fixed positioning and proper z-index */}
      <div
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center space-x-3 mb-8">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
              Blog Fusion
            </span>
          </div>

          <nav className="flex-1">
            <div className="space-y-4">
              <Link 
                href="/"
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </Link>

              <Link 
                href="/profile"
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Profile</span>
              </Link>

              <Link 
                href="/blogs"
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                </svg>
                <span>My Blogs</span>
              </Link>
            </div>
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content with proper margin and transition */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar with higher z-index */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <span className="text-gray-700">{user.displayName || "User"}</span>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold">
                      {user.displayName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editor Content */}
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Blog</h1>

            {/* Blog Image Upload/URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blog Cover Image <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all mb-2"
                disabled={!!imageLink}
              />
              <div className="flex items-center gap-4 mb-2">
                <span className="text-gray-500 text-sm">or</span>
                <input
                  type="url"
                  value={imageLink}
                  onChange={handleImageLinkChange}
                  placeholder="Paste direct image URL (https://...)"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
              {imageError && <p className="text-red-500 mt-2">{imageError}</p>}
            </div>

            {/* Blog Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blog Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title (50-60 characters)"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              <p className={`mt-2 text-sm ${
                title.length >= 50 && title.length <= 60 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {title.length}/60 characters
              </p>
            </div>

            {/* Meta Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Write a compelling meta description (150-160 characters)"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all min-h-[100px]"
              />
              <p className={`mt-2 text-sm ${
                metaDescription.length >= 150 && metaDescription.length <= 160 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {metaDescription.length}/160 characters
              </p>
            </div>

            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Quill Editor */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <div
                ref={editorRef}
                className="border border-gray-200 rounded-lg"
                style={{ height: '400px' }}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Publish Blog</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Optional overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

// Wrap the TextEditor export
export default function TextEditorWithErrorBoundary() {
  return (
    <EditorErrorBoundary>
      <TextEditor />
    </EditorErrorBoundary>
  );
}