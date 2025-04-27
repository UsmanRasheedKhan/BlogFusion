"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Avatar,
  Card,
  Fade,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const PublishedBlog: React.FC = () => {
  const router = useRouter();
  const [fadeIn, setFadeIn] = useState(false);
  const [publishedBlog, setPublishedBlog] = useState<string | null>(null);
  const [blogTitle, setBlogTitle] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);

  const blogMetadata = {
    publishDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    readTime: "5 min read",
  };

  useEffect(() => {
    setFadeIn(true);
    const blogFromSession = sessionStorage.getItem("publishedBlog");
    setPublishedBlog(blogFromSession);
    setBlogTitle(sessionStorage.getItem("publishedBlogTitle"));
    setCoverImage(sessionStorage.getItem("blogImage"));
    // Fetch user name from Firebase Auth
    const auth = getAuth();
    const user = auth.currentUser;
    setAuthorName(user?.displayName || user?.email || "User");
  }, []);

  if (!publishedBlog) {
    return (
      <Container maxWidth="md" sx={{ textAlign: "center", py: 8 }}>
        <Paper elevation={3} sx={{ p: 5, borderRadius: 3, bgcolor: "#f9fcff" }}>
          <Typography
            variant="h4"
            sx={{ mb: 3, fontWeight: 500, color: "#334155" }}
          >
            No published blog found
          </Typography>
          <Button
            variant="contained"
            sx={{
              mt: 2,
              py: 1.5,
              px: 4,
              borderRadius: 2,
              background: "linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)",
              boxShadow: "0 4px 20px 0 rgba(0,0,0,0.12)",
            }}
            onClick={() => router.push("/")}
            startIcon={<AutoAwesomeIcon />}
          >
            Generate New Blog
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Fade in={fadeIn} timeout={800}>
      <div className="blog-page">
        {/* Navbar with User Icon and Name */}
        <div className="navbar-container">
          <nav className="flex justify-between items-center px-6 py-4 border-b bg-white">
            <div className="text-xl font-bold text-green-700">BLOG FUSION</div>
            <ul className="flex space-x-6">
              <li>
                <Link href="/" className="hover:text-green-600">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-green-600">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blogfeed" className="hover:text-green-600">
                  Blog Feed
                </Link>
              </li>
            </ul>
            <div className="flex items-center space-x-4">
              <FaUserCircle className="text-gray-500 w-8 h-8" />
              <span className="text-gray-500">{authorName}</span>
            </div>
          </nav>
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
            {coverImage && (
              <img
                src={coverImage}
                alt="Blog Cover"
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
                {authorName ? authorName[0] : 'U'}
              </div>
              <span style={{ fontWeight: 600, color: '#16a34a', fontSize: 18 }}>{authorName}</span>
              <span className="blog-date" style={{ color: '#64748b', fontSize: 15, marginLeft: 12 }}>
                {blogMetadata.publishDate} &nbsp;•&nbsp; {blogMetadata.readTime}
              </span>
            </div>
            <h1 className="blog-title" style={{ fontSize: 38, fontWeight: 800, color: '#22223b', marginBottom: 24, marginTop: 0 }}>
              {blogTitle || "Untitled Blog"}
            </h1>
            <div
              className="blog-content"
              style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "#374151", marginTop: 24 }}
              dangerouslySetInnerHTML={{ __html: publishedBlog || "" }}
            />
          </div>
        </div>
        {/* Footer Section */}
        <footer className="footer bg-white border-t mt-12">
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">
              &copy; 2025 Blog Fusion. All Rights Reserved.
            </p>
            <div className="flex justify-center space-x-4 mt-4">
              <Link href="#" className="hover:text-green-600 text-gray-600">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-green-600 text-gray-600">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-green-600 text-gray-600">
                Contact Us
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </Fade>
  );
};

export default PublishedBlog;
