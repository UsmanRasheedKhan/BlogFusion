"use client";
import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./firebaseConfig"; // Adjust the path if necessary
import Link from "next/link";
import { FaThumbsUp, FaRegCommentDots, FaShare } from "react-icons/fa";  // Importing the required icons
import { MdTrendingUp, MdSearch } from 'react-icons/md';
import { motion } from "framer-motion";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);

const stripHtmlTags = (content: string) => {
  const div = document.createElement("div");
  div.innerHTML = content;
  return div.textContent || div.innerText || "";
};

// Custom Navbar for BlogFeed, styled like homepage, with 'Write Blog' button
const BlogFeedNavbar = ({ user }: { user: any }) => {
  const router = useRouter();
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
              BLOG FUSION
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">Home</Link>
            <Link href="/#about" className="text-gray-600 hover:text-gray-900 font-medium">About</Link>
            <Link href="/#services" className="text-gray-600 hover:text-gray-900 font-medium">Services</Link>
            <Link href="/blogfeed" className="text-gray-900 font-bold">Blog Feed</Link>
            <Link href="/#contact" className="text-gray-600 hover:text-gray-900 font-medium">Contact</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/text-editor" className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors font-medium">
              Write Blog
            </Link>
            {user ? (
              <Link href="/profile" className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white text-lg font-semibold">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </Link>
            ) : (
              <Link href="/login" className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const BlogFeed = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [user, setUser] = useState<any>(null);

  const scrollToFAQ = () => {
    const faqSection = document.getElementById('faq');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, "blogs"));
        const blogsData: Blog[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Skip archived blogs
          if (data.archived === true) return;
          const blog = {
            id: doc.id,
            title: data.title,
            content: data.content,
            likes: Array.isArray(data.likes) ? data.likes : [],
            comments: Array.isArray(data.comments) ? data.comments : [],
            shares: Array.isArray(data.shares) ? data.shares : [],
            coverImage: data.coverImage || null,
            type: data.type || null,
          };
          blogsData.push(blog);
        });
        setBlogs(blogsData);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!blogs.length) return;

    // Set up real-time listeners for each blog
    const unsubscribes = blogs.map(blog => {
      const blogRef = doc(firestoreDb, "blogs", blog.id);
      return onSnapshot(blogRef, (doc) => {
        if (doc.exists()) {
          const updatedBlog = doc.data();
          setBlogs(prevBlogs =>
            prevBlogs.map(b =>
              b.id === blog.id
                ? {
                    ...b,
                    comments: Array.isArray(updatedBlog.comments) 
                      ? updatedBlog.comments 
                      : []
                  }
                : b
            )
          );
        }
      });
    });

    // Cleanup listeners
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [blogs.length]);

  const truncateContent = (content: string, maxLength: number = 150) => {
    return content.length > maxLength ? content.slice(0, maxLength) + "..." : content;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  // Filter blogs based on the search query
  const filteredBlogs = blogs.filter((blog) => {
    return (
      blog.title?.toLowerCase().includes(searchQuery) || 
      blog.content?.toLowerCase().includes(searchQuery)
    );
  });
  

  // Update the trending blogs section
  const trendingBlogs = filteredBlogs.filter((blog) => 
    Array.isArray(blog.likes) && blog.likes.length >= 5
  );
  const allBlogs = filteredBlogs.filter((blog) => 
    !Array.isArray(blog.likes) || blog.likes.length < 5
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <BlogFeedNavbar user={user} />
      <div className="max-w-4xl mx-auto pt-24 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <MdSearch className="absolute left-4 top-3.5 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
        </motion.div>
      </div>

      {/* Trending Blogs Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 mb-8"
        >
          <MdTrendingUp className="text-3xl text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Trending Blogs</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trendingBlogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <BlogCard blog={blog} setBlogs={setBlogs} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* All Blogs Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-8"
        >
          All Blogs
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allBlogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <BlogCard blog={blog} setBlogs={setBlogs} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-xl text-gray-600">Loading blogs...</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Update Blog interface
interface Blog {
  id: string;
  title: string;
  content: string;
  likes: string[];
  comments: {
    id: string;
    userId: string;
    text: string;
    createdAt: any;
    userDisplayName: string;
  }[];
  shares: string[];
  coverImage?: string | null;
  type?: string | null;
}

// Add helper function
const extractFirstImage = (content: string): string | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const firstImage = doc.querySelector('img');
  return firstImage ? firstImage.src : null;
};

// Add helper function to get blog image
const getBlogImage = (blog: Blog): string | null => {
  if ((blog as any).coverImage) return (blog as any).coverImage;
  if (blog.content) return extractFirstImage(blog.content);
  return null;
};

// Update BlogCard component
const BlogCard = ({ blog, setBlogs }: { blog: Blog; setBlogs: React.Dispatch<React.SetStateAction<Blog[]>> }) => {
  const router = useRouter();
  const auth = getAuth();

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }

    try {
      const blogRef = doc(firestoreDb, "blogs", blog.id);
      const hasLiked = blog.likes.includes(auth.currentUser.uid);

      if (hasLiked) {
        await updateDoc(blogRef, {
          likes: arrayRemove(auth.currentUser.uid)
        });
      } else {
        await updateDoc(blogRef, {
          likes: arrayUnion(auth.currentUser.uid)
        });
      }

      // Update local state
      setBlogs(prevBlogs =>
        prevBlogs.map(b =>
          b.id === blog.id
            ? {
                ...b,
                likes: hasLiked
                  ? b.likes.filter(id => id !== auth.currentUser?.uid)
                  : auth.currentUser?.uid
                    ? [...b.likes, auth.currentUser.uid]
                    : b.likes
              }
            : b
        )
      );
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    try {
      if (navigator.share) {
        await navigator.share({
          title: blog.title,
          text: blog.content.substring(0, 100),
          url: `${window.location.origin}/blogfeed/${blog.id}`
        });
      } else {
        await navigator.clipboard.writeText(
          `${window.location.origin}/blogfeed/${blog.id}`
        );
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleComment = async (text: string) => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }
  
    try {
      const newComment = {
        id: crypto.randomUUID(),
        userId: auth.currentUser.uid,
        text: text,
        createdAt: new Date(),
        userDisplayName: auth.currentUser.displayName || 'Anonymous'
      };
  
      const blogRef = doc(firestoreDb, "blogs", blog.id);
      await updateDoc(blogRef, {
        comments: arrayUnion(newComment)
      });
  
      // Update local state to reflect new comment immediately
      setBlogs(prevBlogs =>
        prevBlogs.map(b =>
          b.id === blog.id
            ? {
                ...b,
                comments: [...(b.comments || []), newComment]
              }
            : b
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Simplify the getCommentsCount function
  const getCommentsCount = () => {
    return blog.comments?.length || 0;
  };

  // Add console.log for debugging
  console.log('Blog ID:', blog.id);
  console.log('Comments array:', blog.comments);
  console.log('Comments count:', getCommentsCount());

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      {/* Add Image Container */}
      <div className="relative w-full h-48 overflow-hidden">
        {getBlogImage(blog) ? (
          <img
            src={getBlogImage(blog) || "/default-image.png"}
            alt={blog.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400">No image available</span>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          {blog.title}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-3">
          {stripHtmlTags(blog.content)}
        </p>
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex space-x-4">
            {/* Like Button with real count */}
            <motion.button
              onClick={handleLike}
              whileHover={{ scale: 1.1 }}
              className={`flex items-center ${
                auth.currentUser && blog.likes.includes(auth.currentUser.uid)
                  ? 'text-green-600'
                  : 'text-gray-500 hover:text-green-600'
              } transition-colors cursor-pointer group`}
            >
              <FaThumbsUp className="mr-1 group-hover:scale-110 transition-transform" />
              <span>{Array.isArray(blog.likes) ? blog.likes.length : 0}</span>
            </motion.button>

            {/* Comments Display with real-time updates */}
            <motion.span
              whileHover={{ scale: 1.1 }}
              className="flex items-center text-gray-500 transition-colors cursor-pointer group"
              onClick={(e) => {
                e.preventDefault();
                if (!auth.currentUser) {
                  router.push('/login');
                  return;
                }
                router.push(`/blogfeed/${blog.id}#comments`);
              }}
            >
              <FaRegCommentDots className="mr-1 group-hover:scale-110 transition-transform" />
              <span className="text-sm ml-1">
                {Array.isArray(blog.comments) ? blog.comments.length : 0}
              </span>
            </motion.span>

            {/* Share Button with real count */}
            <motion.button
              onClick={handleShare}
              whileHover={{ scale: 1.1 }}
              className="flex items-center text-gray-500 hover:text-green-600 transition-colors cursor-pointer group"
            >
              <FaShare className="mr-1 group-hover:scale-110 transition-transform" />
              <span>{Array.isArray(blog.shares) ? blog.shares.length : 0}</span>
            </motion.button>
          </div>

          {/* Read More button remains the same */}
          <Link 
            href={`/blogfeed/${blog.id}`}
            className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-900 transition-colors duration-200"
          >
            Read More
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default BlogFeed;
