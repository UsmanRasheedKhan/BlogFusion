// BlogSubmitButton.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase/firebaseConfig'; // Importing Firebase auth and db

const BlogSubmitButton = ({ editorHtml }: { editorHtml: string }) => {
  const [user] = useAuthState(auth); // Get the current user
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (user) {
      try {
        setLoading(true); // Start loading state

        // Add the blog post to Firestore
        await addDoc(collection(db, 'blogs'), {
          uid: user.uid,
          title: "Blog Title", // You can replace with actual title input if needed
          content: editorHtml,
          timestamp: serverTimestamp(), // Add timestamp to the post
        });

        alert('Blog post submitted successfully!');
        router.push('/dashboard'); // Redirect after submission
      } catch (error) {
        console.error("Error submitting blog: ", error);
        alert("There was an error submitting your blog.");
      } finally {
        setLoading(false); // Reset loading state
      }
    } else {
      alert('Please log in to submit a blog post.');
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={loading} // Disable button when submitting
      style={{
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#0070f3',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '16px',
      }}
    >
      {loading ? 'Submitting...' : 'Submit and Redirect'}
    </button>
  );
};

export default BlogSubmitButton;
