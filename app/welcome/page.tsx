'use client';
import { useState, useEffect } from 'react';
import { customSignOut } from '../firebase/firebaseConfig'; // Import `signOut` directly from Firebase
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { FaUserCircle } from 'react-icons/fa';
import { onAuthStateChanged } from 'firebase/auth';

const Welcome = () => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const auth = getAuth(); // Get the Auth instance

  // useEffect(() => {
  //   const currentUser = auth.currentUser;
  //   if (currentUser) {
  //     // Fetch user's name or emailF
  //     setUser({
  //       name: currentUser.displayName || currentUser.email, // Fallback to email if displayName is not available
  //     });
  //   } else {
  //     router.push('/components'); // Redirect to login if not logged in
  //   }
  // }, [auth, router]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          name: currentUser.displayName || currentUser.email,
        });
      } else {
        router.push('/'); // Redirect if not logged in
      }
    });
  
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [router]);

  const handleLogout = async () => {
    try {
      await customSignOut(); // Correct usage of `signOut`
      router.push('/'); // Redirect to login after logout
    } catch (error) {
      console.error('Error signing out:', error); // Log the error for debugging
    }
  };

  const goToManualEditor = () => {
    router.push('/text-editor'); // Replace with the path to your manual editor page
  };

  const goToAIGeneratedEditor = () => {
    router.push('/ai-generated-editor'); // Replace with the path to your AI generated editor page
  };

  return (
    <div className="flex h-screen">
      {/* Side Navbar */}
      <nav className="w-64 bg-gray-800 text-white flex flex-col justify-between">
        <ul className="p-4 space-y-4">
          <li className="text-xl font-bold">Dashboard</li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">My blogs</li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">My Profile</li>
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">Option 3</li>
        </ul>
        <ul className="p-4 space-y-4">
          <li className="hover:bg-gray-700 p-2 rounded cursor-pointer">Settings</li>
          <li
            className="hover:bg-gray-700 p-2 rounded cursor-pointer"
            onClick={handleLogout}
          >
            Logout
          </li>
        </ul>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white p-4 shadow-md flex justify-between items-center">
          <h1 className="text-2xl font-bold">Home</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">Welcome, {user?.name || 'User'}</span>
            <FaUserCircle className="text-3xl text-gray-500" />
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex flex-1 items-center justify-center bg-gray-100 p-6">
          <div className="space-x-8">
            <button
              onClick={goToManualEditor}
              className="bg-green-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600"
            >
              Manual Editor
            </button>
            {/* <button
              onClick={goToAIGeneratedEditor}
              className="bg-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-600"
            >
              AI Generated Editor
            </button> */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Welcome;
