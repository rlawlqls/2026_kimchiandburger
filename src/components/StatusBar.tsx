import { useEffect, useState } from "react";

// iOS-style status row (mockup chrome). Clock ticks every minute.
export default function StatusBar() {
  const [clock, setClock] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setClock(fmt()), 20000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="statusbar">
      <span className="mono">{clock}</span>
      <span aria-hidden>▮▮▮ ᯤ ▮</span>
    </div>
  );
}

function fmt() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
