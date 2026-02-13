"use client";

import { useState } from "react";

type CounterProps = {
  initialCount?: number;
};

export default function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <p aria-live="polite">Count: {count}</p>
      <button type="button" onClick={() => setCount((current) => current + 1)}>
        Increment
      </button>
    </div>
  );
}
