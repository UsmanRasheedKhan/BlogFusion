"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleHomeClick = () => {
    if (user) {
      router.push("/text-editor");
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setDropdownOpen(false);
    router.push("/login");
  };

  return (
    <div className="navbar-container">
      <nav className="flex justify-between items-center px-6 py-4 border-b">
        <div className="text-xl font-bold">BLOG FUSION</div>
        <ul className="flex space-x-6">
          <li>
            <button onClick={handleHomeClick} className="hover:text-gray-500">
              Home
            </button>
          </li>
          <li>
            <Link href="#about" className="hover:text-gray-500">
              About
            </Link>
          </li>
          <li>
            <Link href="#services" className="hover:text-gray-500">
              Services
            </Link>
          </li>
          <li>
            <Link href="/blogfeed" className="hover:text-gray-500">
              Blog Feed
            </Link>
          </li>
        </ul>
        {user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <FaUserCircle size={24} />
              <span className="font-medium">{user.displayName || "User"}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg">
                <Link
                  href="/profile"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="border px-4 py-2 rounded hover:bg-gray-100"
          >
            Login
          </Link>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
