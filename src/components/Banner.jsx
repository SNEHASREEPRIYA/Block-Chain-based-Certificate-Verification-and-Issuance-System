import React from "react";
import { useLocation } from "react-router-dom";

const Banner = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Only render banner on homepage
  if (!isHome) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <div style={styles.iconContainer}>
          <img src="/certificate-check.png" alt="Certificate" style={styles.icon} />
        </div>
        <h1 style={styles.heading}>
          Blockchain<br />-Based Certificate Verification System
        </h1>
      </div>
    </div>
  );
};

const styles = {
  banner: {
    background: "linear-gradient(135deg, #2196f3, #64b5f6)",
    padding: "4rem 2rem",
    textAlign: "center",
    minHeight: "100px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  iconContainer: {
    marginBottom: "2rem",
  },
  icon: {
    width: "120px",
    height: "120px",
  },
};

export default Banner;
