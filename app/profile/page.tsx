"use client";
import React, { useState, useEffect } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  updatePassword,
  signOut,
} from "firebase/auth";
import { FaUser, FaEnvelope, FaLock, FaHome, FaBookmark } from "react-icons/fa";
import Link from "next/link";
import Swal from "sweetalert2";
import SavedBlogs from "../components/SavedBlogs";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Reusable BlogCard for My Blogs and Archived Blogs
const BlogCard = ({ blog }: { blog: any }) => (
  <Link href={`/blogfeed/${blog.id}`} className="block group">
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200">
      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
        {blog.title}
      </h3>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {blog.content?.replace(/<[^>]*>/g, '').slice(0, 100)}...
      </p>
      <div className="flex items-center text-xs text-gray-500">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {blog.createdAt ? (blog.createdAt.seconds ? new Date(blog.createdAt.seconds * 1000).toLocaleDateString() : new Date(blog.createdAt).toLocaleDateString()) : 'Date not available'}
      </div>
    </div>
  </Link>
);

const MyBlogs = ({ userId }: { userId: string }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const q = query(collection(db, "blogs"), where("userId", "==", userId), where("status", "not-in", ["archived", "deleted"]));
      const querySnapshot = await getDocs(q);
      const myBlogs: any[] = [];
      querySnapshot.forEach((doc) => myBlogs.push({ ...doc.data(), id: doc.id }));
      setBlogs(myBlogs);
    })();
  }, [userId]);
  if (!blogs.length) return <p className="text-gray-500">No blogs found.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      {blogs.map(blog => <BlogCard key={blog.id} blog={blog} />)}
    </div>
  );
};

const ArchivedBlogs = ({ userId }: { userId: string }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const q = query(collection(db, "blogs"), where("userId", "==", userId), where("status", "==", "archived"));
      const querySnapshot = await getDocs(q);
      const archived: any[] = [];
      querySnapshot.forEach((doc) => archived.push({ ...doc.data(), id: doc.id }));
      setBlogs(archived);
    })();
  }, [userId]);
  if (!blogs.length) return <p className="text-gray-500">No archived blogs.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
      {blogs.map(blog => <BlogCard key={blog.id} blog={blog} />)}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const user = auth.currentUser;
  const [isLoading, setIsLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string>(user?.displayName || ""); // For display
  const [formUsername, setFormUsername] = useState<string>(user?.displayName || ""); // For form input
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'profile' | 'saved' | 'myblogs' | 'archived'>("profile");
  const [userPlan, setUserPlan] = useState<string>("basic");

  useEffect(() => {
    if (user) {
      (async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserPlan(userData.plan || "basic");
        }
      })();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const saveChanges = async () => {
    if (!formUsername) {
      Swal.fire({
        title: "Error!",
        text: "Username is required",
        icon: "error",
        confirmButtonColor: "#22c55e",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (user) {
        await updateProfile(user, {
          displayName: formUsername,
        });

        setCurrentUsername(formUsername); // Update display username only after successful save

        if (currentPassword && newPassword) {
          const credential = EmailAuthProvider.credential(
            user.email || "",
            currentPassword
          );
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
        }

        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully",
          icon: "success",
          confirmButtonColor: "#22c55e",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: (error as Error).message,
        icon: "error",
        confirmButtonColor: "#22c55e",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center space-x-3 text-gray-900 hover:text-green-600 transition-colors"
            >
              <FaHome className="h-5 w-5" />
              <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
                Blog Fusion
              </span>
            </Link>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">
                  Welcome back,
                </span>
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                    {currentUsername?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="text-green-700 font-medium">{currentUsername || "User"}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Enhanced Tab Navigation */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex space-x-1 bg-white rounded-xl shadow-sm p-1 mb-8"
        >
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
              activeTab === "profile"
                ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FaUser className="w-4 h-4" />
              <span>Profile Settings</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
              activeTab === "saved"
                ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FaBookmark className="w-4 h-4" />
              <span>Saved Blogs</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("myblogs")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
              activeTab === "myblogs"
                ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="font-bold">📝</span>
              <span>My Blogs</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
              activeTab === "archived"
                ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/20"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="font-bold">📦</span>
              <span>Archived</span>
            </div>
          </button>
        </motion.div>

        {/* Enhanced Content Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
        >
          {activeTab === "profile" && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Personal Information</h2>
              <div className="space-y-8">
                {/* Display current plan and upgrade button if not premium */}
                <div className="mb-8 flex items-center space-x-4">
                  <span className="px-4 py-2 bg-gray-100 rounded-full text-green-700 font-semibold">
                    Current Plan: {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}
                  </span>
                  {userPlan !== 'premium' && (
                    <button
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      onClick={() => window.location.href = '/?openSubscription=true'}
                    >
                      Upgrade Plan
                    </button>
                  )}
                </div>

                {/* Username Input */}
                <motion.div 
                  className="space-y-2"
                  whileHover={{ scale: 1.01 }}
                >
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <FaUser className="w-4 h-4 text-green-500" />
                    <span>Username</span>
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Enter your username"
                  />
                </motion.div>

                {/* Email Display */}
                <motion.div 
                  className="space-y-2"
                  whileHover={{ scale: 1.01 }}
                >
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <FaEnvelope className="w-4 h-4 text-green-500" />
                    <span>Email</span>
                  </label>
                  <div className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-500">
                    {user?.email}
                  </div>
                </motion.div>

                {/* Password Change Section */}
                <motion.div 
                  className="space-y-4 pt-6 border-t border-gray-100"
                  whileHover={{ scale: 1.01 }}
                >
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <FaLock className="w-4 h-4 text-green-500" />
                    <span>Change Password</span>
                  </label>
                  <div className="space-y-4">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Current password"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="New password"
                    />
                  </div>
                </motion.div>

                {/* Save Button */}
                <motion.div 
                  className="flex justify-between pt-8 items-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <button
                    onClick={saveChanges}
                    disabled={isLoading}
                    className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-green-500/20"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving changes...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center space-x-2 shadow-lg shadow-red-500/20 ml-4"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </motion.div>
              </div>
            </div>
          )}
          {activeTab === "saved" && (
            <div className="p-8"><SavedBlogs /></div>
          )}
          {activeTab === "myblogs" && (
            <div className="p-8"><MyBlogs userId={user?.uid} /></div>
          )}
          {activeTab === "archived" && (
            <div className="p-8"><ArchivedBlogs userId={user?.uid} /></div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
