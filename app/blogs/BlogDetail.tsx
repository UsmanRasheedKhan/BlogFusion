"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig"; // Import the Firestore instance
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Import Firebase auth methods
import Link from "next/link"; // Make sure this is imported
import Image from "next/image"; // Import Next.js Image component
import { FaUserCircle } from "react-icons/fa"; // Import the user icon from react-icons
import Swal from "sweetalert2"; // Import SweetAlert2 for error handling
import { Modal } from "react-responsive-modal"; // Import react-responsive-modal
import "react-responsive-modal/styles.css"; // Import modal styles
import "./Blogs.css"; // Add a CSS file for custom styles
import { useRouter, useSearchParams } from "next/navigation"; // Import useRouter and useSearchParams

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
  const [likers, setLikers] = useState<any[]>([]); // Array of user objects who liked
  const [showLikersModal, setShowLikersModal] = useState(false);
  const auth = getAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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

          // Fetch likers' display names
          if (Array.isArray(blogData.likes) && blogData.likes.length > 0) {
            const userDocs = await Promise.all(
              blogData.likes.map((uid: string) =>
                getDoc(doc(db, "users", uid))
              )
            );
            setLikers(
              userDocs
                .filter((d) => d.exists())
                .map((d) => ({
                  uid: d.id,
                  displayName: d.data()?.name || d.data()?.displayName || "User"
                }))
            );
          } else {
            setLikers([]);
          }
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
        <nav className="flex justify-between items-center px-6 py-4 border-b bg-white">
          <div className="text-xl font-bold text-green-700">BLOG FUSION</div>
          <ul className="flex space-x-6">
            <li><Link href="/" className="hover:text-green-600">Home</Link></li>
            <li><Link href="/about" className="hover:text-green-600">About</Link></li>
            <li><Link href="/blogfeed" className="hover:text-green-600">Blog Feed</Link></li>
          </ul>
          <div className="flex items-center space-x-4">
            <FaUserCircle className="text-gray-500 w-8 h-8" />
            <span className="text-gray-500">{user?.displayName || user?.email || 'User'}</span>
          </div>
        </nav>
      </div>

      {/* Back Button */}
      <div className="px-6 pt-6">
        {(() => {
          const from = searchParams.get('from');
          if (from === 'blogfeed') {
            return (
              <button
                className="mb-6 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 font-semibold"
                onClick={() => router.push('/blogfeed')}
              >
                &larr; Back to Blog Feed
              </button>
            );
          } else if (from === 'myblogs') {
            return (
              <button
                className="mb-6 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 font-semibold"
                onClick={() => router.push('/blogs')}
              >
                &larr; Back to My Blogs
              </button>
            );
          }
          return null;
        })()}
      </div>

      {/* Blog Content */}
      <div className="blog-content-container">
        <div
          className="blog-detail"
          style={{
            maxWidth: 950,
            margin: "0 auto",
            width: "100%",
            background: "white",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            padding: 32,
          }}
        >
          {/* Cover Image at the top if available */}
          {blog.image && (
            <img
              src={blog.image}
              alt={blog.title}
              className="blog-image"
              style={{
                width: "100%",
                height: 400,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 24,
              }}
            />
          )}
          {/* Author and Date Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e 60%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 22,
              fontFamily: 'inherit',
              textTransform: 'uppercase',
            }}>
              {blog.author ? blog.author[0] : 'U'}
            </div>
            <span style={{ fontWeight: 600, color: '#16a34a', fontSize: 18 }}>{blog.author || 'User'}</span>
            <span className="blog-date" style={{ color: '#64748b', fontSize: 15, marginLeft: 12 }}>
              {blog.createdAt ? blog.createdAt.toLocaleString() : "Date not available"}
            </span>
          </div>
          {/* Title (only once, below image and author row) */}
          <h1 className="blog-title" style={{ fontSize: 38, fontWeight: 800, color: '#22223b', marginBottom: 24, marginTop: 0 }}>
            {blog.title}
          </h1>
          {/* Blog Content */}
          <div
            className="blog-content"
            style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "#374151", marginTop: 24 }}
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Like Button and Likers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
            {/* Like Button (reuse your logic if needed) */}
            <button className="like-btn">
              <FaUserCircle /> Like
            </button>
            {/* Likers display */}
            {likers.length > 0 && (
              <span
                className="likers-summary hover:underline cursor-pointer text-gray-600"
                onClick={() => setShowLikersModal(true)}
              >
                {(() => {
                  const you = user && blog.likes?.includes(user.uid);
                  const others = likers.filter(l => !user || l.uid !== user.uid);
                  let text = '';
                  if (you && others.length > 0) {
                    text = `You, ${others[0].displayName}${others.length > 1 ? ' & more' : ''} liked`;
                  } else if (you) {
                    text = 'You liked';
                  } else if (others.length > 0) {
                    text = `${others[0].displayName}${others.length > 1 ? ' & more' : ''} liked`;
                  }
                  return text;
                })()}
              </span>
            )}
          </div>
          {/* Modal for all likers */}
          <Modal open={showLikersModal} onClose={() => setShowLikersModal(false)} center>
            <h2 className="text-lg font-bold mb-4">People who liked this blog</h2>
            <ul className="space-y-2">
              {likers.map(liker => (
                <li key={liker.uid} className="text-gray-700">{liker.displayName}</li>
              ))}
            </ul>
          </Modal>
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

// When creating a new comment or like object:
const newComment = {
  // ...other fields,
  createdAt: Timestamp.now(), // Use this instead of serverTimestamp()
};

export default BlogDetail;
