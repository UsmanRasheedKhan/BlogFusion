"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoIcon from '@mui/icons-material/Info';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { db, auth } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Swal from 'sweetalert2';

const humanizationSteps = [
  "Analyzing content",
  "Processing language patterns",
  "Applying human writing style",
  "Refining and finalizing"
];

const BlogEditor = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editedBlog, setEditedBlog] = useState('');
  const [suggestedContent, setSuggestedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHumanized, setIsHumanized] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const [aiScoreOriginal, setAiScoreOriginal] = useState(null);
  const [aiScoreHumanized, setAiScoreHumanized] = useState(null);
  const [sourcesChecked, setSourcesChecked] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [blogFetch, setBlogFetch] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [urls, setUrls] = useState<string[]>([]);

  // Read from URL params or sessionStorage
  const generatedBlog = searchParams.get('generatedBlog') || '';

  useEffect(() => {
    const storedKeywords = JSON.parse(sessionStorage.getItem('keywordsArray') || '[]');
    const storedUrls = JSON.parse(sessionStorage.getItem('urlsArray') || '[]');
    setKeywords(storedKeywords);
    setUrls(storedUrls);
  }, []);

  useEffect(() => {
    let blog = generatedBlog;
    if (!blog) {
      blog = sessionStorage.getItem('generatedBlog') || '';
    }
    if (blog) {
      setEditedBlog(blog);
    }
    if (blog === '') {
      setBlogFetch(true);
    }
    console.log('keywords:', keywords);
  }, [generatedBlog]);

  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgressStep(prev => {
          if (prev < humanizationSteps.length - 1) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setProgressStep(0);
    }
  }, [isLoading]);

  const handleHumanizeBlog = async () => {
    setIsLoading(true);
    setProgressStep(0);
    try {
      const startTime = Date.now();
      // Replace with your actual API endpoint for humanization
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editedBlog,
          keywords
        })
      });
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 6000) {
        await new Promise(resolve => setTimeout(resolve, 6000 - elapsedTime));
      }
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setAiScoreOriginal(data.ai_detection_original || 85);
        setAiScoreHumanized(data.ai_detection_humanized || 25);
        const formattedHumanizedContent = preserveFormatting(
          editedBlog,
          data.humanized_content || ''
        );
        setSuggestedContent(formattedHumanizedContent);
        setSourcesChecked(data.sources_checked || 3);
        setActiveTab(1);
        setIsHumanized(true);
      } else {
        throw new Error(data.message || 'Humanization failed');
      }
    } catch (error) {
      setCopyStatus(
        `Error: ${
          typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message?: string }).message
            : 'Failed to humanize content'
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const preserveFormatting = (original: string, humanized: string) => {
    const originalLines = original.split('\n');
    const humanizedLines = humanized.split('\n');
    let originalTitle = '';
    for (const line of originalLines) {
      if (line.trim().startsWith('#')) {
        originalTitle = line;
        break;
      }
    }
    let hasTitle = false;
    for (const line of humanizedLines) {
      if (line.trim().startsWith('#')) {
        hasTitle = true;
        break;
      }
    }
    let formattedContent = humanized;
    if (originalTitle && !hasTitle) {
      formattedContent = originalTitle + '\n\n' + formattedContent;
    }
    if (formattedContent.split('\n\n').length < original.split('\n\n').length) {
      const originalParagraphCount = original.split('\n\n').length;
      formattedContent = formattedContent.replace(/([.!?])\s+/g, '$1\n\n');
      const currentBreaks = formattedContent.split('\n\n').length;
      if (currentBreaks > originalParagraphCount * 1.5) {
        formattedContent = formattedContent.split('\n\n')
          .slice(0, originalParagraphCount + 1)
          .join('\n\n') + '\n\n' +
          formattedContent.split('\n\n').slice(originalParagraphCount + 1).join(' ');
      }
    }
    return formattedContent;
  };

  const handleUseHumanizedContent = () => {
    setEditedBlog(suggestedContent);
    setIsHumanized(true);
    setActiveTab(0);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(currentContent);
    setCopyStatus('Content copied to clipboard!');
  };

  const formatBlogContent = (content: string) => {
    return content
      .replace(/^-{3,}/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/#{1,6}\s+(.*)/g, (match, p1) => {
        const level = match.split(' ')[0].length;
        return `<h${level}>${p1}</h${level}>`;
      })
      .replace(/For more information([\s\S]*?)(?=\n|$)/g, (match) => {
        return `<div class="references-section">${match.replace('---', '')}</div>`;
      })
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '')
      .join('');
  };

  const handlePublish = async () => {
    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to publish a blog');
      }

      // Show loading state
      setIsLoading(true);

      let processedContent = currentContent;

      // Embed keywords as hyperlinks
      keywords.forEach((keyword, idx) => {
        if (keyword && urls[idx]) {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          processedContent = processedContent.replace(
            regex,
            `<a href="${urls[idx]}" target="_blank" rel="noopener noreferrer">${keyword}</a>`
          );
        }
      });

      // Format the processed content as HTML
      const formattedBlogHtml = formatBlogContent(processedContent);

      // Save to Firebase
      const blogData = {
        content: formattedBlogHtml,
        rawContent: processedContent,
        userId: user.uid,
        author: user.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        aiScore: currentScore,
        isHumanized: activeTab === 1,
        keywords: keywords,
        urls: urls,
        status: 'published'
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, "blogs"), blogData);

      // Store the blog ID for reference
      sessionStorage.setItem("publishedBlogId", docRef.id);
      sessionStorage.setItem("publishedBlog", formattedBlogHtml);

      // Show success message
      await Swal.fire({
        title: 'Success!',
        text: 'Your blog has been published successfully',
        icon: 'success',
        confirmButtonColor: '#22c55e'
      });

      // Redirect to the published blog
      router.push("/publishblog");

    } catch (error) {
      console.error('Publish error:', error);
      
      // Show error message
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to publish blog',
        icon: 'error',
        confirmButtonColor: '#22c55e'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentContent = activeTab === 0 ? editedBlog : suggestedContent;
  const currentScore = activeTab === 0 ? aiScoreOriginal : aiScoreHumanized;

  if (blogFetch) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5">No blog content found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/')}>Go Back</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', mt: 4, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" fontWeight="bold">Blog Editor</Typography>
        <Chip
          label={`AI Detection: ${currentScore !== null ? `${currentScore}%` : '--'}`}
          color={
            (currentScore ?? 0) > 50 ? 'error' :
            (currentScore ?? 0) > 30 ? 'warning' : 'success'
          }
          icon={<SmartToyIcon />}
          sx={{ fontSize: '1rem', p: 2 }}
        />
      </Box>

      {isLoading && (
        <Box sx={{ width: '100%', mb: 3 }}>
          <LinearProgress sx={{ height: 8, borderRadius: 4 }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" fontWeight="medium" color="primary">
              {humanizationSteps[progressStep]}...
            </Typography>
          </Box>
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
            <Tabs value={activeTab} onChange={(e, newVal) => setActiveTab(newVal)} sx={{ mb: 3 }}>
              <Tab label="Original Content" icon={<ContentCopyIcon />} />
              <Tab
                label="Humanized Content"
                icon={<AutoAwesomeMotionIcon />}
                disabled={!suggestedContent}
              />
            </Tabs>

            {activeTab === 0 ? (
              <TextField
                fullWidth
                multiline
                minRows={18}
                value={editedBlog}
                onChange={(e) => setEditedBlog(e.target.value)}
                placeholder="Start editing your generated blog here..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: '1.1rem'
                  }
                }}
              />
            ) : (
              <TextField
                fullWidth
                multiline
                minRows={18}
                value={suggestedContent}
                placeholder="Humanized content will appear here..."
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#f8f9fa',
                    fontSize: '1.1rem'
                  }
                }}
              />
            )}

            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {keywords.map((keyword, idx) => (
                <Chip
                  key={keyword}
                  label={
                    <a
                      href={urls[idx] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {keyword}
                    </a>
                  }
                  variant="outlined"
                  clickable
                  sx={{ fontWeight: 500 }}
                />
              ))}
            </Box>

            {aiScoreOriginal !== null && (
              <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
                <Chip
                  label={`Original AI Detection: ${aiScoreOriginal}%`}
                  color={aiScoreOriginal > 50 ? 'error' : 'success'}
                  variant="outlined"
                />
                <Chip
                  label={`Humanized AI Detection: ${aiScoreHumanized}%`}
                  color={(aiScoreHumanized ?? 0) > 50 ? 'warning' : 'success'}
                  variant="outlined"
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleHumanizeBlog}
                disabled={isLoading}
                startIcon={
                  isLoading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    <AutoAwesomeMotionIcon />
                  )
                }
                sx={{ px: 4, py: 1.5 }}
              >
                {isLoading ? 'Processing...' : 'Humanize Blog'}
              </Button>

              {suggestedContent && activeTab === 1 && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleUseHumanizedContent}
                  startIcon={<CheckCircleOutlineIcon />}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Use Humanized Content
                </Button>
              )}

              <Tooltip title="Copy to clipboard">
                <IconButton onClick={handleCopyContent} sx={{ ml: 'auto' }}>
                  <ContentCopyIcon color="action" />
                </IconButton>
              </Tooltip>
            </Box>

            {copyStatus && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {copyStatus}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: '#f8f9fa' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
              Content Analysis
            </Typography>

            <List dense sx={{ '& .MuiListItem-root': { px: 0 } }}>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={currentScore || 0}
                      color={
                        (currentScore ?? 0) > 70 ? 'error' :
                        (currentScore ?? 0) > 40 ? 'warning' : 'success'
                      }
                      size={40}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div">
                        {currentScore ? `${Math.round(currentScore)}%` : '--'}
                      </Typography>
                    </Box>
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={activeTab === 0 ? "AI Detection Risk" : "Humanized Score"}
                  secondary="Lower percentage indicates more human-like content"
                  sx={{ ml: 2 }}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {isHumanized && activeTab === 1 ? (
                    <CheckCircleOutlineIcon color="success" fontSize="medium" />
                  ) : (
                    <CancelOutlinedIcon color={activeTab === 0 ? "error" : "warning"} fontSize="medium" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Humanization"
                  secondary={
                    isHumanized && activeTab === 1
                      ? "Viewing AI-enhanced content"
                      : activeTab === 0
                        ? "Original content"
                        : "Content ready for use"
                  }
                  sx={{ ml: 2 }}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <InfoIcon color="info" fontSize="medium" />
                </ListItemIcon>
                <ListItemText
                  primary="SEO Optimization"
                  secondary={`${keywords.length || 0} keywords integrated`}
                  sx={{ ml: 2 }}
                />
              </ListItem>
            </List>

            {currentScore !== null && currentScore > 60 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>AI Detection Alert</AlertTitle>
                This content may be detected as AI-generated. Consider using the humanized version.
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handlePublish}
              sx={{ mt: 3, py: 1.5, fontWeight: 'bold' }}
            >
              {activeTab === 0 ? "Publish Original Blog" : "Publish Humanized Blog"}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BlogEditor;
