import { useEffect, useState } from "react";
import type { DetectedItem, MenuItem, UserProfile } from "../types";
import DetailView from "./DetailView";

// Slide-up bottom sheet hosting the dish detail. Mounts, then animates in on the
// next frame; on close it animates out before the parent unmounts it.
export default function DetailSheet({
  item,
  profile,
  onClose,
  onSaveOrder,
  onListen,
}: {
  item: DetectedItem;
  profile: UserProfile;
  onClose: () => void;
  onSaveOrder: (menu: MenuItem, qty: number) => void;
  onListen: (menu: MenuItem, qty: number) => void;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const close = () => {
    setOn(false);
    setTimeout(onClose, 300);
  };

  return (
    <>
      <div className={`scrim ${on ? "on" : ""}`} onClick={close} />
      <div className={`sheet ${on ? "on" : ""}`} role="dialog" aria-modal="true">
        <div className="handle" />
        <div className="sbody">
          <DetailView
            item={item}
            profile={profile}
            onSaveOrder={onSaveOrder}
            onListen={onListen}
          />
        </div>
      </div>
    </>
  );
}
