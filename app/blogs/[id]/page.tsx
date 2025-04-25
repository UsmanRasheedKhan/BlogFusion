"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  Container,
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  TextField,
  Avatar,
  Divider,
  Tooltip,
  Fade,
  Chip,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  ButtonBase,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Comment as CommentIcon,
  Share as ShareIcon,
  BookmarkBorder,
  Bookmark,
  AccountCircle,
  ExitToApp,
  Settings,
  Bookmark as BookmarkIcon,
  Home as HomeIcon,
} from "@mui/icons-material";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
  userId: string;
  likes: string[];
  saves: string[];
  comments: {
    id: string;
    userId: string;
    text: string;
    createdAt: any;
    userDisplayName: string;
  }[];
}

const Navbar = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.05)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <ButtonBase
          onClick={() => router.push("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderRadius: 2,
            padding: "8px 16px",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
          }}
        >
          <HomeIcon sx={{ color: "#2e9e6b" }} />
          <Typography
            variant={isMobile ? "body1" : "h6"}
            sx={{
              fontWeight: 600,
              background: "linear-gradient(45deg, #1a6f4c, #2e9e6b)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            BlogFusion
          </Typography>
        </ButtonBase>

        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body1"
              sx={{
                color: "#1a6f4c",
                display: { xs: "none", sm: "block" },
              }}
            >
              {user.displayName || user.email}
            </Typography>
            <IconButton
              onClick={handleMenu}
              sx={{
                border: "2px solid #2e9e6b",
                padding: "4px",
                "&:hover": { backgroundColor: "rgba(46, 158, 107, 0.08)" },
              }}
            >
              <Avatar
                src={user.photoURL}
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: user.photoURL ? "transparent" : "#2e9e6b",
                }}
              >
                {user.displayName?.[0] || user.email?.[0]}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  borderRadius: 2,
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(10px)",
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  handleClose();
                  router.push("/profile");
                }}
                sx={{ gap: 2 }}
              >
                <AccountCircle fontSize="small" sx={{ color: "#2e9e6b" }} />
                <Typography>Profile</Typography>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleClose();
                  router.push("/saved-blogs");
                }}
                sx={{ gap: 2 }}
              >
                <BookmarkIcon fontSize="small" sx={{ color: "#2e9e6b" }} />
                <Typography>Saved Blogs</Typography>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleClose();
                  router.push("/settings");
                }}
                sx={{ gap: 2 }}
              >
                <Settings fontSize="small" sx={{ color: "#2e9e6b" }} />
                <Typography>Settings</Typography>
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem
                onClick={() => {
                  handleClose();
                  onLogout();
                }}
                sx={{ gap: 2, color: "#d32f2f" }}
              >
                <ExitToApp fontSize="small" />
                <Typography>Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const fetchBlog = async () => {
      if (params.id) {
        try {
          const blogRef = doc(db, "blogs", params.id as string);
          const blogDoc = await getDoc(blogRef);
          if (blogDoc.exists()) {
            const blogData = blogDoc.data();
            setBlog({
              ...blogData,
              id: blogDoc.id,
              likes: Array.isArray(blogData.likes) ? blogData.likes : [],
              saves: Array.isArray(blogData.saves) ? blogData.saves : [],
              comments: Array.isArray(blogData.comments) ? blogData.comments : [],
            } as BlogPost);
          }
        } catch (error) {
          console.error("Error fetching blog:", error);
        }
      }
    };
    fetchBlog();
  }, [params.id]);

  const handleLike = async () => {
    if (!user || !blog) return;

    try {
      const blogRef = doc(db, "blogs", blog.id);
      const hasLiked = Array.isArray(blog.likes) && blog.likes.includes(user.uid);

      await updateDoc(blogRef, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      setBlog((prev) => {
        if (!prev) return null;
        const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
        const updatedLikes = hasLiked
          ? currentLikes.filter((id) => id !== user.uid)
          : [...currentLikes, user.uid];
        return { ...prev, likes: updatedLikes };
      });
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleSave = async () => {
    if (!user || !blog) return;

    try {
      const blogRef = doc(db, "blogs", blog.id);
      const hasSaved = blog.saves?.includes(user.uid);

      await updateDoc(blogRef, {
        saves: hasSaved ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      setBlog((prev) => {
        if (!prev) return null;
        const updatedSaves = hasSaved
          ? (prev.saves || []).filter((id) => id !== user.uid)
          : [...(prev.saves || []), user.uid];
        return { ...prev, saves: updatedSaves };
      });
    } catch (error) {
      console.error("Error updating save:", error);
    }
  };

  const handleShare = async () => {
    if (!blog) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: blog.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleComment = async (blogId: string) => {
    if (!user || !commentText.trim()) return;

    try {
      setIsSubmitting(true);
      const blogRef = doc(db, "blogs", blogId);
      const newComment = {
        id: `${Date.now()}`,
        userId: user.uid,
        text: commentText.trim(),
        createdAt: new Date(),
        userDisplayName: user.displayName || "Anonymous",
      };

      await updateDoc(blogRef, {
        comments: arrayUnion(newComment),
      });

      setBlog((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [...(prev.comments || []), newComment],
        };
      });

      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!blog) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">Loading...</Typography>
      </Container>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <Box sx={{ pt: "64px" }}>
        <Fade in={true}>
          <Container
            maxWidth="md"
            sx={{
              py: 8,
              minHeight: "calc(100vh - 64px)",
              background:
                "linear-gradient(180deg, rgba(46, 158, 107, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
            }}
          >
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    background: "linear-gradient(45deg, #1a6f4c, #2e9e6b)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {blog.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {new Date(blog.createdAt?.toDate()).toLocaleDateString()}
                </Typography>
                <Chip
                  label={blog.category}
                  size="small"
                  sx={{
                    bgcolor: "rgba(46, 158, 107, 0.1)",
                    color: "#2e9e6b",
                    fontWeight: 500,
                  }}
                />
              </Box>

              <Box
                sx={{
                  "& img": {
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: 2,
                    my: 2,
                  },
                }}
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  mt: 4,
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Tooltip title={user ? "Like" : "Login to like"}>
                  <IconButton
                    onClick={handleLike}
                    disabled={!user}
                    sx={{
                      "&:hover": {
                        bgcolor: "rgba(244, 67, 54, 0.1)",
                      },
                    }}
                  >
                    {blog.likes?.includes(user?.uid) ? (
                      <Favorite sx={{ color: "#f44336" }} />
                    ) : (
                      <FavoriteBorder />
                    )}
                  </IconButton>
                </Tooltip>
                <Typography variant="body2">{blog.likes?.length || 0} likes</Typography>

                <Tooltip title={user ? "Save" : "Login to save"}>
                  <IconButton
                    onClick={handleSave}
                    disabled={!user}
                    sx={{
                      "&:hover": {
                        bgcolor: "rgba(46, 158, 107, 0.1)",
                      },
                    }}
                  >
                    {blog.saves?.includes(user?.uid) ? (
                      <Bookmark sx={{ color: "#2e9e6b" }} />
                    ) : (
                      <BookmarkBorder />
                    )}
                  </IconButton>
                </Tooltip>

                <IconButton
                  onClick={() => setShowComments(!showComments)}
                  sx={{
                    "&:hover": {
                      bgcolor: "rgba(25, 118, 210, 0.1)",
                    },
                  }}
                >
                  <CommentIcon />
                </IconButton>

                <IconButton
                  onClick={handleShare}
                  sx={{
                    "&:hover": {
                      bgcolor: "rgba(46, 158, 107, 0.1)",
                    },
                  }}
                >
                  <ShareIcon />
                </IconButton>
              </Box>

              <Fade in={showComments}>
                <Box sx={{ mt: 4 }}>
                  <Divider sx={{ mb: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Comments
                  </Typography>

                  {user && (
                    <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "&:hover fieldset": {
                              borderColor: "#2e9e6b",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#2e9e6b",
                            },
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleComment(blog.id)}
                        disabled={isSubmitting || !commentText.trim()}
                        sx={{
                          bgcolor: "#2e9e6b",
                          "&:hover": {
                            bgcolor: "#1a6f4c",
                          },
                        }}
                      >
                        Post
                      </Button>
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    {blog.comments?.map((comment) => (
                      <Paper
                        key={comment.id}
                        sx={{
                          p: 2,
                          mb: 2,
                          bgcolor: "grey.50",
                          border: "1px solid",
                          borderColor: "grey.200",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              mr: 1,
                              bgcolor: "#2e9e6b",
                            }}
                          >
                            {comment.userDisplayName?.[0] ?? "A"}
                          </Avatar>
                          <Typography variant="subtitle2">{comment.userDisplayName}</Typography>
                        </Box>
                        <Typography variant="body2">{comment.text}</Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              </Fade>
            </Paper>
          </Container>
        </Fade>
      </Box>
    </>
  );
}
