"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../firebase/firebaseConfig"; // Import the Firestore instance
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  getDoc 
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Link from "next/link"; // Import Link for navigation
import Image from "next/image"; // Import Next.js Image for optimized images
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import "./Blogs.css"; // Import the CSS file

// Add these interfaces at the top of your file
interface Blog {
  id: string;
  title: string;
  metaDescription: string;
  content: string;
  category: string;
  createdAt: any;
  userId: string;
  likes?: string[];  // Array of user IDs who liked the blog
  comments?: {
    id: string;
    userId: string;
    text: string;
    createdAt: any;
    userDisplayName?: string;
  }[];
}

const extractFirstImage = (content: string): string | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const firstImage = doc.querySelector('img');
  return firstImage ? firstImage.src : null;
};

const Blogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (user) {
      const fetchBlogs = async () => {
        try {
          const q = query(collection(db, "blogs"), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const fetchedBlogs: Blog[] = [];
          querySnapshot.forEach((doc) => {
            fetchedBlogs.push({ ...doc.data(), id: doc.id } as Blog);
          });
          console.log("Fetched blogs from Firestore:", fetchedBlogs); // Debugging log
          setBlogs(fetchedBlogs);
        } catch (error) {
          console.error("Error fetching blogs:", error);
        }
      };

      fetchBlogs();
    }
  }, [user]);

  const handleBlogClick = (id: string) => {
    router.push(`/blogs/${id}`);
  };

  const handleHomeClick = () => {
    if (user) {
      // Redirect to the text editor if the user is logged in
      router.push("/text-editor");
    } else {
      // Redirect to login page if the user is not logged in
      router.push("/login");
    }
  };

  const handleLike = async (blogId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const blogRef = doc(db, 'blogs', blogId);
      const blogDoc = await getDoc(blogRef);
      
      if (blogDoc.exists()) {
        // Ensure likes is an array
        const likes = Array.isArray(blogDoc.data().likes) ? blogDoc.data().likes : [];
        const hasLiked = likes.includes(user.uid);
        
        await updateDoc(blogRef, {
          likes: hasLiked 
            ? arrayRemove(user.uid)
            : arrayUnion(user.uid)
        });

        // Update local state
        setBlogs(blogs.map(blog => {
          if (blog.id === blogId) {
            const updatedLikes = hasLiked
              ? (Array.isArray(blog.likes) ? blog.likes.filter(id => id !== user.uid) : [])
              : [...(Array.isArray(blog.likes) ? blog.likes : []), user.uid];
            return { ...blog, likes: updatedLikes };
          }
          return blog;
        }));
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleComment = async (blogId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!commentText[blogId]?.trim()) return;

    setIsSubmitting(true);
    try {
      const blogRef = doc(db, 'blogs', blogId);
      const blogDoc = await getDoc(blogRef);
      
      const newComment = {
        id: uuidv4(),
        userId: user.uid,
        text: commentText[blogId],
        createdAt: serverTimestamp(),
        userDisplayName: user.displayName || 'Anonymous'
      };

      // Get current comments or initialize as empty array
      const currentComments = blogDoc.exists() && Array.isArray(blogDoc.data().comments) 
        ? blogDoc.data().comments 
        : [];

      // Update with new comment
      await updateDoc(blogRef, {
        comments: [...currentComments, newComment]
      });

      // Update local state
      setBlogs(blogs.map(blog => {
        if (blog.id === blogId) {
          return {
            ...blog,
            comments: Array.isArray(blog.comments) 
              ? [...blog.comments, newComment]
              : [newComment]
          };
        }
        return blog;
      }));

      // Clear comment input
      setCommentText(prev => ({ ...prev, [blogId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async (blog: Blog) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: blog.title,
          text: blog.metaDescription,
          url: `${window.location.origin}/blogs/${blog.id}`
        });
      } else {
        // Fallback to copying link to clipboard
        const url = `${window.location.origin}/blogs/${blog.id}`;
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/"
              className="flex items-center space-x-2"
            >
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
                BLOG FUSION
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={handleHomeClick} 
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Home
              </button>
              <Link 
                href="/blogfeed" 
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                Blog Feed
              </Link>
              <button
                onClick={() => router.push('/text-editor')}
                className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
              >
                Write Blog
              </button>
            </div>

            {/* User Profile */}
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 bg-green-50 px-4 py-2 rounded-full">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {user.displayName?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="text-green-700 font-medium hidden md:block">
                    {user.displayName || "User"}
                  </span>
                </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">My Blog Posts</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage and view all your published blog posts in one place
          </p>
        </motion.div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-12"
            >
              <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  No blogs yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start writing your first blog post today!
                </p>
                <button
                  onClick={() => router.push('/text-editor')}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Create New Blog
                </button>
              </div>
            </motion.div>
          ) : (
            blogs.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col h-full"
              >
                {/* Add Image Section */}
                {blog.content && (
                  <div className="relative w-full h-48 overflow-hidden">
                    {extractFirstImage(blog.content) ? (
                      <Image
                        src={extractFirstImage(blog.content) || "/default-image.png"}
                        alt={blog.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <svg 
                          className="w-12 h-12 text-gray-300" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <div className="text-sm font-medium text-green-500 mb-2">
                      {blog.category}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                      {blog.title}
                    </h2>
                    <p className="text-gray-600 mb-6 line-clamp-3">
                      {blog.metaDescription}
                    </p>

                    {/* Add Read More Button */}
                    <button
                      onClick={() => handleBlogClick(blog.id)}
                      className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mb-4"
                    >
                      Read More
                      <svg 
                        className="w-4 h-4 ml-2" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="pt-4 mt-auto border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">
                        {new Date(blog.createdAt?.toDate()).toLocaleDateString()}
                      </span>
                      
                      <div className="flex items-center space-x-4">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(blog.id)}
                          className={`flex items-center space-x-1 ${
                            Array.isArray(blog.likes) && blog.likes.includes(user?.uid || '') 
                              ? 'text-red-500' 
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          <span>{Array.isArray(blog.likes) ? blog.likes.length : 0}</span>
                        </button>

                        {/* Comment Button */}
                        <button
                          onClick={() => setShowComments(prev => ({ 
                            ...prev, 
                            [blog.id]: !prev[blog.id] 
                          }))}
                          className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{blog.comments?.length || 0}</span>
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => handleShare(blog)}
                          className="text-gray-500 hover:text-green-500"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {showComments[blog.id] && (
                      <div className="mt-4 space-y-4">
                        {Array.isArray(blog.comments) && blog.comments.length > 0 ? (
                          blog.comments.map(comment => (
                            <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">{comment.userDisplayName}</span>
                                <span className="text-xs text-gray-500">
                                  {comment.createdAt?.toDate().toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{comment.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center">No comments yet</p>
                        )}

                        {/* Comment Input */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={commentText[blog.id] || ''}
                            onChange={e => setCommentText(prev => ({
                              ...prev,
                              [blog.id]: e.target.value
                            }))}
                            placeholder="Add a comment..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                          />
                          <button
                            onClick={() => handleComment(blog.id)}
                            disabled={isSubmitting || !commentText[blog.id]?.trim()}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
                BLOG FUSION
              </span>
              <p className="text-gray-600 mt-2">
                &copy; 2025 Blog Fusion. All Rights Reserved.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="#" className="text-gray-600 hover:text-green-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-gray-600 hover:text-green-600 transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-gray-600 hover:text-green-600 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Blogs;


