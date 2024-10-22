import { create } from "zustand";
import axios from "../lib/axios";
import toast from "react-hot-toast";

export const useUserStore = create((set) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  signup: async ({ name, email, password, confirmPassword }) => {
    set({ loading: true });

    if (password !== confirmPassword) {
      set({ loading: false });
      return toast.error("Passwords do not match");
    }

    try {
      const res = await axios.post("/auth/signup", {
        name,
        email,
        password,
      });
      set({ user: res.data.user, loading: false });
      toast.success("Signup successful");
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },
  login: async ({ email, password }) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.token; // Assuming the token is returned as res.data.token
      localStorage.setItem("token", token); // Store token in localStorage

      set({ user: res.data, loading: false });
      toast.success("Login successful");
      console.log("User after login:", res.data); // Debug log
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
      set({ user: null });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "An error occurred during logout"
      );
    }
  },
  checkAuth: async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      set({ checkingAuth: false, user: null });
      return;
    }

    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }, // Include token in header
      });

      set({ user: response.data.user, checkingAuth: false }); // Set user data properly
    } catch (error) {
      console.log(error.message);
      localStorage.removeItem("token"); // Remove invalid/expired token
      set({ checkingAuth: false, user: null });
    }
  },
  refreshToken: async () => {
    // Prevent multiple simultaneous refresh attempts
    if (get().checkingAuth) return;

    set({ checkingAuth: true });
    try {
      const response = await axios.post("/auth/refresh-token");
      set({ checkingAuth: false });
      return response.data;
    } catch (error) {
      set({ user: null, checkingAuth: false });
      throw error;
    }
  },
}));
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If a refresh is already in progress, wait for it to complete
        if (refreshPromise) {
          await refreshPromise;
          return axios(originalRequest);
        }

        // Start a new refresh process
        refreshPromise = useUserStore.getState().refreshToken();
        await refreshPromise;
        refreshPromise = null;

        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login or handle as needed
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
