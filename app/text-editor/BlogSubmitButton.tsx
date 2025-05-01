// BlogSubmitButton.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
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

        // Fetch user plan from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userPlan = userSnap.exists() ? userSnap.data().plan : 'basic';

        if (userPlan === 'basic') {
          // Count manual blogs for this user
          const blogsQuery = query(
            collection(db, 'blogs'),
            where('uid', '==', user.uid),
            where('isAutomated', '!=', true) // Only manual blogs
          );
          const blogsSnap = await getDocs(blogsQuery);
          if (blogsSnap.size >= 3) {
            alert('You have reached the limit of 3 manual blog posts for the Basic plan. Upgrade your plan to publish more.');
            setLoading(false);
            return;
          }
        }

        // Add the blog post to Firestore
        await addDoc(collection(db, 'blogs'), {
          uid: user.uid,
          title: "Blog Title", // You can replace with actual title input if needed
          content: editorHtml,
          timestamp: serverTimestamp(), // Add timestamp to the post
          isAutomated: false // Mark as manual blog
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
