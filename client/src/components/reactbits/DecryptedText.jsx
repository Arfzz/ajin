import { useState, useEffect } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const DecryptedText = ({
  text = "",
  speed = 30,
  maxIterations = 8,
  className = "",
  animateOnMount = true,
}) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!text) {
      setDisplayText("");
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " " || index < iteration / 2) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      iteration += 1;
      if (iteration >= maxIterations * 2) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations]);

  return <span className={className}>{displayText}</span>;
};
