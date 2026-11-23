import type { CSSProperties } from "react";

type Snowflake = {
  left: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
};

const SNOWFLAKES: Snowflake[] = [
  { left: "2%", size: 13, delay: "-4s", duration: "24s", opacity: 0.34 },
  { left: "7%", size: 10, delay: "-15s", duration: "29s", opacity: 0.24 },
  { left: "12%", size: 17, delay: "-8s", duration: "21s", opacity: 0.38 },
  { left: "18%", size: 11, delay: "-19s", duration: "27s", opacity: 0.22 },
  { left: "24%", size: 15, delay: "-2s", duration: "23s", opacity: 0.32 },
  { left: "30%", size: 9, delay: "-12s", duration: "30s", opacity: 0.2 },
  { left: "36%", size: 16, delay: "-17s", duration: "25s", opacity: 0.36 },
  { left: "42%", size: 10, delay: "-6s", duration: "28s", opacity: 0.24 },
  { left: "48%", size: 14, delay: "-21s", duration: "22s", opacity: 0.3 },
  { left: "54%", size: 9, delay: "-10s", duration: "31s", opacity: 0.2 },
  { left: "60%", size: 16, delay: "-3s", duration: "24s", opacity: 0.35 },
  { left: "66%", size: 11, delay: "-14s", duration: "27s", opacity: 0.23 },
  { left: "72%", size: 18, delay: "-9s", duration: "20s", opacity: 0.38 },
  { left: "78%", size: 10, delay: "-18s", duration: "29s", opacity: 0.22 },
  { left: "84%", size: 14, delay: "-5s", duration: "23s", opacity: 0.31 },
  { left: "90%", size: 9, delay: "-13s", duration: "30s", opacity: 0.19 },
  { left: "95%", size: 15, delay: "-20s", duration: "25s", opacity: 0.33 },
  { left: "98%", size: 10, delay: "-7s", duration: "28s", opacity: 0.22 },
];

export default function ChristmasAtmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {SNOWFLAKES.map((flake, index) => {
        const style: CSSProperties = {
          left: flake.left,
          fontSize: flake.size,
          animationDelay: flake.delay,
          animationDuration: flake.duration,
          opacity: flake.opacity,
        };

        return (
          <span key={index} className="christmas-snowflake" style={style}>
            ❄
          </span>
        );
      })}
    </div>
  );
}
