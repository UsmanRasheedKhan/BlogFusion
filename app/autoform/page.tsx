// FormPage.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Card,
  CardContent,
  Container,
  Fade
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PublicIcon from '@mui/icons-material/Public';
import PeopleIcon from '@mui/icons-material/People';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { generateBlog } from '../api/lib/api';

interface FormData {
  topic: string;
  country: string;
  audience: string;
  keywords: string;
  urls: string;
}

const FormPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    topic: '',
    country: '',
    audience: '',
    keywords: '',
    urls: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const router = useRouter();

  const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'India', 'China', 'Japan', 'Pakistan'];

  useEffect(() => {
    const storedKeywords = JSON.parse(sessionStorage.getItem('keywordsArray') || '[]');
    const storedUrls = JSON.parse(sessionStorage.getItem('urlsArray') || '[]');
    setKeywords(storedKeywords);
    setUrls(storedUrls);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await generateBlog({
        ...formData,
        title: formData.topic
      });
      // Store the generated blog in sessionStorage
      sessionStorage.setItem('generatedBlog', response.blog);

      // Store keywords and urls as arrays in sessionStorage
      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
      const urlsArray = formData.urls.split(',').map(u => u.trim()).filter(Boolean);
      sessionStorage.setItem('keywordsArray', JSON.stringify(keywordsArray));
      sessionStorage.setItem('urlsArray', JSON.stringify(urlsArray));

      // Redirect to blogeditor page
      router.push('/blogeditor');
    } catch (err: any) {
      const errorMessage = err.message.includes('timeout')
        ? 'Generation is taking longer than expected. Please try again.'
        : err.message;

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.topic &&
      formData.country &&
      formData.audience &&
      formData.keywords &&
      formData.urls
    );
  };

  return (
    <Container maxWidth="md">
      <Fade in={true} timeout={1000}>
        <Paper
          elevation={4}
          sx={{
            mt: 6,
            mb: 6,
            borderRadius: 4,
            overflow: 'hidden',
            background: 'linear-gradient(to right bottom, #ffffff, #f9fcff)',
          }}
        >
          {/* Form Content */}
          <Box component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight="bold" mb={3}>
              Generate a Blog
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Topic"
                  value={formData.topic}
                  onChange={e => setFormData({ ...formData, topic: e.target.value })}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <EditNoteIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Country</InputLabel>
                  <Select
                    value={formData.country}
                    label="Country"
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                  >
                    {countries.map(country => (
                      <MenuItem key={country} value={country}>{country}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Audience"
                  value={formData.audience}
                  onChange={e => setFormData({ ...formData, audience: e.target.value })}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <PeopleIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Keywords (comma separated)"
                  value={formData.keywords}
                  onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="URLs (comma separated)"
                  value={formData.urls}
                  onChange={e => setFormData({ ...formData, urls: e.target.value })}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
            </Grid>
            {error && (
              <Typography color="error" mt={2}>{error}</Typography>
            )}
            <Box mt={4} display="flex" alignItems="center">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<AutoAwesomeIcon />}
                disabled={!isFormValid() || loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Blog'}
              </Button>
            </Box>
            <div style={{ margin: '16px 0' }}>
              <strong>Keywords:</strong>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keywords.map((keyword, idx) => (
                  <li key={keyword}>
                    <a
                      href={urls[idx] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: 'none',
                        color: '#1976d2',
                        border: '1px solid #1976d2',
                        borderRadius: '16px',
                        padding: '4px 12px',
                        fontSize: '0.95em'
                      }}
                    >
                      {keyword}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

export default FormPage;
