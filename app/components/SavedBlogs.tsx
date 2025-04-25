import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { toast } from 'react-toastify';

const SavedBlogs = () => {
  const [savedBlogs, setSavedBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedBlogs = async () => {
      try {
        if (!auth.currentUser) return;

        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const savedBlogIds = userDoc.data().savedBlogs || [];
          const blogsData = [];

          for (const blogId of savedBlogIds) {
            const blogRef = doc(db, "blogs", blogId);
            const blogDoc = await getDoc(blogRef);
            if (blogDoc.exists()) {
              blogsData.push({ id: blogId, ...blogDoc.data() });
            }
          }

          setSavedBlogs(blogsData);
        }
      } catch (error) {
        console.error('Error fetching saved blogs:', error);
        toast.error('Error loading saved blogs');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedBlogs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Saved Blogs</h2>
      {savedBlogs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg 
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="text-gray-500 mb-2">No saved blogs yet</p>
          <Link
            href="/blogfeed"
            className="text-blue-600 hover:underline"
          >
            Explore blogs to save
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {savedBlogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/blogfeed/${blog.id}`}
              className="block group"
            >
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                  {blog.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {blog.content?.replace(/<[^>]*>/g, '').slice(0, 100)}...
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {blog.createdAt ? new Date(blog.createdAt.seconds * 1000).toLocaleDateString() : 'Date not available'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedBlogs;