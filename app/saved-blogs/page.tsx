"use client";
import { useEffect, useState } from 'react';
import { auth, db as firestoreDb } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FaBookmark, FaSearch, FaArrowLeft } from 'react-icons/fa';

const SavedBlogsPage = () => {
  const [savedBlogs, setSavedBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchSavedBlogs = async () => {
      try {
        if (!auth.currentUser) {
          toast.error('Please login to view saved blogs');
          return;
        }

        const userRef = doc(firestoreDb, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const savedBlogIds = userDoc.data().savedBlogs || [];
          const blogs = [];
          
          for (const blogId of savedBlogIds) {
            const blogRef = doc(firestoreDb, "blogs", blogId);
            const blogDoc = await getDoc(blogRef);
            if (blogDoc.exists()) {
              blogs.push({ id: blogDoc.id, ...blogDoc.data() });
            }
          }
          
          setSavedBlogs(blogs);
        }
      } catch (error) {
        console.error('Error fetching saved blogs:', error);
        toast.error('Error fetching saved blogs');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedBlogs();
  }, []);

  const filteredBlogs = savedBlogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="p-8 rounded-lg bg-white shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading your saved content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="bg-background-main shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/blogfeed" className="text-gray-600 hover:text-gray-900 transition-colors">
                <FaArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FaBookmark className="w-6 h-6 mr-2 text-blue-500" />
                Saved Blogs
              </h1>
            </div>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search saved blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full border border-secondary-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {savedBlogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white rounded-2xl shadow-sm"
          >
            <FaBookmark className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No saved blogs yet</h2>
            <p className="text-gray-600 mb-6">Start saving your favorite blogs to read them later!</p>
            <Link 
              href="/blogfeed" 
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
            >
              Explore Blogs
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog, index) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={`/blogfeed/${blog.id}`}
                  className="block group bg-background-main rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="overflow-hidden">
                    {blog.coverImage && (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={blog.coverImage} 
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                        {blog.title}
                      </h2>
                      <p className="text-gray-600 line-clamp-2 mb-4">
                        {blog.content?.replace(/<[^>]*>/g, '').slice(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                            />
                          </svg>
                          {blog.createdAt ? new Date(blog.createdAt.seconds * 1000).toLocaleDateString() : 'Date not available'}
                        </span>
                        <span className="flex items-center text-blue-500">
                          Read More →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedBlogsPage;