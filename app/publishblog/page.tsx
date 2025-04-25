"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Chip,
  IconButton,
  Avatar,
  Card,
  Fade,
  ButtonGroup,
  Tooltip,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ShareIcon from "@mui/icons-material/Share";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import PrintIcon from "@mui/icons-material/Print";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

const PublishedBlog: React.FC = () => {
  const router = useRouter();
  const [fadeIn, setFadeIn] = useState(false);
  const [publishedBlog, setPublishedBlog] = useState<string | null>(null);

  const blogMetadata = {
    publishDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    readTime: "5 min read",
    author: "AI Assistant",
    avatar: "https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff",
  };

  useEffect(() => {
    setFadeIn(true);
    const blogFromSession = sessionStorage.getItem("publishedBlog");
    setPublishedBlog(blogFromSession);
  }, []);

  // Example: In your blog editor page
  const handlePublish = () => {
    // Replace `formattedBlogHtml` with your actual blog HTML string variable
    const formattedBlogHtml = "<h1>Sample Blog Title</h1><p>This is a sample blog post content.</p>"; // Example HTML string
    sessionStorage.setItem("publishedBlog", formattedBlogHtml);
    router.push("/publishblog");
  };

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
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
          {/* Blog Metadata */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <img
              src={blogMetadata.avatar}
              alt="Author"
              style={{ width: 48, height: 48, borderRadius: '50%', marginRight: 16 }}
            />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {blogMetadata.author}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {blogMetadata.publishDate} &nbsp;•&nbsp; {blogMetadata.readTime}
              </Typography>
            </Box>
          </Box>
          {/* Blog Content */}
          <Box
            sx={{
              mt: 3,
              '& h1': { fontSize: '2.2rem', fontWeight: 700, mb: 2 },
              '& h2': { fontSize: '1.6rem', fontWeight: 600, mb: 2 },
              '& h3': { fontSize: '1.3rem', fontWeight: 500, mb: 1.5 },
              '& p': { fontSize: '1.1rem', lineHeight: 1.8, mb: 2.5, color: '#4b5563' },
              '& a': {
                color: '#2563eb',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(37, 99, 235, 0.3)',
                '&:hover': { color: '#1e40af', borderBottomColor: '#1e40af' }
              },
              '& ul, & ol': { pl: 4, mb: 3 },
              '& strong': { fontWeight: 600, color: '#334155' },
              '& em': { fontStyle: 'italic' },
              '& .references-section': {
                mt: 6,
                pt: 3,
                borderTop: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                color: '#64748b'
              },
              '& blockquote': {
                borderLeft: '4px solid #e5e7eb',
                pl: 3,
                py: 1,
                my: 3,
                color: '#64748b',
                fontStyle: 'italic'
              }
            }}
            dangerouslySetInnerHTML={{ __html: publishedBlog || '' }}
          />
          <Button
            sx={{ mt: 4 }}
            variant="contained"
            onClick={() => router.push('/')}
          >
            Generate New Blog
          </Button>
        </Paper>
      </Container>
    </Fade>
  );
};

export default PublishedBlog;
