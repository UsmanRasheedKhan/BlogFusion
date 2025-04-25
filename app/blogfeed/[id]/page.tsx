"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getFirestore, doc, getDoc, setDoc, Timestamp, updateDoc, increment, arrayRemove, arrayUnion, serverTimestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../firebaseConfig"; // Adjust if necessary
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { FaThumbsUp } from "react-icons/fa";

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);
const auth = getAuth(app);

// Function to format blog content and embed keyword URLs
const formatBlogContent = (content: string, keywords: string[], urls: string[]): string => {
  if (!content) return "";

  // Remove any existing h1 tags from the content
  content = content.replace(/<h1[^>]*>.*?<\/h1>/g, '');

  // Enhanced header formatting with proper styling classes
  content = content
    .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-semibold text-gray-800 mt-8 mb-4">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-medium text-gray-700 mt-6 mb-3">$1</h3>')
    .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">') // Format paragraphs
    .replace(/- (.*$)/gim, '<li class="ml-6 mb-2">$1</li>'); // Enhanced list items

  // Embed keyword links with improved styling
  keywords.forEach((keyword, index) => {
    const url = urls[index]?.trim() || "#";
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, "gi");
    content = content.replace(
      keywordRegex,
      `<a href="${url}" class="text-blue-600 font-medium hover:text-blue-800 transition-colors" target="_blank" rel="noopener noreferrer">${keyword}</a>`
    );
  });

  return content;
};

// Add this type definition
interface Comment {
  text: string;
  author: string;
  date: Timestamp | Date;
  userId?: string;
}

// Add this helper function
const formatDate = (date: Timestamp | Date): string => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString();
  }
  return new Date(date).toLocaleString();
};

const provider = new GoogleAuthProvider();

// Add this helper function at the top of the file
const handleGoogleLogin = async () => {
  try {
    // First check if popups are blocked
    const popupTest = window.open('', '_blank');
    if (!popupTest || popupTest.closed || typeof popupTest.closed === 'undefined') {
      toast.error('Please enable popups for this site to login');
      return null;
    }
    popupTest.close();

    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      const userRef = doc(firestoreDb, "users", result.user.uid);
      await setDoc(userRef, {
        name: result.user.displayName,
        email: result.user.email,
        createdAt: new Date(),
      }, { merge: true });
      
      toast.success('Successfully logged in!');
      return result.user;
    }
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      toast.error('Please enable popups in your browser and try again');
    } else {
      toast.error('Error signing in with Google');
      console.error('Login error:', error);
    }
    return null;
  }
};

