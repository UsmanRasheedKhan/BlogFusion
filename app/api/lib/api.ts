// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface GenerateBlogInput {
  title: string;
  keywords: string;
  urls: string;
}

interface GenerateBlogOutput {
  blog: string;
  keywords: string[];
  urls: string[];
}

// Assuming you're using Axios for API calls

export const generateBlog = async (data: GenerateBlogInput): Promise<GenerateBlogOutput> => {
    try {
      // Making the API request
      const response = await api.post('/api/generate-blog', data);
  
      // Ensure that the response contains the blog content
      if (!response.data?.blog) {
        throw new Error('Server returned empty blog content');
      }
  
      // Return the processed data
      return {
        blog: response.data.blog,
        keywords: data.keywords.split(',').map((k) => k.trim()),
        urls: data.urls.split(',').map((u) => u.trim()),
      };
    } catch (error: any) {
      // Define a default error message
      let message = 'An unexpected error occurred';
  
      // Check if error.response exists and extract the message from there
      if (error.response) {
        message = error.response.data?.error || error.message;
      } else if (error.message) {
        message = error.message; // Use the generic message if no response or error
      }
  
      // Log the error message to the console
      console.error('API Error:', message);
  
      // Throw the error again so that the caller can handle it
      throw new Error(message);
    }
  };
  