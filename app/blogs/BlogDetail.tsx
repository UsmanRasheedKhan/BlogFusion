"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig"; // Import the Firestore instance
import { doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Import Firebase auth methods
import Link from "next/link"; // Make sure this is imported
import Image from "next/image"; // Import Next.js Image component
import { FaUserCircle } from "react-icons/fa"; // Import the user icon from react-icons
import Swal from "sweetalert2"; // Import SweetAlert2 for error handling
import "./Blogs.css"; // Add a CSS file for custom styles

// Define props for the BlogDetail component
interface BlogDetailProps {
  blogId: string;
}

// Add this interface for better type checking
interface FirebaseError extends Error {
  code: string;
  message: string;
}

// Add this error handling utility
const getErrorMessage = (error: FirebaseError) => {
  const errorMessages: Record<string, string> = {
    'permission-denied': 'You do not have permission to view this blog.',
    'not-found': 'The blog post could not be found.',
    'unavailable': 'The service is currently unavailable. Please try again later.',
    'invalid-argument': 'Invalid blog ID provided.',
    'network-request-failed': 'Network connection error. Please check your internet connection.',
    'deadline-exceeded': 'Request timed out. Please try again.',
    'cancelled': 'The operation was cancelled.',
    'unknown': 'An unexpected error occurred. Please try again.'
  };

  return errorMessages[error.code] || error.message;
};

const BlogDetail: React.FC<BlogDetailProps> = ({ blogId }) => {
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // State to store the logged-in user
  const auth = getAuth();

  useEffect(() => {
    // Check the authentication status on component mount
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Store user info if logged in
      } else {
        setUser(null); // Set to null if user is logged out
      }
    });

    return () => unsubscribe(); // Clean up the subscription when the component unmounts
  }, [auth]);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const blogRef = doc(db, "blogs", blogId);
        const blogSnapshot = await getDoc(blogRef);

        if (blogSnapshot.exists()) {
          const blogData = blogSnapshot.data();
          setBlog({
            ...blogData,
            createdAt: blogData.createdAt?.toDate() || new Date(),
            id: blogSnapshot.id
          });
        } else {
          throw new Error('not-found');
        }
      } catch (error) {
        const firebaseError = error as FirebaseError;
        
        // Show user-friendly error message using SweetAlert2
        await Swal.fire({
          title: 'Error Loading Blog',
          html: `
            <div class="space-y-4">
              <p>${getErrorMessage(firebaseError)}</p>
              ${firebaseError.code === 'network-request-failed' ? `
                <div class="bg-yellow-50 p-4 rounded-lg text-yellow-700 text-sm">
                  <p>Tips to resolve:</p>
                  <ul class="list-disc list-inside mt-2">
                    <li>Check your internet connection</li>
                    <li>Refresh the page</li>
                    <li>Try again in a few minutes</li>
                  </ul>
                </div>
              ` : ''}
            </div>
          `,
          icon: 'error',
          confirmButtonColor: '#22c55e',
          confirmButtonText: firebaseError.code === 'not-found' ? 'Go Back' : 'Try Again',
          showCancelButton: firebaseError.code === 'network-request-failed',
          cancelButtonText: 'Refresh Page'
        }).then((result) => {
          if (result.isConfirmed && firebaseError.code === 'not-found') {
            window.history.back();
          }
          if (result.dismiss === Swal.DismissReason.cancel) {
            window.location.reload();
          }
        });
      } finally {
        setLoading(false);
      }
    };

    if (blogId) {
      fetchBlog();
    }
  }, [blogId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!blog) {
    return <p>Blog not found</p>;
  }

  return (
    <div className="blog-page">
      {/* Navbar with User Icon and Name */}
      <div className="navbar-container">
        <nav className="flex justify-between items-center px-6 py-4 border-b">
          <div className="text-xl font-bold">BLOG FUSION</div>
          <ul className="flex space-x-6">
            <li><Link href="#home" className="hover:text-gray-500">Home</Link></li>
            <li><Link href="#about" className="hover:text-gray-500">About</Link></li>
            <li><Link href="#services" className="hover:text-gray-500">Services</Link></li>
            <li><Link href="/blogfeed" className="hover:text-gray-500">Blog Feed</Link></li>
          </ul>
          <div className="flex items-center space-x-4">
            {/* Check if user is logged in, display the user icon and name */}
            {user ? (
              <>
                <FaUserCircle className="text-gray-500 w-8 h-8" /> {/* User Icon */}
                <span className="text-gray-500">{user.displayName}</span> {/* User Name */}
              </>
            ) : (
              <button
                className="border px-4 py-2 rounded hover:bg-gray-100"
                onClick={() => window.location.hash = "#contact"}
              >
                Contact
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Blog Content */}
      <div className="blog-content-container">
        <div className="blog-detail">
          <h1 className="blog-title">{blog.title}</h1>
          
          {/* Ensure the createdAt date is displayed properly */}
          <p className="blog-date">
            {blog.createdAt ? blog.createdAt.toLocaleString() : "Date not available"}
          </p>
          {blog.image && (
            <Image
              src={blog.image}
              alt={blog.title}
              className="blog-image"
              width={800}
              height={400}
              style={{ objectFit: "cover" }}
            />
          )}
          {blog.image && <img src={blog.image} alt={blog.title} className="blog-image" />}
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content }} />
        </div>
      </div>

      {/* Footer Section */}
      <footer className="footer">
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
    </div>
  );
};

export default BlogDetail;