// Add this helper function at the top of the file
const formatBlogDate = (timestamp: Timestamp | Date | null): string => {
  if (!timestamp) return "Date not available";
  
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// First, update the interface to include authorName
interface BlogData {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: Timestamp;
  likes: number;
  comments: number;
  shares: number;
  // ...other fields
}

// Add the updated Blog and Like interfaces
interface Like {
  userId: string;
  username: string;
  timestamp: any;
}

interface Blog {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorBio?: string;
  userId: string;
  createdAt: any;
  likes: Like[];
  comments: {
    id: string;
    userId: string;
    text: string;
    createdAt: any;
    userDisplayName: string;
  }[];
  shares: string[];
}

const LikesDisplay = ({ likes }: { likes: Like[] }) => {
  const [showAllLikes, setShowAllLikes] = useState(false);

  if (!Array.isArray(likes) || likes.length === 0) {
    return <span className="text-gray-500">No likes yet</span>;
  }

  const sortedLikes = [...likes].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.seconds - a.timestamp.seconds;
  });

  const displayLikes = () => {
    if (sortedLikes.length === 1) {
      return (
        <span>
          Liked by{' '}
          <span className="font-semibold text-gray-900">
            {sortedLikes[0].username} ({sortedLikes[0].userId})
          </span>
        </span>
      );
    }

    if (sortedLikes.length === 2) {
      return (
        <span>
          Liked by{' '}
          <span className="font-semibold text-gray-900">
            {sortedLikes[0].username} ({sortedLikes[0].userId})
          </span>{' '}
          and{' '}
          <span className="font-semibold text-gray-900">
            {sortedLikes[1].username} ({sortedLikes[1].userId})
          </span>
        </span>
      );
    }

    return (
      <span>
        Liked by{' '}
        <span className="font-semibold text-gray-900">
          {sortedLikes[0].username} ({sortedLikes[0].userId})
        </span>{' '}
        and{' '}
        <button
          onClick={() => setShowAllLikes(true)}
          className="font-semibold text-green-600 hover:text-green-700 underline-offset-2 hover:underline"
        >
          {sortedLikes.length - 1} others
        </button>
      </span>
    );
  };

  return (
    <div className="relative">
      {displayLikes()}

      {/* Updated Likes Modal with User IDs */}
      {showAllLikes && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllLikes(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Liked by {sortedLikes.length} {sortedLikes.length === 1 ? 'person' : 'people'}
              </h3>
              <button
                onClick={() => setShowAllLikes(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {sortedLikes.map((like) => (
                <motion.div
                  key={like.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {like.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {like.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {like.userId}
                    </p>
                    <p className="text-sm text-gray-500">
                      {like.timestamp?.toDate?.() 
                        ? new Date(like.timestamp.toDate()).toLocaleDateString()
                        : 'Recently'
                      }
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

const BlogDetailPage = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchBlog = async () => {
      if (!id) return;

      try {
        const blogRef = doc(firestoreDb, "blogs", id);
        const blogDoc = await getDoc(blogRef);

        if (blogDoc.exists()) {
          const data = blogDoc.data();
          
          // Fetch author data
          let authorData = null;
          if (data.userId) {
            const authorRef = doc(firestoreDb, "users", data.userId);
            const authorSnapshot = await getDoc(authorRef);
            if (authorSnapshot.exists()) {
              authorData = authorSnapshot.data();
              setAuthorName(authorData.name || data.authorName || 'Unknown Author');
            }
          }

          setBlog({
            id: blogDoc.id,
            ...data,
            authorName: authorData?.name || data.authorName,
            likes: Array.isArray(data.likes) ? data.likes : [],
            comments: Array.isArray(data.comments) ? data.comments : [],
            shares: Array.isArray(data.shares) ? data.shares : []
          });
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
        setError("Error fetching blog");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  useEffect(() => {
    const checkIfBlogIsSaved = async () => {
      if (auth.currentUser && id) {
        const userRef = doc(firestoreDb, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const savedBlogs = userDoc.data().savedBlogs || [];
          setIsSaved(savedBlogs.includes(id));
        }
      }
    };

    checkIfBlogIsSaved();
  }, [id, auth.currentUser]);

  // Update the handleLike function
  const handleLike = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const blogRef = doc(firestoreDb, "blogs", blog.id);
      const blogDoc = await getDoc(blogRef);
      const currentLikes = blogDoc.data()?.likes || [];
      
      const hasLiked = currentLikes.some((like: Like) => like.userId === user.uid);

      if (hasLiked) {
        // Remove like
        const updatedLikes = currentLikes.filter((like: Like) => like.userId !== user.uid);
        await updateDoc(blogRef, { likes: updatedLikes });
        
        // Update local state
        setBlog((prev: any) => ({
          ...prev,
          likes: updatedLikes
        }));
      } else {
        // Add new like with user info
        const newLike: Like = {
          userId: user.uid,
          username: user.displayName || '',
          timestamp: serverTimestamp()
        };
        
        const updatedLikes = [...currentLikes, newLike];
        await updateDoc(blogRef, { likes: updatedLikes });
        
        // Update local state
        setBlog((prev: any) => ({
          ...prev,
          likes: updatedLikes
        }));
      }
    } catch (error) {
      console.error("Error updating like:", error);
      toast.error("Error updating like");
    }
  };

  // Update the handleComment function
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Please login to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date();
      const newComment = {
        id: crypto.randomUUID(),
        userId: auth.currentUser.uid,
        text: commentText.trim(),
        createdAt: timestamp,
        userDisplayName: auth.currentUser.displayName || 'Anonymous'
      };

      const blogRef = doc(firestoreDb, "blogs", id as string);
      const blogDoc = await getDoc(blogRef);
      
      if (blogDoc.exists()) {
        const currentComments = blogDoc.data().comments || [];
        await updateDoc(blogRef, {
          comments: [...currentComments, newComment]
        });

        // Update local state
        setBlog((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), newComment]
        }));

        setCommentText('');
        toast.success('Comment added successfully');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentButtonClick = async () => {
    if (!auth.currentUser) {
      const wantToLogin = window.confirm('Please login with Google to comment on this blog. Would you like to login now?');
      
      if (wantToLogin) {
        const user = await handleGoogleLogin();
        if (user) {
          setShowCommentModal(true);
        }
        return;
      }
      return;
    }
    
    setShowCommentModal(true);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: blog.title,
          text: 'Check out this blog post!',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }

      const blogRef = doc(firestoreDb, "blogs", id as string);
      await updateDoc(blogRef, {
        shares: increment(1)
      });
      setBlog({ ...blog, shares: blog.shares + 1 });
    } catch (error) {
      toast.error('Error sharing blog');
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out successfully');
      router.push('/'); // Redirect to homepage after sign out
    } catch (error) {
      toast.error('Error signing out');
      console.error('Sign out error:', error);
    }
  };

  // Add this function after your other handler functions
  const handleSaveBlog = async () => {
    if (!auth.currentUser) {
      const wantToLogin = window.confirm('Please login to save blogs. Would you like to login now?');
      if (wantToLogin) {
        const user = await handleGoogleLogin();
        if (user) {
          await saveBlogToProfile();
        }
      }
      return;
    }

    await saveBlogToProfile();
  };

  const saveBlogToProfile = async () => {
    if (!auth.currentUser || !id) return;
    
    try {
      const userRef = doc(firestoreDb, "users", auth.currentUser.uid);
      
      if (isSaved) {
        await updateDoc(userRef, {
          savedBlogs: arrayRemove(id)
        });
        setIsSaved(false);
        toast.success('Blog removed from saved items');
      } else {
        await updateDoc(userRef, {
          savedBlogs: arrayUnion(id)
        });
        setIsSaved(true);
        toast.success('Blog saved successfully');
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('Error saving blog');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-600 animate-pulse">Loading blog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-600">Blog not found</p>
      </div>
    );
  }

  const blogDate = blog.createdAt?.toLocaleString() || "Date not available";

  // Update the main content section with enhanced UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link 
            href="/blogfeed" 
            className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Blogs</span>
          </Link>

          {/* Enhanced User Profile Section */}
          <div className="relative">
            {auth.currentUser ? (
              <div className="flex items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {auth.currentUser.displayName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-gray-700 font-medium">
                    {auth.currentUser.displayName || 'User'}
                  </span>
                </motion.button>

                {/* Enhanced Dropdown Menu */}
                {isUserMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl py-2 z-50 border border-gray-100"
                  >
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </Link>

                    <Link
                      href="/saved-blogs"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span>Saved Blogs</span>
                    </Link>

                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGoogleLogin}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300"
              >
                <span className="font-medium">Login</span>
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* Enhanced Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
        >
          {/* Enhanced Blog Header */}
          <header className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center space-x-4 mb-6">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md"
              >
                <span className="text-white font-medium text-lg">
                  {blog.authorName?.[0]?.toUpperCase() || 'A'}
                </span>
              </motion.div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {blog.authorName || 'Unknown Author'}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatBlogDate(blog.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {blog.title}
            </h1>
            
            {/* Optional: Add author's bio or description */}
            {blog.authorBio && (
              <p className="text-gray-600 mt-2">
                {blog.authorBio}
              </p>
            )}
          </header>

          {/* Enhanced Blog Content */}
          <div className="p-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-blockquote:border-green-500"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>

          {/* Enhanced Engagement Section */}
          <div className="px-8 py-6 border-t border-gray-100 bg-gradient-to-br from-white to-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 ${
                    blog.likes?.some((like: Like) => like.userId === user?.uid)
                      ? 'text-green-600'
                      : 'text-gray-500 hover:text-green-600'
                  } transition-all duration-300`}
                >
                  <FaThumbsUp className="text-xl" />
                  <span className="font-medium">{blog.likes?.length || 0}</span>
                </motion.button>

                <div className="text-sm text-gray-600">
                  <LikesDisplay likes={blog.likes} />
                </div>
              </div>

              {/* Enhanced Save Button */}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSaveBlog}
                className="p-2 rounded-full hover:bg-green-50 transition-all duration-300"
              >
                <svg 
                  className={`w-6 h-6 ${
                    isSaved ? 'text-green-600 fill-current' : 'text-gray-600 hover:text-green-600'
                  } transition-colors duration-300`} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    fill={isSaved ? 'currentColor' : 'none'}
                  />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Enhanced Comments Section */}
          <div className="px-8 py-6 bg-gray-50">
            <h3 className="text-2xl font-semibold mb-6 text-gray-900">Comments</h3>
            {user ? (
              <div className="mb-4">
                <textarea
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Post Comment
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600 mb-2">Please log in to comment</p>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Log In
                </button>
              </div>
            )}
            
            {/* Display comments */}
            <div className="space-y-4 mt-6">
              {Array.isArray(blog?.comments) && blog.comments.length > 0 ? (
                blog.comments.map((comment: any) => (
                  <div 
                    key={comment.id} 
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium">
                          {comment.userDisplayName[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">
                          {comment.userDisplayName}
                        </span>
                        <span className="text-gray-500 text-sm ml-2">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 ml-10">{comment.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </div>
        </motion.article>
      </main>

      {/* Comment Modal with updated styling */}
      {showCommentModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold mb-4">Add Comment</h3>
            <form onSubmit={handleComment}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2 border rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Write your comment..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCommentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default BlogDetailPage;
